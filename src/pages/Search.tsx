import { useState } from "react";
import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const allPlaces = [
  {
    id: "1",
    name: "Vịnh Hạ Long",
    location: "Quảng Ninh",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    rating: 4.9,
    description: "Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi hùng vĩ",
    category: "beach",
  },
  {
    id: "2",
    name: "Phố cổ Hội An",
    location: "Quảng Nam",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    rating: 4.8,
    description: "Thương cảng cổ với kiến trúc độc đáo và đèn lồng rực rỡ",
    category: "historical",
  },
  {
    id: "3",
    name: "Sa Pa",
    location: "Lào Cai",
    image: "https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800",
    rating: 4.7,
    description: "Ruộng bậc thang tuyệt đẹp và văn hóa dân tộc phong phú",
    category: "mountain",
  },
  {
    id: "4",
    name: "Đà Lạt",
    location: "Lâm Đồng",
    image: "https://images.unsplash.com/photo-1555921015-5532091f6026?w=800",
    rating: 4.6,
    description: "Thành phố ngàn hoa với khí hậu mát mẻ quanh năm",
    category: "city",
  },
  {
    id: "5",
    name: "Bãi biển Mỹ Khê",
    location: "Đà Nẵng",
    image: "https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=800",
    rating: 4.8,
    description: "Một trong những bãi biển đẹp nhất hành tinh",
    category: "beach",
  },
  {
    id: "6",
    name: "Phú Quốc",
    location: "Kiên Giang",
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800",
    rating: 4.7,
    description: "Đảo ngọc với bãi cát trắng mịn và hải sản tươi ngon",
    category: "beach",
  },
];

const filters = [
  { id: "all", label: "Tất cả" },
  { id: "beach", label: "Biển" },
  { id: "mountain", label: "Núi" },
  { id: "city", label: "Thành phố" },
  { id: "historical", label: "Lịch sử" },
];

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredPlaces = allPlaces.filter((place) => {
    const matchesSearch =
      place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || place.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm địa điểm..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredPlaces.length} kết quả
          </p>
        </div>

        {/* Places Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              {...place}
              isFavorite={favorites.includes(place.id)}
              onFavoriteToggle={toggleFavorite}
            />
          ))}
        </div>

        {filteredPlaces.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Không tìm thấy địa điểm nào</p>
          </div>
        )}
      </div>

      <Chatbot />
    </Layout>
  );
}
