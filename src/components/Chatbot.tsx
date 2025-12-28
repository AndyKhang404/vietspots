import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, X, MapPin, Loader2, Phone, Globe, Navigation, Star,
  ChevronUp, ChevronDown, MessageSquare, FileText, Bookmark,
  Map as MapIcon, Clock, MapPinned, Filter, LocateFixed, Percent,
  Plus, History, Trash2, Mic, Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useChatConversations } from "@/hooks/useChatConversations";
import { fallbackPlaces, transformPlace, categories, resolveCategoryId } from "@/data/places";
import vietSpotAPI, { PlaceInfo } from "@/api/vietspot";
import ChatbotMap from "./ChatbotMap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories as allCategories } from "@/data/places";
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
  if (userLocation && place.latitude && place.longitude) {
    distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      place.latitude,
      place.longitude
    );
  }

  return {
    id: place.place_id || place.id,
    name: place.name,
    address: place.address || `${place.city || ""}, Vietnam`,
    phone: place.phone,
    website: place.website,
    rating: place.rating || 0,
    gps: (place.latitude && place.longitude)
      ? `${place.latitude}, ${place.longitude}`
      : (place.coordinates ? `${place.coordinates.lat}, ${place.coordinates.lon}` : undefined),
    images: place.images?.map((img: { url: string } | string) => typeof img === 'string' ? img : img.url) || (place.image_url ? [place.image_url] : []),
    latitude: place.latitude || place.coordinates?.lat,
    longitude: place.longitude || place.coordinates?.lon,
    openingHours: typeof place.opening_hours === 'string' ? place.opening_hours : (place.opening_hours ? JSON.stringify(place.opening_hours) : undefined),
    totalComments: place.total_comments || place.rating_count,
    matchingScore: Math.floor(Math.random() * 30 + 70),
    distance,
    category: place.category,
    description: place.description,
  };
}

const CHAT_STORAGE_KEY = "vietspots_chat_history";

export default function Chatbot() {
  const { t, i18n } = useTranslation();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const {
    conversations,
    messages,
    setMessages,
    placeResults,
    setPlaceResults,
    startNewConversation,
    loadConversation,
    deleteConversation,
  } = useChatConversations();
  const navigate = useNavigate();

  // Track which assistant message ID produced the current `placeResults` so we can
  // render the chat messages before that assistant message, then the place cards,
  // then the remaining messages (so new user messages appear after the place cards).
  const [lastPlaceMessageId, setLastPlaceMessageId] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "form" | "saved" | "history">("chat");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGps, setSelectedGps] = useState<string | null>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [routeToPlaceId, setRouteToPlaceId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Speech / STT / TTS state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [sttLoading, setSttLoading] = useState(false);
  const [ttsLanguage, setTtsLanguage] = useState<string>(i18n.language && i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US');
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentUtterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(() => localStorage.getItem('vietspots_tts_voice') || null);
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
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxDistance, setMaxDistance] = useState<number>(50);

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
    } catch {}
  }, [selectedVoiceName, preferBackendTts, ttsRate, ttsPitch, ttsVolume]);

  const checkScrollPosition = useCallback(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setCanScrollUp(scrollTop > 10);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
      setShowScrollButtons(scrollHeight > clientHeight + 50);
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
        if (!selectedVoiceName && voices.length > 0) {
          const pref = voices.find(v => v.lang && v.lang.startsWith(ttsLanguage.split('-')[0]));
          if (pref) setSelectedVoiceName(pref.name);
        }
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const res = await fetch('https://vietspotbackend-production.up.railway.app/api/stt/transcribe', {
            method: 'POST',
            body: fd,
          });
          if (res.ok) {
            const json = await res.json();
            if (json && json.transcript) {
              setInput((prev) => (prev ? prev + ' ' + json.transcript : json.transcript));
            }
          } else {
            const text = await res.text();
            console.error('STT error', res.status, text);
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
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }

      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
      // stop all tracks
      try {
        mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      } catch {}
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
          try { ttsAudioRef.current.currentTime = 0; } catch {}
        }
      } catch {}
      try { window.speechSynthesis.cancel(); } catch {}
      currentUtterRef.current = null;
      setIsSpeaking(false);
      return;
    }

    // If user prefers backend TTS, try backend first
    if (preferBackendTts) {
      try {
        const res = await fetch('https://vietspotbackend-production.up.railway.app/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: lang }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          if (ttsAudioRef.current) {
            ttsAudioRef.current.src = url;
          } else {
            ttsAudioRef.current = new Audio(url);
          }
          ttsAudioRef.current.onended = () => {
            setIsSpeaking(false);
            try { URL.revokeObjectURL(url); } catch {}
          };
          ttsAudioRef.current.onplay = () => setIsSpeaking(true);
          await ttsAudioRef.current.play().catch(() => {});
          return;
        }
      } catch (e) {
        console.warn('Backend TTS failed', e);
      }
      // if backend fails, fall through to browser TTS
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
      const res = await fetch('https://vietspotbackend-production.up.railway.app/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (ttsAudioRef.current) {
          ttsAudioRef.current.src = url;
        } else {
          ttsAudioRef.current = new Audio(url);
        }
        ttsAudioRef.current.onended = () => {
          setIsSpeaking(false);
          try { URL.revokeObjectURL(url); } catch {}
        };
        ttsAudioRef.current.onplay = () => setIsSpeaking(true);
        await ttsAudioRef.current.play().catch(() => {});
        return;
      }
    } catch (e) {
      console.warn('Backend TTS failed', e);
    }

    setIsSpeaking(false);
  };

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el) {
      el.addEventListener('scroll', checkScrollPosition);
      return () => el.removeEventListener('scroll', checkScrollPosition);
    }
  }, [isOpen, checkScrollPosition]);

  const scrollUp = () => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el) {
      el.scrollBy({ top: -150, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (el) {
      el.scrollBy({ top: 150, behavior: 'smooth' });
    }
  };

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
      },
    ]);

    try {
      // First try streaming endpoint
      const response = await fetch(VIETSPOT_STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userInput,
          session_id: sessionStorage.getItem("vietspot_session_id") || undefined,
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude,
        }),
      });

      if (response.ok && response.body) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let placesData: PlaceInfo[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  fullContent += parsed.token;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  );
                }
                if (parsed.places) {
                  placesData = parsed.places;
                }
                if (parsed.session_id) {
                  sessionStorage.setItem("vietspot_session_id", parsed.session_id);
                }
              } catch {
                // Continue on parse error
              }
            }
          }
        }

        // Finalize streaming message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );

        // Do not auto-play TTS for responses; user can press the speaker button to play.

        if (placesData.length > 0) {
          setPlaceResults(placesData.map(p => transformToPlaceResult(p, userLocation || undefined)));
          setLastPlaceMessageId(assistantMessageId);
        } else {
          // clear previous place anchor when no places returned
          setLastPlaceMessageId(null);
        }
      } else {
        // Fallback to regular endpoint
        const fallbackResponse = await fetch(VIETSPOT_CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userInput,
            session_id: sessionStorage.getItem("vietspot_session_id") || undefined,
            latitude: userLocation?.latitude,
            longitude: userLocation?.longitude,
          }),
        });

        if (!fallbackResponse.ok) {
          throw new Error(`API Error: ${fallbackResponse.status}`);
        }

        const data = await fallbackResponse.json();

        if (data.session_id) {
          sessionStorage.setItem("vietspot_session_id", data.session_id);
        }

        // Simulate streaming effect for regular response
        const answer = data.answer || "Xin lỗi, tôi không thể xử lý yêu cầu này.";
        const words = answer.split(" ");
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

        // Do not auto-play TTS for responses; user can press the speaker button to play.

        if (data.places && data.places.length > 0) {
          setPlaceResults(data.places.map((p: PlaceInfo) => transformToPlaceResult(p, userLocation || undefined)));
          setLastPlaceMessageId(assistantMessageId);
        } else {
          setLastPlaceMessageId(null);
        }
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

  const knownPlaces = [...normalizedResults, ...fallbackPlaces];

  const savedPlaces = favorites
    .map((id) => knownPlaces.find((p) => p.id === id))
    .filter(Boolean) as any[];

  const tabs = [
    { id: "chat" as const, label: t('chat.tab_chat'), icon: MessageSquare },
    { id: "history" as const, label: t('chat.tab_history'), icon: History },
    { id: "form" as const, label: t('chat.tab_form'), icon: FileText },
    { id: "saved" as const, label: t('chat.tab_saved'), icon: Bookmark },
  ];

  // Filter place results (support multiple category selections)
  const filteredPlaceResults = placeResults.filter(place => {
    if (categoryFilter.length > 0 && !categoryFilter.includes(place.category || '')) return false;
    if (place.rating < minRating) return false;
    if (place.distance && place.distance > maxDistance) return false;
    return true;
  });

  // Get map markers from filtered place results
  const mapMarkers = filteredPlaceResults
    .filter(p => p.latitude && p.longitude)
    .map(p => ({
      id: p.id,
      name: p.name,
      address: p.address,
      latitude: p.latitude!,
      longitude: p.longitude!,
      rating: p.rating
    }));

  // Get unique categories: union of global list and current results
  const availableCategories = Array.from(
    new Set([
      ...allCategories.map((c) => c.id),
      ...placeResults.map((p) => resolveCategoryId(p.category)).filter(Boolean),
    ])
  ) as string[];

  return (
    <>
      {/* Map Panel - Shows when chatbot is open and has places */}
      {isOpen && showMap && mapMarkers.length > 0 && (
        <div
          className={cn(
            "fixed top-0 z-30 h-screen bg-card border-l border-border shadow-xl transition-all duration-300",
            // Map takes remaining space on left of chat panel
            "right-[420px] w-[calc(100vw-420px)] max-w-[500px]"
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

      {/* Toggle Button - Fixed on right edge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-l-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:w-14",
          isOpen ? "right-[420px]" : "right-0"
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>

      {/* Map Toggle Button - Shows when map is hidden */}
      {isOpen && !showMap && mapMarkers.length > 0 && (
        <button
          onClick={() => setShowMap(true)}
          className="fixed top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-l-xl bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:w-14 right-[420px]"
          style={{ marginTop: "60px" }}
        >
          <MapIcon className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-40 h-screen bg-card border-l border-border shadow-2xl transition-transform duration-300 flex flex-col overflow-hidden",
          // Chat panel width reduced to 420px for a more compact look
          isOpen ? "translate-x-0 w-[420px]" : "translate-x-full w-[400px]"
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
                  onClick={getUserLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                  {userLocation ? t('ui.locating') : t('actions.location')}
                </Button>

                {/* Filters Popover */}
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Filter className="h-4 w-4" />
                      {t('actions.filters')}
                      {(categoryFilter.length > 0 || minRating > 0 || maxDistance < 50) && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                          !
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">{t('search.advanced_filters')}</h4>

                      {/* Category Filter - multi-select checkboxes */}
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">{t('chatbot.form.category')}</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-auto p-1">
                          {availableCategories.map((cat) => {
                            const checked = categoryFilter.includes(cat);
                            return (
                              <label key={cat} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={checked}
                                  onChange={() => {
                                    setCategoryFilter((prev) =>
                                      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                                    );
                                  }}
                                />
                                <span>{t(`categories.${cat}`, { defaultValue: cat })}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Min Rating */}
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex items-center justify-between">
                          <span>{t('search.min_rating')}</span>
                          <span className="font-medium">{minRating} ★</span>
                        </label>
                        <Slider
                          value={[minRating]}
                          onValueChange={([val]) => setMinRating(val)}
                          min={0}
                          max={5}
                          step={0.5}
                          className="w-full"
                        />
                      </div>

                      {/* Max Distance */}
                      {userLocation && (
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground flex items-center justify-between">
                            <span>{t('search.max_distance')}</span>
                            <span className="font-medium">{maxDistance}km</span>
                          </label>
                          <Slider
                            value={[maxDistance]}
                            onValueChange={([val]) => setMaxDistance(val)}
                            min={1}
                            max={50}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      )}

                      {/* Reset Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setCategoryFilter([]);
                          setMinRating(0);
                          setMaxDistance(50);
                        }}
                      >
                        {t('search.clear_all')}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Active filter badges */}
                {categoryFilter.length > 0 && (
                  <div className="flex items-center gap-2">
                    {categoryFilter.map((cf) => (
                      <Badge key={cf} variant="outline" className="text-xs">
                        {t(`categories.${cf}`, { defaultValue: cf })}
                      </Badge>
                    ))}
                  </div>
                )}
                {minRating > 0 && (
                  <Badge variant="outline" className="text-xs">
                    ≥{minRating}★
                  </Badge>
                )}
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

                    {/* Place Result Cards - Below messages */}
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
                          <h3 className="font-bold text-primary leading-tight">
                            {place.name}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Matching Score */}
                            {place.matchingScore && (
                              <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                                <Percent className="h-3 w-3" />
                                {place.matchingScore}%
                              </span>
                            )}
                            {/* Rating */}
                            <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold">
                              <Star className="h-3 w-3 fill-current" />
                              {place.rating}
                            </span>
                          </div>
                        </div>

                        {/* Category & Distance Row */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {place.category && (
                            <Badge variant="secondary" className="text-xs">
                              {place.category}
                            </Badge>
                          )}
                          {place.distance !== undefined && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <MapPinned className="h-3 w-3" />
                              {formatDistance(place.distance)}
                            </Badge>
                          )}
                          {place.totalComments !== undefined && place.totalComments > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {place.totalComments} {t('place.reviews')}
                            </Badge>
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
                            <span className="text-muted-foreground">{formatOpeningHours(place.openingHours, i18n.language, t)}</span>
                          </div>
                        )}

                        {/* Phone */}
                        {place.phone && (
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <Phone className="h-4 w-4 text-green-600 shrink-0" />
                            <a href={`tel:${place.phone}`} className="text-green-600 hover:underline">
                              {place.phone}
                            </a>
                          </div>
                        )}

                        {/* Website */}
                        {place.website && (
                          <div className="flex items-center gap-2 text-sm mb-3">
                            <Globe className="h-4 w-4 text-blue-600 shrink-0" />
                            <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {t('place.website')}
                            </a>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mb-3">
                          <Button
                            size="sm"
                            className="gap-2 bg-primary hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (place.latitude && place.longitude) {
                                if (userLocation) {
                                  // Show route on map
                                  setRouteToPlaceId(place.id);
                                  setSelectedPlaceId(null);
                                  if (!showMap) setShowMap(true);
                                } else {
                                  // Get location first, then show route
                                  toast.info(t('messages.getting_your_location'));
                                  if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition(
                                      (position) => {
                                        setUserLocation({
                                          latitude: position.coords.latitude,
                                          longitude: position.coords.longitude,
                                        });
                                        setRouteToPlaceId(place.id);
                                        setSelectedPlaceId(null);
                                        if (!showMap) setShowMap(true);
                                      },
                                      () => {
                                        // Fallback to Google Maps if location fails
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`, '_blank');
                                      },
                                      { enableHighAccuracy: true, timeout: 10000 }
                                    );
                                  } else {
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`, '_blank');
                                  }
                                }
                              } else {
                                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, '_blank');
                              }
                            }}
                          >
                            <Navigation className="h-4 w-4" />
                            {t('ui.directions')}
                          </Button>
                          <Button
                            size="sm"
                            variant={isFavorite(place.id) ? "default" : "outline"}
                            className={cn("gap-2", isFavorite(place.id) && "bg-primary")}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite({
                                id: place.id,
                                name: place.name,
                                address: place.address,
                                image: place.images[0],
                                rating: place.rating,
                                category: place.category,
                              });
                              toast.success(isFavorite(place.id) ? t('messages.removed_favorite') : t('messages.saved_favorite'));
                            }}
                          >
                            <Bookmark className={cn("h-4 w-4", isFavorite(place.id) && "fill-current")} />
                            {isFavorite(place.id) ? t('ui.saved') : t('ui.save')}
                          </Button>
                        </div>

                        {/* Image Gallery */}
                        {place.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto">
                            {place.images.map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt={place.name}
                                className="h-16 w-20 object-cover rounded-lg shrink-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                  </div>
                </ScrollArea>

                {/* Scroll Buttons */}
                {showScrollButtons && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full shadow-md transition-opacity",
                        canScrollUp ? "opacity-100" : "opacity-30 pointer-events-none"
                      )}
                      onClick={scrollUp}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-full shadow-md transition-opacity",
                        canScrollDown ? "opacity-100" : "opacity-30 pointer-events-none"
                      )}
                      onClick={scrollDown}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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
              <div className="p-4 border-t border-border shrink-0 bg-card">
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
                    className="h-10 w-10"
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
                      <Button variant="outline" size="icon" className="h-10 w-10">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3">
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium mb-1">{t('chatbot.tts_voice') || 'Voice'}</div>
                          <Select value={selectedVoiceName || ''} onValueChange={(v) => setSelectedVoiceName(v || null)}>
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder={selectedVoiceName || (ttsLanguage === 'vi-VN' ? 'Tiếng Việt' : 'English')} />
                            </SelectTrigger>
                            <SelectContent>
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
                          <div className="text-sm font-medium">{t('chatbot.prefer_backend_tts') || 'Prefer backend TTS'}</div>
                          <Switch checked={preferBackendTts} onCheckedChange={(v: any) => setPreferBackendTts(Boolean(v))} />
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-1 flex items-center justify-between">
                            <span>{t('chatbot.tts_rate') || 'Rate'}</span>
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
                            <span>{t('chatbot.tts_pitch') || 'Pitch'}</span>
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
                            <span>{t('chatbot.tts_volume') || 'Volume'}</span>
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
                    className="h-10 w-10"
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
                    placeholder={t('chatbot.placeholder')}
                    className="flex-1 min-w-0 rounded-full"
                    disabled={isLoading}
                  />

                  <div className="w-24">
                    <Select value={ttsLanguage} onValueChange={(v) => setTtsLanguage(v)}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder={ttsLanguage === 'vi-VN' ? 'Tiếng Việt' : 'English'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi-VN">Tiếng Việt</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="rounded-full px-6" disabled={isLoading}>
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
                      onClick={() => place.id && navigate(`/place/${place.id}`)}
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
