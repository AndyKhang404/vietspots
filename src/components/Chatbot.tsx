import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Send, X, MapPin, Loader2, Phone, Globe, Navigation, Star, 
  ChevronUp, ChevronDown, MessageSquare, FileText, Bookmark, 
  Map as MapIcon, Clock, MapPinned, Filter, LocateFixed, Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFavorites } from "@/contexts/FavoritesContext";
import { fallbackPlaces, transformPlace } from "@/data/places";
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
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
function formatOpeningHours(hours: string): string {
  try {
    // Check if it's a JSON-like string
    if (hours.startsWith('{') || hours.startsWith("{'")) {
      // Parse the JSON-like string (Python dict format with single quotes)
      const cleaned = hours.replace(/'/g, '"');
      const parsed = JSON.parse(cleaned);
      
      // Get today's day name in Vietnamese
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const today = days[new Date().getDay()];
      
      // Find today's hours
      if (parsed[today]) {
        return `Hôm nay: ${parsed[today]}`;
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
    id: place.place_id,
    name: place.name,
    address: place.address || `${place.city || ""}, Việt Nam`,
    phone: place.phone,
    website: place.website,
    rating: place.rating || 0,
    gps: place.latitude && place.longitude ? `${place.latitude}, ${place.longitude}` : undefined,
    images: place.images || (place.image_url ? [place.image_url] : []),
    latitude: place.latitude,
    longitude: place.longitude,
    openingHours: place.opening_hours,
    totalComments: place.total_comments,
    matchingScore: Math.floor(Math.random() * 30 + 70), // Placeholder - backend should provide this
    distance,
    category: place.category,
    description: place.description,
  };
}

export default function Chatbot() {
  const { t } = useTranslation();
  const { favorites } = useFavorites();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "form" | "saved">("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Xin chào! 👋 Tôi là VietSpots Bot - trợ lý du lịch của bạn. Hãy cho tôi biết bạn muốn khám phá Việt Nam như thế nào nhé! 🎒",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [selectedGps, setSelectedGps] = useState<string | null>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [maxDistance, setMaxDistance] = useState<number>(50);

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
          toast.success("Đã lấy vị trí của bạn!");
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí.");
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toast.error("Trình duyệt không hỗ trợ định vị.");
      setIsGettingLocation(false);
    }
  }, []);

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

        if (placesData.length > 0) {
          setPlaceResults(placesData.map(p => transformToPlaceResult(p, userLocation || undefined)));
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

        if (data.places && data.places.length > 0) {
          setPlaceResults(data.places.map((p: PlaceInfo) => transformToPlaceResult(p, userLocation || undefined)));
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Không thể kết nối. Vui lòng thử lại.");
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.", isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const savedPlaces = fallbackPlaces.filter((p) => favorites.includes(p.id));

  const tabs = [
    { id: "chat" as const, label: "Chatbot", icon: MessageSquare },
    { id: "form" as const, label: "Điền Form", icon: FileText },
    { id: "saved" as const, label: "Đã lưu", icon: Bookmark },
  ];

  // Filter place results
  const filteredPlaceResults = placeResults.filter(place => {
    if (categoryFilter !== "all" && place.category !== categoryFilter) return false;
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

  // Get unique categories from results
  const availableCategories = [...new Set(placeResults.map(p => p.category).filter(Boolean))] as string[];

  return (
    <>
      {/* Map Panel - Shows when chatbot is open and has places */}
      {isOpen && showMap && mapMarkers.length > 0 && (
        <div
          className={cn(
            "fixed top-0 z-30 h-screen bg-card border-l border-border shadow-xl transition-all duration-300",
            "right-[400px] lg:right-[450px] w-[350px] lg:w-[400px]"
          )}
        >
          <div className="h-full flex flex-col">
            {/* Map Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Bản đồ</span>
                <Badge variant="secondary" className="text-xs">
                  {mapMarkers.length} địa điểm
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
          isOpen 
            ? showMap && mapMarkers.length > 0 
              ? "right-[750px] lg:right-[850px]" 
              : "right-[400px] lg:right-[450px]" 
            : "right-0"
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>

      {/* Map Toggle Button - Shows when map is hidden */}
      {isOpen && !showMap && mapMarkers.length > 0 && (
        <button
          onClick={() => setShowMap(true)}
          className="fixed top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-l-xl bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:w-14 right-[400px] lg:right-[450px]"
          style={{ marginTop: "60px" }}
        >
          <MapIcon className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-40 h-screen w-[400px] lg:w-[450px] bg-card border-l border-border shadow-2xl transition-transform duration-300 flex flex-col overflow-hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
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
                  {userLocation ? "Đã định vị" : "Vị trí"}
                </Button>

                {/* Filters Popover */}
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Filter className="h-4 w-4" />
                      Bộ lọc
                      {(categoryFilter !== "all" || minRating > 0 || maxDistance < 50) && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                          !
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Bộ lọc nâng cao</h4>
                      
                      {/* Category Filter */}
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Danh mục</label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Tất cả" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            {availableCategories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Min Rating */}
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground flex items-center justify-between">
                          <span>Rating tối thiểu</span>
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
                            <span>Khoảng cách tối đa</span>
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
                          setCategoryFilter("all");
                          setMinRating(0);
                          setMaxDistance(50);
                        }}
                      >
                        Đặt lại bộ lọc
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Active filter badges */}
                {categoryFilter !== "all" && (
                  <Badge variant="outline" className="text-xs">
                    {categoryFilter}
                  </Badge>
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
                    {messages.map((message, index) => (
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

                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex justify-start">
                        <div className="bg-secondary rounded-2xl px-4 py-3 flex items-center gap-2 rounded-bl-md">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">VietSpots AI đang suy nghĩ...</span>
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
                              {place.totalComments} đánh giá
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
                            <span className="text-muted-foreground">{formatOpeningHours(place.openingHours)}</span>
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
                              Website
                            </a>
                          </div>
                        )}

                        {/* Directions Button */}
                        <Button 
                          size="sm" 
                          className="gap-2 bg-primary hover:bg-primary/90 mb-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (place.latitude && place.longitude) {
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`, '_blank');
                            } else {
                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, '_blank');
                            }
                          }}
                        >
                          <Navigation className="h-4 w-4" />
                          Chỉ đường
                        </Button>

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
                  className="flex gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 rounded-full"
                    disabled={isLoading}
                  />
                  <Button type="submit" className="rounded-full px-6" disabled={isLoading}>
                    Gửi
                  </Button>
                </form>
              </div>
            </>
          )}

          {activeTab === "form" && (
            <div className="flex-1 p-6">
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Điền Form</h3>
                <p className="text-sm text-muted-foreground">
                  Tính năng đang được phát triển
                </p>
              </div>
            </div>
          )}

          {activeTab === "saved" && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {savedPlaces.length > 0 ? (
                  savedPlaces.map((place, index) => (
                    <div
                      key={place.id}
                      className="border border-border rounded-xl p-4 bg-card animate-in fade-in slide-in-from-right-4"
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
                    <h3 className="font-semibold text-foreground mb-2">Chưa có địa điểm đã lưu</h3>
                    <p className="text-sm text-muted-foreground">
                      Nhấn ❤️ để lưu địa điểm yêu thích
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
