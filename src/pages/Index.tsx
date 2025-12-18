import { useState } from "react";
import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const featuredPlaces = [
  {
    id: "1",
    name: "Vịnh Hạ Long",
    location: "Quảng Ninh",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    rating: 4.9,
    description: "Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi hùng vĩ",
  },
  {
    id: "2",
    name: "Phố cổ Hội An",
    location: "Quảng Nam",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    rating: 4.8,
    description: "Thương cảng cổ với kiến trúc độc đáo và đèn lồng rực rỡ",
  },
  {
    id: "3",
    name: "Sa Pa",
    location: "Lào Cai",
    image: "https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800",
    rating: 4.7,
    description: "Ruộng bậc thang tuyệt đẹp và văn hóa dân tộc phong phú",
  },
  {
    id: "4",
    name: "Đà Lạt",
    location: "Lâm Đồng",
    image: "https://images.unsplash.com/photo-1555921015-5532091f6026?w=800",
    rating: 4.6,
    description: "Thành phố ngàn hoa với khí hậu mát mẻ quanh năm",
  },
];

const categories = [
  { id: "beach", label: "Biển đảo", emoji: "🏖️" },
  { id: "mountain", label: "Núi rừng", emoji: "🏔️" },
  { id: "city", label: "Thành phố", emoji: "🏙️" },
  { id: "historical", label: "Lịch sử", emoji: "🏛️" },
  { id: "food", label: "Ẩm thực", emoji: "🍜" },
];

export default function Index() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-6 mb-6 text-primary-foreground">
          <h2 className="text-2xl font-bold mb-2">Khám phá Việt Nam</h2>
          <p className="text-sm opacity-90 mb-4">
            Tìm kiếm những địa điểm tuyệt vời cho chuyến đi của bạn
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm địa điểm..."
              className="pl-10 bg-card text-foreground"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Danh mục</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm font-medium text-secondary-foreground whitespace-nowrap hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured Places */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Địa điểm nổi bật</h3>
          <div className="grid grid-cols-2 gap-4">
            {featuredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                {...place}
                isFavorite={favorites.includes(place.id)}
                onFavoriteToggle={toggleFavorite}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </Layout>
  );
}
