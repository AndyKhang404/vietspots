import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Loader2,
  Plus,
  Trash2,
  Share2,
  Save,
  Clock,
  Navigation,
  Sparkles,
  List,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useItinerary, SavedItinerary } from "@/hooks/useItinerary";
import { DayItinerary } from "@/api/vietspot";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PREFERENCE_OPTIONS = [
  { value: "history", label: "Lịch sử" },
  { value: "nature", label: "Thiên nhiên" },
  { value: "food", label: "Ẩm thực" },
  { value: "shopping", label: "Mua sắm" },
  { value: "culture", label: "Văn hóa" },
  { value: "adventure", label: "Phiêu lưu" },
  { value: "relax", label: "Nghỉ dưỡng" },
  { value: "photography", label: "Chụp ảnh" },
];

const BUDGET_OPTIONS = [
  { value: "low", label: "Tiết kiệm" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao cấp" },
];

export default function Itinerary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    itineraries,
    currentItinerary,
    loading,
    generating,
    fetchItineraries,
    generateItinerary,
    saveItinerary,
    deleteItinerary,
    getShareUrl,
    setCurrentItinerary,
  } = useItinerary();

  const [activeTab, setActiveTab] = useState<"create" | "saved">("create");
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState("medium");
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (user) {
      fetchItineraries();
    }
  }, [user, fetchItineraries]);

  const handleGenerate = async () => {
    if (!destination.trim()) {
      toast.error("Vui lòng nhập điểm đến");
      return;
    }

    await generateItinerary({
      destination,
      days,
      budget,
      preferences: selectedPreferences,
    });
  };

  const handleSave = async () => {
    if (!currentItinerary) return;

    if (!title.trim()) {
      toast.error("Vui lòng nhập tên lịch trình");
      return;
    }

    await saveItinerary({
      title,
      destination,
      days,
      budget,
      preferences: selectedPreferences,
      itinerary_data: currentItinerary,
      is_public: false,
    });
  };

  const handleShare = async (itinerary: SavedItinerary) => {
    const url = getShareUrl(itinerary);
    if (url) {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết chia sẻ!");
    } else {
      toast.error("Lịch trình này chưa được công khai");
    }
  };

  const togglePreference = (pref: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Lập Lịch Trình
              </h1>
              <p className="text-muted-foreground">
                Tạo lịch trình du lịch tự động với AI
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "create" ? "default" : "outline"}
            onClick={() => setActiveTab("create")}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Tạo mới
          </Button>
          <Button
            variant={activeTab === "saved" ? "default" : "outline"}
            onClick={() => setActiveTab("saved")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            Đã lưu ({itineraries.length})
          </Button>
        </div>

        {activeTab === "create" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - Form */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-xl font-bold mb-6">Thông tin chuyến đi</h2>

              <div className="space-y-4">
                {/* Destination */}
                <div>
                  <Label htmlFor="destination">Điểm đến</Label>
                  <Input
                    id="destination"
                    placeholder="Ví dụ: Đà Nẵng, Hội An..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                {/* Days */}
                <div>
                  <Label htmlFor="days">Số ngày</Label>
                  <Select
                    value={days.toString()}
                    onValueChange={(v) => setDays(parseInt(v))}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          {d} ngày
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget */}
                <div>
                  <Label>Ngân sách</Label>
                  <div className="flex gap-2 mt-1.5">
                    {BUDGET_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={budget === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBudget(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Preferences */}
                <div>
                  <Label>Sở thích</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {PREFERENCE_OPTIONS.map((pref) => (
                      <Badge
                        key={pref.value}
                        variant={
                          selectedPreferences.includes(pref.value)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => togglePreference(pref.value)}
                      >
                        {pref.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full gap-2 mt-4"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang tạo lịch trình...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Tạo lịch trình AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right - Result */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Lịch trình</h2>
                {currentItinerary && user && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Tên lịch trình..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-40"
                    />
                    <Button onClick={handleSave} size="sm" className="gap-1.5">
                      <Save className="h-4 w-4" />
                      Lưu
                    </Button>
                  </div>
                )}
              </div>

              {currentItinerary ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-6 pr-4">
                    {currentItinerary.map((day: DayItinerary) => (
                      <div key={day.day} className="space-y-3">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Ngày {day.day}
                          {day.date && (
                            <span className="text-muted-foreground font-normal text-sm">
                              ({day.date})
                            </span>
                          )}
                        </h3>

                        <div className="space-y-3 ml-7 border-l-2 border-primary/20 pl-4">
                          {day.activities.map((activity, i) => (
                            <div
                              key={i}
                              className="bg-muted/50 rounded-xl p-4"
                            >
                              <div className="flex items-center gap-2 text-sm text-primary font-medium mb-1">
                                <Clock className="h-4 w-4" />
                                {activity.time}
                              </div>
                              <h4 className="font-semibold">
                                {activity.place.name}
                              </h4>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {activity.place.address}
                              </div>
                              {activity.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {activity.notes}
                                </p>
                              )}
                              <Button
                                variant="link"
                                size="sm"
                                className="mt-2 p-0 h-auto gap-1.5"
                                onClick={() =>
                                  navigate(`/place/${activity.place.place_id}`)
                                }
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                Xem chi tiết
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    Chưa có lịch trình
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Nhập thông tin chuyến đi và nhấn "Tạo lịch trình AI" để bắt
                    đầu
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Saved Itineraries */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : itineraries.length > 0 ? (
              itineraries.map((itinerary) => (
                <div
                  key={itinerary.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setCurrentItinerary(itinerary.itinerary_data);
                    setTitle(itinerary.title);
                    setDestination(itinerary.destination);
                    setDays(itinerary.days);
                    setBudget(itinerary.budget || "medium");
                    setSelectedPreferences(itinerary.preferences || []);
                    setActiveTab("create");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCurrentItinerary(itinerary.itinerary_data);
                      setTitle(itinerary.title);
                      setDestination(itinerary.destination);
                      setDays(itinerary.days);
                      setBudget(itinerary.budget || "medium");
                      setSelectedPreferences(itinerary.preferences || []);
                      setActiveTab("create");
                    }
                  }}
                  className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg">{itinerary.title}</h3>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleShare(itinerary)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteItinerary(itinerary.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{itinerary.destination}</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>{itinerary.days} ngày</span>
                  </div>

                  {itinerary.preferences.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {itinerary.preferences.slice(0, 3).map((pref) => (
                        <Badge key={pref} variant="secondary" className="text-xs">
                          {PREFERENCE_OPTIONS.find((p) => p.value === pref)?.label ||
                            pref}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Tạo ngày{" "}
                    {new Date(itinerary.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Chưa có lịch trình nào
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Tạo lịch trình đầu tiên của bạn
                </p>
                <Button onClick={() => setActiveTab("create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo lịch trình
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Chatbot />
    </Layout>
  );
}