import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFavorites } from "@/contexts/FavoritesContext";
import { allPlaces, categories } from "@/data/places";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigate = useNavigate();
  const featuredPlaces = allPlaces.slice(0, 4);

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary via-primary to-accent rounded-2xl p-6 mb-6 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0cy0yLTItMi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative">
            <h2 className="text-2xl font-bold mb-2">Khám phá Việt Nam 🇻🇳</h2>
            <p className="text-sm opacity-90 mb-4">
              Tìm kiếm những địa điểm tuyệt vời cho chuyến đi của bạn
            </p>
            <div className="relative" onClick={() => navigate('/search')}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm địa điểm..."
                className="pl-10 bg-card text-foreground cursor-pointer"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Danh mục</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat, index) => (
              <button
                key={cat.id}
                className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm font-medium text-secondary-foreground whitespace-nowrap hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105 animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate('/search')}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured Places */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Địa điểm nổi bật</h3>
            <button 
              onClick={() => navigate('/search')}
              className="text-sm text-primary hover:underline"
            >
              Xem tất cả
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {featuredPlaces.map((place, index) => (
              <div
                key={place.id}
                className="animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <PlaceCard
                  {...place}
                  isFavorite={isFavorite(place.id)}
                  onFavoriteToggle={toggleFavorite}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Chatbot />
    </Layout>
  );
}
