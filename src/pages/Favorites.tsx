import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Heart } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { allPlaces } from "@/data/places";
import { useTranslation } from "react-i18next";

export default function Favorites() {
  const { t } = useTranslation();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  
  const favoritePlaces = allPlaces.filter((place) => favorites.includes(place.id));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-primary fill-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('favorites.title')}</h1>
              <p className="text-muted-foreground">Những địa điểm bạn đã lưu</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground bg-secondary px-4 py-2 rounded-full">
            {favorites.length} địa điểm
          </span>
        </div>

        {favoritePlaces.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
            {favoritePlaces.map((place, index) => (
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
        ) : (
          <div className="text-center py-20 animate-in fade-in zoom-in-95">
            <div className="h-24 w-24 rounded-full bg-secondary mx-auto mb-6 flex items-center justify-center">
              <Heart className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('favorites.empty')}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Nhấn vào biểu tượng ❤️ để lưu những địa điểm bạn muốn ghé thăm
            </p>
          </div>
        )}
      </div>

      <Chatbot />
    </Layout>
  );
}
