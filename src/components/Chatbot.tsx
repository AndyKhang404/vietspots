import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, X, MapPin, Loader2, Phone, Globe, Navigation, Star,
  ChevronUp, ChevronDown, MessageSquare, FileText, Bookmark,
  Map as MapIcon, Clock, MapPinned, Filter, LocateFixed, Percent,
  Plus, History, Trash2, Mic, Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useChatConversations } from "@/hooks/useChatConversations";
import { fallbackPlaces, categories } from "@/data/places";
import vietSpotAPI, { PlaceInfo } from "@/api/vietspot";
import ChatbotMap from "./ChatbotMap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  createdAt?: string;
}

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating: number;
  gps?: string;
  images: string[];
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  totalComments?: number;
  matchingScore?: number;
  distance?: number;
  category?: string;
  description?: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

const VIETSPOT_CHAT_URL = "https://vietspotbackend-production.up.railway.app/api/chat";
const VIETSPOT_STREAM_URL = "https://vietspotbackend-production.up.railway.app/api/chat/stream";

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format distance for display
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

// Format opening hours from JSON string to readable format
function formatOpeningHours(hours: string, lang?: string, t?: any): string {
  try {
    // Check if it's a JSON-like string
    if (hours.startsWith('{') || hours.startsWith("{'")) {
      // Parse the JSON-like string (Python dict format with single quotes)
      const cleaned = hours.replace(/'/g, '"');
      const parsed = JSON.parse(cleaned);

      // Prefer both English and Vietnamese day names when checking keys
      const enDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const viDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const idx = new Date().getDay();
      const candidates = [enDays[idx], viDays[idx]];

      for (const name of candidates) {
        if (parsed[name]) {
          const todayLabel = t ? (t('place.opening_today') || (lang && lang.startsWith('vi') ? 'Hôm nay' : 'Today')) : (lang && lang.startsWith('vi') ? 'Hôm nay' : 'Today');
          return `${todayLabel}: ${parsed[name]}`;
        }
      }

      // Fallback: show first available time
      const firstKey = Object.keys(parsed)[0];
      if (firstKey) {
        return `${firstKey}: ${parsed[firstKey]}`;
      }
    }
    return hours;
  } catch {
    // If parsing fails, return original string cleaned up
    return hours.replace(/[{}']/g, '').replace(/,/g, ', ');
  }
}

// Parse markdown bold (**text**) to JSX
function parseMarkdownBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={index} className="font-bold">{boldText}</strong>;
    }
    return part;
  });
}

// Transform API PlaceInfo to PlaceResult format with distance
function transformToPlaceResult(place: PlaceInfo, userLocation?: UserLocation): PlaceResult {
  let distance: number | undefined;
  // Prefer server-provided distance if present (API may return distance_km)
  if ((place as any).distance_km !== undefined && (place as any).distance_km !== null) {
    const v = Number((place as any).distance_km);
    if (!isNaN(v)) distance = v;
  }

  // Helper: try parse coordinates from various GPS string formats
  const parseCoordsFromString = (s: any): { lat?: number; lon?: number } => {
    try {
      if (!s || typeof s !== 'string') return {};
      const str = s.trim();
      // WKT POINT(lon lat) or POINT(lat lon)
      const wktMatch = str.match(/POINT\s*\(([-+0-9.eE]+)\s+([-+0-9.eE]+)\)/i);
      if (wktMatch) {
        const a = Number(wktMatch[1]);
        const b = Number(wktMatch[2]);
        // Heuristic: if lat in range [-90,90] it's lat, otherwise swap
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
        return { lat: b, lon: a };
      }

      // comma separated: "lat, lon" or "lon, lat"
      if (str.includes(',')) {
        const parts = str.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const a = Number(parts[0]);
          const b = Number(parts[1]);
          if (!isNaN(a) && !isNaN(b)) {
            // heuristic: if first number in [-90,90] treat as lat
            if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
            return { lat: b, lon: a };
          }
        }
      }

      // space separated: "lat lon" or "lon lat"
      const spaceParts = str.split(/\s+/).map(p => p.trim()).filter(Boolean);
      if (spaceParts.length >= 2) {
        const a = Number(spaceParts[0]);
        const b = Number(spaceParts[1]);
        if (!isNaN(a) && !isNaN(b)) {
          if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
          return { lat: b, lon: a };
        }
      }
    } catch { }
    return {};
  };

  // Resolve images array
  const images = place.images?.map((img: { url: string } | string) => typeof img === 'string' ? img : img.url) || (place.image_url ? [place.image_url] : []);

  // Try to compute lat/lon from multiple possible shapes
  let lat: number | undefined = undefined;
  let lon: number | undefined = undefined;

  const toNumber = (v: any): number | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'number') return isNaN(v) ? undefined : v;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s === '') return undefined;
      const n = Number(s);
      return !isNaN(n) ? n : undefined;
    }
    return undefined;
  };

  // Prefer explicit latitude/longitude fields (even if they are strings)
  const latCandidate = toNumber((place as any).latitude ?? (place as any).lat ?? (place as any).latitud);
  const lonCandidate = toNumber((place as any).longitude ?? (place as any).lon ?? (place as any).longitud);
  if (latCandidate !== undefined && lonCandidate !== undefined) {
    lat = latCandidate;
    lon = lonCandidate;
  } else if (place.coordinates && typeof place.coordinates === 'object') {
    const c: any = place.coordinates;
    const latC = toNumber(c.lat ?? c.latitude);
    const lonC = toNumber(c.lon ?? c.longitude);
    if (latC !== undefined && lonC !== undefined) {
      lat = latC;
      lon = lonC;
    }
  }

  if ((lat === undefined || lon === undefined) && (place as any).gps) {
    const parsed = parseCoordsFromString((place as any).gps);
    if (parsed.lat !== undefined && parsed.lon !== undefined) {
      lat = parsed.lat;
      lon = parsed.lon;
    }
  }

  // As a last resort, try parsing coordinates from address-like fields (rare)
  if ((lat === undefined || lon === undefined) && typeof place.address === 'string') {
    const parsed = parseCoordsFromString(place.address);
    if (parsed.lat !== undefined && parsed.lon !== undefined) {
      lat = parsed.lat;
      lon = parsed.lon;
    }
  }

  // Validate numbers
  if (typeof lat === 'number' && isNaN(lat)) lat = undefined;
  if (typeof lon === 'number' && isNaN(lon)) lon = undefined;

  // Compute distance if we have a user location and parsed coordinates
  if (userLocation && typeof lat === 'number' && typeof lon === 'number') {
    distance = calculateDistance(userLocation.latitude, userLocation.longitude, lat, lon);
  }

  return {
    id: place.place_id || place.id,
    name: place.name,
    address: place.address || `${place.city || ""}, Vietnam`,
    phone: place.phone,
    website: place.website,
    rating: place.rating || 0,
    images,
    gps: (place.latitude && place.longitude) ? `${place.latitude}, ${place.longitude}` : ((place as any).gps || undefined),
    latitude: lat,
    longitude: lon,
    openingHours: typeof place.opening_hours === 'string' ? place.opening_hours : (place.opening_hours ? JSON.stringify(place.opening_hours) : undefined),
    totalComments: place.total_comments || place.rating_count,
    matchingScore: Math.floor(Math.random() * 30 + 70),
    distance,
    category: place.category,
    description: place.description,
  };
}

// Remove duplicate place results (by id or gps) while preserving order
function dedupePlaceResults(results: PlaceResult[]): PlaceResult[] {
  const seenIds = new Set<string>();
  const seenGps = new Set<string>();
  const out: PlaceResult[] = [];
  for (const p of results) {
    const id = p.id || '';
    const gpsKey = (p.gps && p.gps.trim()) || ((p.latitude !== undefined && p.longitude !== undefined) ? `${p.latitude},${p.longitude}` : '');
    if (id) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    } else if (gpsKey) {
      if (seenGps.has(gpsKey)) continue;
      seenGps.add(gpsKey);
    }
    out.push(p);
  }
  return out;
}

const CHAT_STORAGE_KEY = "vietspots_chat_history";

export default function Chatbot() {
  const { t, i18n } = useTranslation();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const {
    conversations,
    currentConversationId,
    messages,
    setMessages,
    placeResults,
    setPlaceResults,
    startNewConversation,
    loadConversation,
    deleteConversation,
  } = useChatConversations();
  const navigate = useNavigate();
  const location = useLocation();

  // Track which assistant message ID produced the current `placeResults` so we can
  // render the chat messages before that assistant message, then the place cards,
  // then the remaining messages (so new user messages appear after the place cards).
  const [lastPlaceMessageId, setLastPlaceMessageId] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "form" | "saved" | "history">("chat");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGps, setSelectedGps] = useState<string | null>(null);
  // Scroll buttons removed for web (native scroll available)
  const [showMap, setShowMap] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [routeToPlaceId, setRouteToPlaceId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentConversation = conversations.find(c => c.id === currentConversationId) || null;

  // Speech / STT / TTS state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [sttLoading, setSttLoading] = useState(false);
  // Default to Vietnamese by requirement; English remains optional
  const [ttsLanguage, setTtsLanguage] = useState<string>('vi-VN');
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentUtterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('vietspots_tts_voice');
      if (stored) return stored;
    } catch { }
    // Default to backend Vietnamese to guarantee accurate Vietnamese speech
    return '__backend_vi';
  });
  // Default to backend TTS for better quality
  const [preferBackendTts, setPreferBackendTts] = useState<boolean>(() => {
    const v = localStorage.getItem('vietspots_prefer_backend_tts');
    // Default true if not set (for better quality)
    return v === null || v === '1' || v === 'true';
  });
  // TTS tuning controls (rate/pitch/volume)
  const [ttsRate, setTtsRate] = useState<number>(() => Number(localStorage.getItem('vietspots_tts_rate')) || 1);
  const [ttsPitch, setTtsPitch] = useState<number>(() => Number(localStorage.getItem('vietspots_tts_pitch')) || 1);
  const [ttsVolume, setTtsVolume] = useState<number>(() => Number(localStorage.getItem('vietspots_tts_volume')) || 1);

  // Filters
  // Filter UI removed — keep placeholders only if needed later
  // (category/minRating/maxDistance removed per user request)
  // When true, ignore the distance filter for chat-suggested places so
  // users can see them on the map even if they're beyond `maxDistance`.
  // Enabled by default so chat suggestions are visible immediately.
  const [ignoreDistanceFilterForChat, setIgnoreDistanceFilterForChat] = useState<boolean>(true);

  // Form state
  const [formCategory, setFormCategory] = useState<string[]>([]);
  const [formRating, setFormRating] = useState<number>(4);
  const [formLimit, setFormLimit] = useState<string>("10");

  // Get user's location
  const getUserLocation = useCallback(() => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success(t('messages.got_your_location'));
          // ensure map is visible when we obtain location
          try { setShowMap(true); } catch { }
          try {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.debug('Chatbot got userLocation:', position.coords.latitude, position.coords.longitude);
            }
          } catch { }
          // No client-side distance filter in chat mode — nothing to relax here
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error(t('messages.location_permission_required'));
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toast.error(t('messages.browser_no_geolocation'));
      setIsGettingLocation(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (selectedVoiceName) localStorage.setItem('vietspots_tts_voice', selectedVoiceName);
      else localStorage.removeItem('vietspots_tts_voice');
      localStorage.setItem('vietspots_prefer_backend_tts', preferBackendTts ? '1' : '0');
      localStorage.setItem('vietspots_tts_rate', String(ttsRate));
      localStorage.setItem('vietspots_tts_pitch', String(ttsPitch));
      localStorage.setItem('vietspots_tts_volume', String(ttsVolume));
    } catch { }
  }, [selectedVoiceName, preferBackendTts, ttsRate, ttsPitch, ttsVolume]);

  const checkScrollPosition = useCallback(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // no-op: scroll buttons removed
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el) {
      el.scrollTop = el.scrollHeight;
      setTimeout(checkScrollPosition, 100);
    }
  }, [messages, placeResults, checkScrollPosition]);

  // Load available SpeechSynthesis voices and keep selection in localStorage
  useEffect(() => {
    try {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices() || [];
        setAvailableVoices(voices);

        // If user has a stored preference, keep it when possible. Otherwise choose sensible default.
        let stored: string | null = null;
        try { stored = localStorage.getItem('vietspots_tts_voice'); } catch { }

        if (stored) {
          // If stored is a browser voice but not present, try to pick a matching language voice
          if (!stored.startsWith('__backend') && !voices.some(v => v.name === stored)) {
            const pref = voices.find(v => v.lang && v.lang.startsWith(ttsLanguage.split('-')[0]));
            if (pref) setSelectedVoiceName(pref.name);
            else setSelectedVoiceName(null);
          } else {
            // stored is available (either backend id or browser voice)
            setSelectedVoiceName(stored);
          }
          return;
        }

        // No stored preference -> default behavior
        if (preferBackendTts && ttsLanguage && ttsLanguage.startsWith('vi')) {
          setSelectedVoiceName('__backend_vi');
          return;
        }

        // Prefer browser voice that matches language
        const pref = voices.find(v => v.lang && v.lang.startsWith(ttsLanguage.split('-')[0]));
        if (pref) setSelectedVoiceName(pref.name);
        else if (voices.length > 0) setSelectedVoiceName(voices[0].name);
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsLanguage, preferBackendTts]);

  // Reduce available voice choices shown to user to a concise list
  const filteredVoices = (() => {
    try {
      const langPref = (ttsLanguage || 'en-US').split('-')[0];
      const voices = availableVoices || [];
      // Prioritize voices that match language, then take first 6 overall
      const preferred = voices.filter(v => v.lang && v.lang.startsWith(langPref));
      const others = voices.filter(v => !(v.lang && v.lang.startsWith(langPref)));
      const sorted = [...preferred, ...others];
      // Deduplicate by name
      const seen = new Set<string>();
      const unique: SpeechSynthesisVoice[] = [];
      for (const v of sorted) {
        if (!seen.has(v.name)) {
          unique.push(v);
          seen.add(v.name);
        }
        if (unique.length >= 6) break;
      }
      return unique;
    } catch {
      return availableVoices.slice(0, 6);
    }
  })();

  // Start recording audio using MediaRecorder
  const startRecording = async () => {
    // If browser supports Web Speech API, use it for live interim transcripts (better quality)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        // prefer explicit TTS language, otherwise derive from app language
        recognition.lang = ttsLanguage || (i18n.language && i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US');
        recognition.interimResults = true;
        recognition.continuous = true; // Keep listening for better results
        recognition.maxAlternatives = 1;

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript + ' ';
            } else {
              interim += res[0].transcript;
            }
          }
          // Update input with final + interim text
          setInput(finalTranscript + interim);
        };

        recognition.onerror = (e: any) => {
          console.error('Recognition error', e);
          if (e.error !== 'aborted' && e.error !== 'no-speech') {
            toast.error(t('messages.cannot_transcribe'));
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          recognitionRef.current = null;
          // Finalize with just the final transcript
          if (finalTranscript.trim()) {
            setInput(finalTranscript.trim());
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        return;
      } catch (e) {
        console.warn('SpeechRecognition failed, falling back to MediaRecorder', e);
      }
    }

    // Fallback: record audio and send to backend STT when finished
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/webm;codecs=opus';
      const mr = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        // Upload to backend STT endpoint
        try {
          setSttLoading(true);
          const fd = new FormData();
          fd.append('file', blob, 'recording.webm');
          fd.append('language', ttsLanguage || 'vi-VN');
          try {
            const json = await vietSpotAPI.sttTranscribe(fd);
            if (json && json.transcript) {
              setInput((prev) => (prev ? prev + ' ' + json.transcript : json.transcript));
            }
          } catch (e) {
            console.error('STT error', e);
            toast.error(t('messages.cannot_transcribe'));
          }
        } catch (e) {
          console.error('STT upload error', e);
          toast.error(t('messages.cannot_transcribe'));
        } finally {
          setSttLoading(false);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Recording start failed', e);
      toast.error(t('messages.microphone_permission_required'));
    }
  };

  const stopRecording = () => {
    try {
      // If using SpeechRecognition, stop it
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { }
        recognitionRef.current = null;
      }

      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      // stop all tracks
      try {
        mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      } catch { }
      mediaStreamRef.current = null;
    } catch (e) {
      console.error('Stop recording failed', e);
    }
    setIsRecording(false);
  };

  // Call backend TTS or fallback to SpeechSynthesis
  const speakText = async (text: string, language?: string) => {
    if (!text || text.trim().length === 0) return;
    const lang = language || ttsLanguage || (i18n.language && i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US');

    // Toggle: if currently speaking, stop
    if (isSpeaking) {
      try {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
          try { ttsAudioRef.current.currentTime = 0; } catch { }
        }
      } catch { }
      try { window.speechSynthesis.cancel(); } catch { }
      currentUtterRef.current = null;
      setIsSpeaking(false);
      return;
    }

    // If user prefers backend TTS, try backend first but only for explicit backend voices.
    // If the user selected a browser voice while `preferBackendTts` is on, prefer the
    // browser SpeechSynthesis so the selected voice takes effect.
    if (preferBackendTts) {
      try {
        // If selectedVoiceName is set and does not indicate a backend voice, skip backend
        if (selectedVoiceName && !selectedVoiceName.startsWith('__backend')) {
          // Fall through to browser TTS so the user's selected browser voice is used
        } else {
          const backendBody: any = { text, language: lang };
          // Map special backend options to backend voice identifiers
          if (selectedVoiceName === '__backend_vi') {
            backendBody.voice = 'vi-neural';
          } else if (selectedVoiceName && selectedVoiceName.startsWith('__backend_')) {
            backendBody.voice = selectedVoiceName.replace('__backend_', '');
          }

          try {
            const blob = await vietSpotAPI.tts({ text, language: lang, voice: backendBody.voice });
            const url = URL.createObjectURL(blob);
            if (ttsAudioRef.current) {
              ttsAudioRef.current.src = url;
            } else {
              ttsAudioRef.current = new Audio(url);
            }
            ttsAudioRef.current.onended = () => {
              setIsSpeaking(false);
              try { URL.revokeObjectURL(url); } catch { }
            };
            ttsAudioRef.current.onplay = () => setIsSpeaking(true);
            await ttsAudioRef.current.play().catch(() => { });
            return;
          } catch (e) {
            console.warn('Backend TTS failed', e);
          }
        }
      } catch (e) {
        console.warn('Backend TTS failed', e);
      }
      // if backend fails or was skipped, fall through to browser TTS
    }

    // Prefer immediate browser SpeechSynthesis for low latency playback
    try {
      if ('speechSynthesis' in window) {
        let voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) {
          await new Promise<void>((resolve) => {
            const handler = () => {
              voices = window.speechSynthesis.getVoices();
              window.speechSynthesis.removeEventListener('voiceschanged', handler);
              resolve();
            };
            window.speechSynthesis.addEventListener('voiceschanged', handler);
            setTimeout(resolve, 500);
          });
        }

        // If a voice was explicitly selected, use it
        const selected = selectedVoiceName ? voices.find(v => v.name === selectedVoiceName) : null;

        // Fallback: prefer higher-quality voices by name or by language
        const preferred = selected || voices.find(v => v.lang && v.lang.startsWith(lang.split('-')[0]) && /google|neural|wave|microsoft|yandex|amazon|aws|azure/i.test(v.name))
          || voices.find(v => v.lang && v.lang.startsWith(lang.split('-')[0]));

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang;
        if (preferred) utter.voice = preferred;
        utter.rate = ttsRate;
        utter.pitch = ttsPitch;
        utter.volume = ttsVolume;
        utter.onend = () => {
          setIsSpeaking(false);
          currentUtterRef.current = null;
        };
        utter.onerror = () => {
          setIsSpeaking(false);
          currentUtterRef.current = null;
        };
        currentUtterRef.current = utter;
        window.speechSynthesis.cancel();
        setIsSpeaking(true);
        window.speechSynthesis.speak(utter);
        return;
      }
    } catch (e) {
      console.warn('SpeechSynthesis playback failed', e);
    }

    // Fallback to backend TTS as last resort
    try {
      const blob = await vietSpotAPI.tts({ text, language: lang });
      const url = URL.createObjectURL(blob);
      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = url;
      } else {
        ttsAudioRef.current = new Audio(url);
      }
      ttsAudioRef.current.onended = () => {
        setIsSpeaking(false);
        try { URL.revokeObjectURL(url); } catch { }
      };
      ttsAudioRef.current.onplay = () => setIsSpeaking(true);
      await ttsAudioRef.current.play().catch(() => { });
      return;
    } catch (e) {
      console.warn('Backend TTS failed', e);
    }

    setIsSpeaking(false);
  };

  // Keep the internal TTS/STT language in sync with the app locale unless the
  // user explicitly chose a different TTS voice/language. This ensures when
  // users switch the app to English the voice/filter switches too.
  useEffect(() => {
    try {
      const appLang = i18n.language || (navigator.language || 'en').split('-')[0];
      const targetTts = appLang.startsWith('vi') ? 'vi-VN' : 'en-US';

      // Only override ttsLanguage when it appears to be the default (not
      // explicitly changed by user). If we detect the TTS language is the
      // default Vietnamese backend and the app switched to English, switch
      // it to the English backend as well.
      const isDefaultTts = !ttsLanguage || ttsLanguage === 'vi-VN' || ttsLanguage === 'en-US';
      if (isDefaultTts) setTtsLanguage(targetTts);

      // If selected voice is a backend Vietnamese default, update it to
      // backend English when app language becomes English so the voice list
      // and playback language match the UI language.
      if (selectedVoiceName && selectedVoiceName.startsWith('__backend')) {
        if (appLang.startsWith('vi')) {
          if (selectedVoiceName !== '__backend_vi') setSelectedVoiceName('__backend_vi');
        } else {
          if (selectedVoiceName !== '__backend_en') setSelectedVoiceName('__backend_en');
        }
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el) {
      el.addEventListener('scroll', checkScrollPosition);
      return () => el.removeEventListener('scroll', checkScrollPosition);
    }
  }, [isOpen, checkScrollPosition]);

  // Restore Chatbot state (open + active tab) when returning from a place detail
  useEffect(() => {
    try {
      const savedTab = sessionStorage.getItem('vietspots_chatbot_tab');
      const shouldOpen = sessionStorage.getItem('vietspots_chatbot_open');
      if (savedTab) {
        setActiveTab(savedTab as any);
      }
      if (shouldOpen) {
        setIsOpen(true);
      }
      // Clear once applied so it doesn't persist forever
      if (savedTab) sessionStorage.removeItem('vietspots_chatbot_tab');
      if (shouldOpen) sessionStorage.removeItem('vietspots_chatbot_open');
    } catch { }
  }, [location.pathname]);

  // scrollUp/scrollDown removed

  const playLastAssistantMessage = () => {
    const last = [...messages].slice().reverse().find((m) => m.role === 'assistant' && !m.isStreaming && m.content && m.content.trim().length > 0);
    if (!last) {
      toast.info(t('messages.nothing_to_read') || 'No message to read');
      return;
    }
    void speakText(last.content, ttsLanguage);
  };

  // Streaming chat handler
  const handleSendWithStreaming = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);

    // Add streaming placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      // Call the stable chat endpoint directly (server does not document /api/chat/stream)
      const payload = {
        message: userInput,
        session_id: sessionStorage.getItem("vietspot_session_id") || undefined,
        user_lat: userLocation?.latitude ?? null,
        user_lon: userLocation?.longitude ?? null,
      };
      try {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('Chat request payload:', payload);
          // Also log a JSON string so values are visible without expanding the object in console
          // eslint-disable-next-line no-console
          console.debug('Chat request payload (json):', JSON.stringify(payload));
        }
      } catch { }
      const response = await fetch(VIETSPOT_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Debug response status for easier diagnosis
      try { if (process.env.NODE_ENV !== 'production') console.debug('Chat response status', response.status); } catch { }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.session_id) {
        sessionStorage.setItem("vietspot_session_id", data.session_id);
      }

      // Dev-only: log places array so we can inspect coordinate fields
      try {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('Chat response places:', data.places);
        }
      } catch { }

      // Simulate streaming effect for regular response
      const answer = data.answer || (t('messages.cannot_process') as string) || "Xin lỗi, tôi không thể xử lý yêu cầu này.";
      const words = String(answer).split(" ");
      let currentContent = "";

      for (let i = 0; i < words.length; i++) {
        currentContent += (i === 0 ? "" : " ") + words[i];
        const content = currentContent;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content }
              : msg
          )
        );
        await new Promise(r => setTimeout(r, 30)); // Delay between words
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );

      // Handle places payload
      if (data.places && data.places.length > 0) {
        const mapped = data.places.map((p: PlaceInfo) => transformToPlaceResult(p, userLocation || undefined));
        // Dev-only logs for mapped/filtered/markers
        try {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.debug('Chat mapped places:', mapped);
            // We no longer apply client-side category/minRating/distance filters
            const filtered = mapped || [];
            // eslint-disable-next-line no-console
            console.debug('Chat filtered places count:', filtered.length);
            const markers = filtered.filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude as any) && !isNaN(p.longitude as any));
            // eslint-disable-next-line no-console
            console.debug('Chat mapMarkers count:', markers.length, markers);
          }
        } catch { }

        setPlaceResults(dedupePlaceResults(mapped));
        setLastPlaceMessageId(assistantMessageId);
      } else {
        setLastPlaceMessageId(null);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(t('messages.cannot_connect'));

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: t('messages.error_occurred_apology'), isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize API results to the same shape as `fallbackPlaces` so saved tab can render consistently
  const normalizedResults = placeResults.map((p) => ({
    id: p.id,
    name: p.name,
    location: p.address || p.name,
    image: (p.images && p.images.length > 0) ? p.images[0] : "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    rating: p.rating || 0,
  }));

  // Merge API results with fallback places but avoid duplicates (keep API results first)
  const knownPlaces = [
    ...normalizedResults,
    ...fallbackPlaces.filter(fp => !normalizedResults.some(n => n.id === fp.id)),
  ];

  const savedPlaces = favorites
    .map((id) => knownPlaces.find((p) => p.id === id))
    .filter(Boolean) as any[];

  const tabs = [
    { id: "chat" as const, label: t('chat.tab_chat'), icon: MessageSquare },
    { id: "history" as const, label: t('chat.tab_history'), icon: History },
    { id: "form" as const, label: t('chat.tab_form'), icon: FileText },
    { id: "saved" as const, label: t('chat.tab_saved'), icon: Bookmark },
  ];

  // Do not apply client-side category/minRating/distance filters to chat results.
  // We want to show all chat-suggested places as returned by the API.
  const filteredPlaceResults = placeResults.slice();

  // Get map markers from filtered place results
  const mapMarkers = filteredPlaceResults
    .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude as any) && !isNaN(p.longitude as any))
    .map(p => ({
      id: p.id,
      name: p.name,
      address: p.address,
      latitude: p.latitude!,
      longitude: p.longitude!,
      rating: p.rating
    }));

  // Filters removed — no availableCategories required

  return (
    <>
      {/* Map Panel - Shows when chatbot is open and has places */}
      {isOpen && showMap && mapMarkers.length > 0 && (
        <div
          className={cn(
            "fixed top-0 z-30 h-screen bg-card border-l border-border shadow-xl transition-all duration-300",
            // Map takes remaining space on left of chat panel (updated width)
            "right-[640px] w-[calc(100vw-640px)] max-w-[760px]"
          )}
        >
          <div className="h-full flex flex-col">
            {/* Map Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{t('ui.map')}</span>
                <Badge variant="secondary" className="text-xs">
                  {mapMarkers.length} {t('place.places_label')}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowMap(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Map Content */}
            <div className="flex-1">
              <ChatbotMap
                places={mapMarkers}
                selectedPlaceId={selectedPlaceId}
                onPlaceSelect={setSelectedPlaceId}
                userLocation={userLocation || undefined}
                routeToPlaceId={routeToPlaceId}
                onRouteRequest={(placeId) => {
                  setRouteToPlaceId(placeId);
                  setSelectedPlaceId(null);
                }}
                onRouteClear={() => setRouteToPlaceId(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* If there are place results but no valid markers, show a hint panel */}
      {isOpen && showMap && mapMarkers.length === 0 && placeResults.length > 0 && (
        <div
          className={cn(
            "fixed top-0 z-30 h-screen bg-card border-l border-border shadow-xl transition-all duration-300",
            "right-[640px] w-[calc(100vw-640px)] max-w-[760px] flex items-center justify-center"
          )}
        >
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              {t('chat.no_map_markers') || 'Không có vị trí hợp lệ để hiển thị trên bản đồ. Kiểm tra API response hoặc tắt bộ lọc.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" onClick={() => setShowMap(false)}>
                {t('ui.hide_map') || 'Đóng bản đồ'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button - Fixed on right edge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-l-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:w-14",
          isOpen ? "right-[640px]" : "right-0"
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>

      {/* Map Toggle Button - Shows when map is hidden */}
      {isOpen && !showMap && mapMarkers.length > 0 && (
        <button
          onClick={() => setShowMap(true)}
          className="fixed top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-l-xl bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:w-14 right-[640px]"
          style={{ marginTop: "60px" }}
        >
          <MapIcon className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-40 h-screen bg-card border-l border-border shadow-2xl transition-transform duration-300 flex flex-col overflow-hidden",
          // Chat panel width: expanded horizontally
          isOpen ? "translate-x-0 w-[640px]" : "translate-x-full w-[620px]"
        )}
      >
        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 py-4 text-sm font-medium transition-colors relative",
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === "chat" && (
            <>
              {/* Toolbar: Location + Filters */}
              <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap">
                {/* New Chat Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={startNewConversation}
                >
                  <Plus className="h-4 w-4" />
                  {t('actions.new')}
                </Button>

                {/* Location Button */}
                <Button
                  variant={userLocation ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    // toggle: if we already have a location, clear it; otherwise request it
                    if (userLocation) {
                      setUserLocation(null);
                      toast.success(t('messages.location_cleared') || 'Vị trí đã tắt');
                    } else {
                      getUserLocation();
                    }
                  }}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                  {isGettingLocation ? t('ui.locating') : (userLocation ? t('ui.located') : t('actions.location'))}
                </Button>

                {/* Current conversation saved timestamp */}
                {currentConversation && (
                  <div className="ml-auto text-xs text-muted-foreground px-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {t('chat.saved_on') || 'Saved on'} {new Date(currentConversation.createdAt || currentConversation.updatedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Filters removed per user request */}

                {/* Filter badges removed */}
              </div>

              {/* Place Results & Messages */}
              <div className="relative flex-1 min-h-0">
                <ScrollArea className="h-full min-h-0" ref={scrollRef}>
                  <div className="p-4 space-y-4">
                    {/* Chat Messages */}
                    {(() => {
                      // If we have a `lastPlaceMessageId`, split messages so that
                      // messages up to (and including) that assistant message are
                      // shown first, then place cards, then remaining messages.
                      const splitIndex = lastPlaceMessageId
                        ? messages.findIndex((m) => m.id === lastPlaceMessageId)
                        : -1;

                      const before = splitIndex >= 0 ? messages.slice(0, splitIndex + 1) : messages;
                      const after = splitIndex >= 0 ? messages.slice(splitIndex + 1) : [];

                      return (
                        <>
                          {before.map((message, index) => (
                            <div
                              key={message.id}
                              className={cn(
                                "flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                                message.role === "user" ? "justify-end" : "justify-start"
                              )}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm overflow-hidden",
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {parseMarkdownBold(message.content)}
                                  {message.isStreaming && (
                                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                                  )}
                                </p>
                                <div className={cn("mt-1 text-xs text-muted-foreground", message.role === 'user' ? 'text-right' : 'text-left')}>
                                  {new Date(message.createdAt || Date.now()).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Place Result Cards go between before/after messages */}
                          {filteredPlaceResults.map((place, index) => (
                            <div
                              key={place.id}
                              className={cn(
                                "border rounded-xl p-4 bg-card animate-in fade-in slide-in-from-right-4 cursor-pointer transition-all hover:shadow-md",
                                selectedPlaceId === place.id
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-border"
                              )}
                              style={{ animationDelay: `${index * 100}ms` }}
                              onClick={() => {
                                setSelectedPlaceId(place.id);
                                if (!showMap) setShowMap(true);
                              }}
                            >
                              {/* Place Header */}
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <h3 className="font-bold text-primary leading-tight">{place.name}</h3>
                                <div className="flex items-center gap-2 shrink-0">
                                  {place.matchingScore && (
                                    <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                                      <Percent className="h-3 w-3" />
                                      {place.matchingScore}%
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
                                    <Star className="h-3 w-3 fill-current" />
                                    {place.rating}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("h-8 w-8", isFavorite(place.id) ? 'text-primary' : '')}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void toggleFavorite({
                                        id: place.id,
                                        name: place.name,
                                        address: place.address,
                                        image: place.images && place.images.length > 0 ? (place.images[0] as string) : undefined,
                                        rating: place.rating,
                                        category: place.category,
                                      });
                                    }}
                                    title={isFavorite(place.id) ? t('actions.remove_favorite') : t('actions.save')}
                                  >
                                    <Bookmark className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Category & Distance Row */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {place.category && (
                                  <Badge variant="secondary" className="text-xs">{place.category}</Badge>
                                )}
                                {place.distance !== undefined && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <MapPinned className="h-3 w-3" />
                                    {formatDistance(place.distance)}
                                  </Badge>
                                )}
                                {place.totalComments !== undefined && place.totalComments > 0 && (
                                  <Badge variant="outline" className="text-xs">{place.totalComments} {t('place.reviews')}</Badge>
                                )}
                              </div>

                              {/* Address */}
                              <div className="flex items-start gap-2 text-sm mb-2">
                                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{place.address}</span>
                              </div>

                              {/* Opening Hours */}
                              {place.openingHours && (
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                                  <span>{formatOpeningHours(place.openingHours, i18n.language, t)}</span>
                                </div>
                              )}

                              {/* Phone */}
                              {place.phone && (
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <Phone className="h-4 w-4 text-green-600 shrink-0" />
                                  <a href={`tel:${place.phone}`} className="text-sm text-primary underline">{place.phone}</a>
                                </div>
                              )}

                              {/* Website */}
                              {place.website && (
                                <div className="flex items-center gap-2 text-sm mb-3">
                                  <Globe className="h-4 w-4 text-blue-600 shrink-0" />
                                  <a href={place.website} target="_blank" rel="noreferrer" className="text-sm text-primary underline">{t('place.website')}</a>
                                </div>
                              )}

                              {/* Images */}
                              {place.images && place.images.length > 0 && (
                                <div className="flex gap-2 mt-2 overflow-x-auto">
                                  {place.images.map((img, i) => {
                                    const src = typeof img === 'string' ? img : (img as any).url || '';
                                    return (
                                      <img
                                        key={i}
                                        src={src}
                                        alt=""
                                        className="h-20 w-20 object-cover rounded-lg shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => window.open(src, '_blank')}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}

                          {after.map((message, idx) => (
                            <div
                              key={message.id}
                              className={cn(
                                "flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                                message.role === "user" ? "justify-end" : "justify-start"
                              )}
                              style={{ animationDelay: `${idx * 50}ms` }}
                            >
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm overflow-hidden",
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {parseMarkdownBold(message.content)}
                                  {message.isStreaming && (
                                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                                  )}
                                </p>
                                <div className={cn("mt-1 text-xs text-muted-foreground", message.role === 'user' ? 'text-right' : 'text-left')}>
                                  {new Date(message.createdAt || Date.now()).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}

                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex justify-start">
                        <div className="bg-secondary rounded-2xl px-4 py-3 flex items-center gap-2 rounded-bl-md">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">{t('ui.ai_thinking')}</span>
                        </div>
                      </div>
                    )}

                    {/* Place results are rendered above between messages; duplicated rendering removed. */}

                  </div>
                </ScrollArea>

                {/* Scroll Buttons */}
                {/* Scroll buttons removed for web experience */}
              </div>

              {/* GPS Pill */}
              {selectedGps && (
                <div className="px-4 pb-2 shrink-0">
                  <div className="flex items-center justify-between bg-primary/10 text-primary rounded-full px-4 py-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">GPS: {selectedGps}</span>
                    </div>
                    <button onClick={() => setSelectedGps(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-border shrink-0 bg-card">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendWithStreaming();
                  }}
                  className="flex gap-2 items-center"
                >
                  <Button
                    variant={isRecording ? 'destructive' : 'outline'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={(e) => {
                      e.preventDefault();
                      if (isRecording) stopRecording(); else startRecording();
                    }}
                    disabled={sttLoading || isLoading}
                    title={isRecording ? t('chatbot.stop_recording') : t('chatbot.start_recording')}
                  >
                    {isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  {/* TTS settings popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3">
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium mb-1">{t('chatbot.voice') || 'Voice'}</div>
                          <Select value={selectedVoiceName || ''} onValueChange={(v) => setSelectedVoiceName(v || null)}>
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder={selectedVoiceName || (ttsLanguage === 'vi-VN' ? t('languages.vi') : t('languages.en'))} />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Backend high-quality Vietnamese option */}
                              {ttsLanguage === 'vi-VN' && (
                                <SelectItem value="__backend_vi">{t('chatbot.backend_vi') || 'Tiếng Việt - Hệ thống'}</SelectItem>
                              )}
                              {ttsLanguage && ttsLanguage.startsWith('en') && (
                                <SelectItem value="__backend_en">{t('chatbot.backend_en') || 'Backend - English (Neural)'}</SelectItem>
                              )}
                              {filteredVoices.length === 0 && (
                                <SelectItem value="">{t('chatbot.no_voices') || 'No voices available'}</SelectItem>
                              )}
                              {filteredVoices.map((v) => (
                                <SelectItem key={v.name} value={v.name}>{v.name} {v.lang ? `(${v.lang})` : ''}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{t('chatbot.prefer_backend') || 'Prefer backend TTS'}</div>
                          <Switch checked={preferBackendTts} onCheckedChange={(v: any) => setPreferBackendTts(Boolean(v))} />
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1 flex items-center justify-between">
                            <span>{t('chatbot.rate') || 'Rate'}</span>
                            <span className="text-xs text-muted-foreground font-mono">{ttsRate.toFixed(2)}x</span>
                          </div>
                          <Slider
                            value={[ttsRate]}
                            onValueChange={([v]) => setTtsRate(Number(v))}
                            min={0.5}
                            max={1.5}
                            step={0.05}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1 flex items-center justify-between">
                            <span>{t('chatbot.pitch') || 'Pitch'}</span>
                            <span className="text-xs text-muted-foreground font-mono">{ttsPitch.toFixed(2)}</span>
                          </div>
                          <Slider
                            value={[ttsPitch]}
                            onValueChange={([v]) => setTtsPitch(Number(v))}
                            min={0.5}
                            max={2}
                            step={0.05}
                            className="w-full"
                          />
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1 flex items-center justify-between">
                            <span>{t('chatbot.volume') || 'Volume'}</span>
                            <span className="text-xs text-muted-foreground font-mono">{Math.round(ttsVolume * 100)}%</span>
                          </div>
                          <Slider
                            value={[ttsVolume]}
                            onValueChange={([v]) => setTtsVolume(Number(v))}
                            min={0}
                            max={1}
                            step={0.05}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Speaker button: user triggers TTS for last assistant message */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={(e) => {
                      e.preventDefault();
                      playLastAssistantMessage();
                    }}
                    title={t('chatbot.play_last_message') || 'Play last message'}
                    disabled={isLoading}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>

                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendWithStreaming();
                      }
                    }}
                    placeholder={t('chatbot.placeholder')}
                    className="flex-1 min-w-0 rounded-full h-9 px-4"
                    disabled={isLoading}
                  />

                  <div className="w-28">
                    <Select value={ttsLanguage} onValueChange={(v) => setTtsLanguage(v)}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder={ttsLanguage === 'vi-VN' ? t('languages.vi') : t('languages.en')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi-VN">{t('languages.vi')}</SelectItem>
                        <SelectItem value="en-US">{t('languages.en')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="rounded-full px-4 h-9" disabled={isLoading}>
                    {t('chatbot.send')}
                  </Button>
                </form>
              </div>
            </>
          )}

          {activeTab === "form" && (
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="font-semibold text-foreground mb-4">{t('chatbot.form_title')}</h3>
              <div className="space-y-4">
                {/* Destination */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('chatbot.form.destination')}</label>
                  <Input
                    placeholder={t('itinerary.destination_placeholder')}
                    className="w-full"
                    id="form-destination"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('chatbot.form.category')}</label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-auto p-1">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={formCategory.length === 0}
                        onChange={() => setFormCategory([])}
                      />
                      <span>{t('search.all')}</span>
                    </label>
                    {categories.map((c) => {
                      const checked = formCategory.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() => {
                              setFormCategory((prev) =>
                                prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                              );
                            }}
                          />
                          <span>{t(c.labelKey)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center justify-between">
                    <span>{t('search.min_rating')}</span>
                    <span className="text-primary">{formRating.toFixed(1)} ★</span>
                  </label>
                  <Slider
                    value={[formRating]}
                    onValueChange={(values) => setFormRating(values[0])}
                    min={0}
                    max={5}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                {/* Number of results */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('chatbot.form.results_count')}</label>
                  <Select value={formLimit} onValueChange={setFormLimit}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 {t('place.places_label', { count: 5 })}</SelectItem>
                      <SelectItem value="10">10 {t('place.places_label', { count: 10 })}</SelectItem>
                      <SelectItem value="20">20 {t('place.places_label', { count: 20 })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full mt-4"
                  onClick={() => {
                    const destination = (document.getElementById('form-destination') as HTMLInputElement)?.value || '';
                    if (destination) {
                      // Build message with all form parameters using i18n pieces
                      let message = t('chatbot.form.search_message', { limit: formLimit });
                      if (formCategory.length > 0) {
                        const labels = formCategory.map(id => {
                          const cat = categories.find(c => c.id === id);
                          return cat ? t(cat.labelKey) : id;
                        }).join(', ');
                        message += ` ${t('chatbot.form.of_type')} ${labels}`;
                      }
                      message += ` ${t('chatbot.form.at_location', { destination })}`;
                      if (formRating > 0) {
                        message += `, ${t('chatbot.form.min_rating', { rating: formRating })}`;
                      }

                      setActiveTab('chat');
                      setInput(message);
                      // Auto-send after switching tab
                      setTimeout(() => {
                        const form = document.querySelector('form') as HTMLFormElement;
                        if (form) {
                          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                        }
                      }, 100);
                    } else {
                      toast.error(t('itinerary.enter_destination'));
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('actions.apply')}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {!user ? (
                  <div className="text-center py-12">
                    <History className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">{t('ui.login_to_view_history')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('chat.history_saved_on_login')}
                    </p>
                  </div>
                ) : conversations.length > 0 ? (
                  conversations.map((conv, index) => (
                    <div
                      key={conv.id}
                      className="border border-border rounded-xl p-3 bg-card hover:bg-muted/50 cursor-pointer transition-colors animate-in fade-in slide-in-from-right-4 group"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => {
                        loadConversation(conv.id);
                        setActiveTab('chat');
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">
                            {conv.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(conv.updatedAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <History className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">{t('chat.no_history')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('ui.start_new_conversation_to_save_history')}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {activeTab === "saved" && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {savedPlaces.length > 0 ? (
                  savedPlaces.map((place, index) => (
                    <div
                      key={place.id}
                      role={place.id ? 'button' : undefined}
                      onClick={() => {
                        if (!place.id) return;
                        try { sessionStorage.setItem('vietspots_chatbot_tab', 'saved'); sessionStorage.setItem('vietspots_chatbot_open', '1'); } catch { }
                        navigate(`/place/${place.id}`);
                      }}
                      className="cursor-pointer border border-border rounded-xl p-4 bg-card animate-in fade-in slide-in-from-right-4"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-primary leading-tight">
                          {place.name}
                        </h3>
                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold shrink-0">
                          <Star className="h-3 w-3 fill-current" />
                          {place.rating}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-sm mb-3">
                        <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{place.location}</span>
                      </div>
                      <img
                        src={place.image}
                        alt={place.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">{t('ui.no_saved_places')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('ui.press_heart_to_save')}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
