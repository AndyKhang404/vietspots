import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Heart } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { allPlaces } from "@/data/places";

export default function Favorites() {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  
  const favoritePlaces = allPlaces.filter((place) => favorites.includes(place.id));

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="h-5 w-5 text-primary fill-primary" />
          <h2 className="text-xl font-bold text-foreground">Yêu thích</h2>
          <span className="ml-auto text-sm text-muted-foreground">
            {favorites.length} địa điểm
          </span>
        </div>

        {favoritePlaces.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {favoritePlaces.map((place, index) => (
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
        ) : (
          <div className="text-center py-12 animate-in fade-in zoom-in-95">
            <div className="h-20 w-20 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Heart className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              Chưa có địa điểm yêu thích
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Nhấn vào biểu tượng ❤️ để lưu những địa điểm bạn muốn ghé thăm
            </p>
          </div>
        )}
      </div>

      <Chatbot />
    </Layout>
  );
}
