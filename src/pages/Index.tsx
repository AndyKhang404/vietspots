import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Search, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlaces, useCategories } from "@/hooks/useVietSpotAPI";
import { transformPlace, fallbackPlaces, categories as defaultCategories } from "@/data/places";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Index() {
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch places from API
  const { data: placesResponse, isLoading: placesLoading } = usePlaces({ limit: 8 });
  const { data: categoriesResponse } = useCategories();

  // Transform API data or use fallback
  const featuredPlaces = placesResponse && placesResponse.length > 0
    ? placesResponse.map(transformPlace)
    : fallbackPlaces.slice(0, 8);

  const categories = categoriesResponse && categoriesResponse.length > 0
    ? categoriesResponse.map((cat, i) => ({
        id: cat,
        label: cat,
        emoji: defaultCategories[i]?.emoji || "📍",
      }))
    : defaultCategories;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary via-primary to-accent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0cy0yLTItMi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">
                {t('home.welcome')}, {user?.user_metadata?.full_name || t('auth.guest')}!
              </span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Khám phá Việt Nam 🇻🇳
            </h2>
            <p className="text-lg opacity-90 mb-6 max-w-lg">
              {t('home.explore')}
            </p>
            <div className="relative max-w-md" onClick={() => navigate('/search')}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder')}
                className="pl-12 h-12 text-base bg-card text-foreground cursor-pointer rounded-xl"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Danh mục phổ biến</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat, index) => (
              <button
                key={cat.id}
                className="flex items-center gap-2 px-5 py-3 bg-card border border-border rounded-xl text-sm font-medium text-foreground whitespace-nowrap hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 hover:scale-105 hover:shadow-lg animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/search?category=${cat.id}`)}
              >
                <span className="text-lg">{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured Places */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">{t('home.featured')}</h3>
            <button 
              onClick={() => navigate('/search')}
              className="text-sm text-primary hover:underline font-medium"
            >
              {t('home.viewAll')} →
            </button>
          </div>

          {placesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {featuredPlaces.map((place, index) => (
                <div
                  key={place.id}
                  className="animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PlaceCard
                    {...place}
                    isFavorite={isFavorite(place.id)}
                    onFavoriteToggle={() => toggleFavorite({
                      id: place.id,
                      name: place.name,
                      address: place.location,
                      image: place.image,
                      rating: place.rating,
                      category: place.category,
                    })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Chatbot />
    </Layout>
  );
}
