import { useState } from "react";
import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/contexts/FavoritesContext";
import { allPlaces } from "@/data/places";

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
  const { toggleFavorite, isFavorite } = useFavorites();

  const filteredPlaces = allPlaces.filter((place) => {
    const matchesSearch =
      place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || place.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

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
              autoFocus
            />
          </div>
          <Button variant="outline" size="icon">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {filters.map((filter, index) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 animate-in fade-in slide-in-from-left-2 ${
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground scale-105"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
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
          {filteredPlaces.map((place, index) => (
            <div
              key={place.id}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PlaceCard
                {...place}
                isFavorite={isFavorite(place.id)}
                onFavoriteToggle={toggleFavorite}
              />
            </div>
          ))}
        </div>

        {filteredPlaces.length === 0 && (
          <div className="text-center py-12 animate-in fade-in">
            <p className="text-muted-foreground">Không tìm thấy địa điểm nào</p>
          </div>
        )}
      </div>

      <Chatbot />
    </Layout>
  );
}
