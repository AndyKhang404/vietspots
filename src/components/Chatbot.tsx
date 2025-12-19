import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, MapPin, Loader2, Phone, Globe, Navigation, Star, ChevronUp, ChevronDown, MessageSquare, FileText, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFavorites } from "@/contexts/FavoritesContext";
import { allPlaces } from "@/data/places";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Mock place results based on allPlaces data
const mockPlaceResults: PlaceResult[] = allPlaces.slice(0, 3).map((place) => ({
  id: place.id,
  name: place.name,
  address: `${place.location}, Việt Nam`,
  phone: "0263 3503 535",
  website: "https://vietspots.com",
  rating: place.rating,
  gps: `${(10.7 + Math.random() * 0.5).toFixed(6)}, ${(106.6 + Math.random() * 0.2).toFixed(6)}`,
  images: [place.image],
}));

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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Show mock place results when user searches
    if (input.toLowerCase().includes("cafe") || input.toLowerCase().includes("quán") || input.toLowerCase().includes("địa điểm")) {
      setPlaceResults(mockPlaceResults);
    }

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error("Quá nhiều yêu cầu, vui lòng thử lại sau.");
        } else if (response.status === 402) {
          toast.error("Hết hạn mức AI, vui lòng nạp thêm credits.");
        } else {
          toast.error(errorData.error || "Có lỗi xảy ra, vui lòng thử lại.");
        }
        setIsLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (nextChunk: string) => {
        assistantContent += nextChunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id === "streaming") {
            return prev.map((m) =>
              m.id === "streaming" ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { id: "streaming", role: "assistant", content: assistantContent }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === "streaming"
            ? { ...m, id: Date.now().toString() }
            : m
        )
      );
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const savedPlaces = allPlaces.filter((p) => favorites.includes(p.id));

  const tabs = [
    { id: "chat" as const, label: "Chatbot", icon: MessageSquare },
    { id: "form" as const, label: "Điền Form", icon: FileText },
    { id: "saved" as const, label: "Đã lưu", icon: Bookmark },
  ];

  return (
    <>
      {/* Toggle Button - Fixed on right edge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-l-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:w-14",
          isOpen ? "right-[400px] lg:right-[450px]" : "right-0"
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>

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
              {/* Place Results & Messages */}
              <div className="relative flex-1 min-h-0">
                <ScrollArea className="h-full min-h-0" ref={scrollRef}>
                  <div className="p-4 space-y-4">
                    {/* Place Result Cards */}
                    {placeResults.map((place, index) => (
                      <div
                        key={place.id}
                        className="border border-border rounded-xl p-4 bg-card animate-in fade-in slide-in-from-right-4"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {/* Place Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-primary leading-tight">
                            {place.name}
                          </h3>
                          <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold shrink-0">
                            <Star className="h-3 w-3 fill-current" />
                            {place.rating}
                          </span>
                        </div>

                        {/* Address */}
                        <div className="flex items-start gap-2 text-sm mb-2">
                          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{place.address}</span>
                        </div>

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
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`, '_blank')}
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
                            "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary text-secondary-foreground rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="flex justify-start">
                        <div className="bg-secondary rounded-2xl px-4 py-3 flex items-center gap-2 rounded-bl-md">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Đang suy nghĩ...</span>
                        </div>
                      </div>
                    )}
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
                    handleSend();
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
