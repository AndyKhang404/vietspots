import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Search, TrendingUp, Sparkles, Loader2, MapPin, History, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useVietSpotAPI";
import { transformPlace, fallbackPlaces, categories as defaultCategories, Place } from "@/data/places";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import vietSpotAPI from "@/api/vietspot";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Index() {
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [recommendedPlaces, setRecommendedPlaces] = useState<Place[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const { data: categoriesResponse } = useCategories();

  // Get user's current GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setLocationError("Bật vị trí để xem địa điểm gần bạn");
          // Default to Ho Chi Minh City if geolocation fails
          setUserLocation({ lat: 10.8231, lon: 106.6297 });
        }
      );
    } else {
      setLocationError("Trình duyệt không hỗ trợ định vị");
      setUserLocation({ lat: 10.8231, lon: 106.6297 });
    }
  }, []);

  // Fetch recommended places - using GPS city and rating > 4
  useEffect(() => {
    if (!userLocation) return;
    
    const fetchRecommended = async () => {
      setPlacesLoading(true);
      try {
        // Use GPS location to get places with rating > 4 in user's area
        const places = await vietSpotAPI.getPlaces({ 
          limit: 20,
          lat: userLocation.lat,
          lon: userLocation.lon,
          maxDistance: 100, // 100km radius to cover the city
          minRating: 4, // Only places with rating > 4
          sortBy: 'rating',
        });
        
        if (places.length > 0) {
          setRecommendedPlaces(places.slice(0, 10).map(transformPlace));
        } else {
          // Fallback: get top rated places without location filter
          const fallbackData = await vietSpotAPI.getPlaces({
            limit: 10,
            minRating: 4,
            sortBy: 'rating',
          });
          if (fallbackData.length > 0) {
            setRecommendedPlaces(fallbackData.slice(0, 10).map(transformPlace));
          } else {
            setRecommendedPlaces(fallbackPlaces.slice(0, 10));
          }
        }
      } catch (error) {
        console.error("Error fetching recommended places:", error);
        setRecommendedPlaces(fallbackPlaces.slice(0, 10));
      } finally {
        setPlacesLoading(false);
      }
    };
    
    fetchRecommended();
  }, [userLocation]);

  // Fetch nearby places when we have user location
  useEffect(() => {
    if (!userLocation) return;
    
    const fetchNearby = async () => {
      setNearbyLoading(true);
      try {
        const places = await vietSpotAPI.getPlaces({ 
          limit: 20,
          lat: userLocation.lat,
          lon: userLocation.lon,
          maxDistance: 50, // 50km radius
          minRating: 0.1,
          sortBy: 'distance',
        });
        
        if (places.length > 0) {
          setNearbyPlaces(places.slice(0, 10).map(transformPlace));
        } else {
          // Try without distance filter
          const fallbackPlacesData = await vietSpotAPI.getPlaces({
            limit: 10,
            minRating: 0.1,
          });
          setNearbyPlaces(fallbackPlacesData.slice(0, 10).map(transformPlace));
        }
      } catch (error) {
        console.error("Error fetching nearby places:", error);
        setNearbyPlaces([]);
      } finally {
        setNearbyLoading(false);
      }
    };
    
    fetchNearby();
  }, [userLocation]);

  const handleRefreshLocation = () => {
    setNearbyLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setLocationError("Không thể lấy vị trí");
          setNearbyLoading(false);
        }
      );
    }
  };

  const categories = categoriesResponse && categoriesResponse.length > 0
    ? categoriesResponse.map((cat, i) => ({
        id: cat,
        label: cat,
        emoji: defaultCategories[i]?.emoji || "📍",
      }))
    : defaultCategories;

  const PlacesList = ({ 
    places, 
    loading, 
    emptyMessage 
  }: { 
    places: Place[]; 
    loading: boolean; 
    emptyMessage: string;
  }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    if (places.length === 0) {
      return (
        <div className="bg-muted/50 rounded-xl p-8 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {places.map((place, index) => (
            <div
              key={place.id}
              className="w-[200px] shrink-0 animate-in fade-in slide-in-from-right-4"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/place/${place.id}`)}
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

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

        {/* Recommended For You */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Đề xuất cho bạn</h3>
            </div>
            <button 
              onClick={() => navigate('/search?sortBy=rating')}
              className="text-sm text-primary hover:underline font-medium"
            >
              {t('home.viewAll')} →
            </button>
          </div>
          <PlacesList 
            places={recommendedPlaces} 
            loading={placesLoading} 
            emptyMessage="🔍 Đang tải địa điểm..."
          />
        </div>

        {/* Nearby Places */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Địa điểm gần bạn</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefreshLocation}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
          </div>
          {locationError && !nearbyLoading && nearbyPlaces.length === 0 ? (
            <div 
              className="bg-muted/50 rounded-xl p-8 text-center cursor-pointer hover:bg-muted transition-colors"
              onClick={handleRefreshLocation}
            >
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">{locationError}</p>
              <p className="text-sm text-primary font-medium">Nhấn để cấp quyền</p>
            </div>
          ) : (
            <PlacesList 
              places={nearbyPlaces} 
              loading={nearbyLoading} 
              emptyMessage="📍 Không tìm thấy địa điểm gần bạn"
            />
          )}
        </div>

        {/* Featured Places (Grid view) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t('home.featured')}</h3>
            </div>
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
              {recommendedPlaces.slice(0, 8).map((place, index) => (
                <div
                  key={place.id}
                  className="animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/place/${place.id}`)}
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