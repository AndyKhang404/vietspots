import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  places?: Place[];
}

interface Place {
  name: string;
  location: string;
  description: string;
}

const sampleResponses: Record<string, { text: string; places?: Place[] }> = {
  "biển": {
    text: "Dưới đây là một số bãi biển tuyệt đẹp ở Việt Nam mà bạn nên ghé thăm:",
    places: [
      { name: "Bãi biển Mỹ Khê", location: "Đà Nẵng", description: "Một trong những bãi biển đẹp nhất hành tinh" },
      { name: "Bãi biển Nha Trang", location: "Khánh Hòa", description: "Thành phố biển sôi động với nhiều hoạt động" },
      { name: "Phú Quốc", location: "Kiên Giang", description: "Đảo ngọc với bãi cát trắng mịn" },
    ]
  },
  "núi": {
    text: "Việt Nam có nhiều vùng núi tuyệt đẹp:",
    places: [
      { name: "Sa Pa", location: "Lào Cai", description: "Ruộng bậc thang và văn hóa dân tộc" },
      { name: "Đà Lạt", location: "Lâm Đồng", description: "Thành phố ngàn hoa với khí hậu mát mẻ" },
      { name: "Hà Giang", location: "Hà Giang", description: "Cao nguyên đá hùng vĩ" },
    ]
  },
  "lịch sử": {
    text: "Những điểm đến lịch sử nổi tiếng:",
    places: [
      { name: "Hoàng thành Thăng Long", location: "Hà Nội", description: "Di sản văn hóa thế giới UNESCO" },
      { name: "Cố đô Huế", location: "Thừa Thiên Huế", description: "Kinh đô triều Nguyễn với nhiều lăng tẩm" },
      { name: "Phố cổ Hội An", location: "Quảng Nam", description: "Thương cảng cổ được bảo tồn nguyên vẹn" },
    ]
  },
  default: {
    text: "Xin chào! Tôi là VietSpots Bot. Hãy cho tôi biết bạn thích du lịch kiểu nào? (biển, núi, lịch sử, ẩm thực...)",
  }
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Xin chào! Tôi là VietSpots Bot 🎒 Hãy cho tôi biết bạn muốn đi du lịch kiểu nào nhé!",
      isBot: true,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isBot: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const lowerInput = input.toLowerCase();
      let response = sampleResponses.default;

      for (const key of Object.keys(sampleResponses)) {
        if (lowerInput.includes(key)) {
          response = sampleResponses[key];
          break;
        }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        isBot: true,
        places: response.places,
      };

      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-110",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">VietSpots Bot</h3>
                <p className="text-xs text-primary-foreground/70">Luôn sẵn sàng hỗ trợ</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.isBot ? "justify-start" : "justify-end"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      message.isBot
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.places && (
                      <div className="mt-3 space-y-2">
                        {message.places.map((place, index) => (
                          <div
                            key={index}
                            className="bg-card rounded-lg p-3 border border-border"
                          >
                            <h4 className="font-semibold text-sm text-foreground">{place.name}</h4>
                            <p className="text-xs text-primary">{place.location}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {place.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl px-4 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Đang gõ...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
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
                className="flex-1"
              />
              <Button type="submit" size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
