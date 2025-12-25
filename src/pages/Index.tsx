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
import { transformPlace, categories as defaultCategories, Place } from "@/data/places";
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
  const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { data: categoriesResponse } = useCategories();

  // Reverse geocode to get city name from coordinates
  const getCityFromCoords = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=vi`
      );
      const data = await response.json();

      const rawCity =
        data.address?.city ||
        data.address?.town ||
        data.address?.municipality ||
        data.address?.county ||
        null;

      const state: string | null = data.address?.state || null;

      // Normalize for Vietnam big cities (Nominatim often returns districts like "Thành phố Thủ Đức")
      const normalized = (() => {
        const combined = `${rawCity || ""} ${state || ""}`.toLowerCase();
        if (combined.includes("hồ chí minh") || combined.includes("ho chi minh")) return "Hồ Chí Minh";
        if (combined.includes("hà nội") || combined.includes("ha noi")) return "Hà Nội";
        if (combined.includes("đà nẵng") || combined.includes("da nang")) return "Đà Nẵng";
        return rawCity || state;
      })();

      console.log("Detected city from GPS:", { rawCity, state, normalized, address: data.address });
      return normalized;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  };

  // Get user's current GPS location
  useEffect(() => {
    const getLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const coords = {
              lat: position.coords.latitude,
              lon: position.coords.longitude
            };
            setUserLocation(coords);
            setLocationError(null);

            // Get city name from coordinates
            const city = await getCityFromCoords(coords.lat, coords.lon);
            setUserCity(city);
          },
          (error) => {
            console.log("Geolocation error:", error.message);
            setLocationError(t('messages.enable_location_nearby'));
            // Default to Ho Chi Minh City if geolocation fails
            setUserLocation({ lat: 10.8231, lon: 106.6297 });
            setUserCity("Hồ Chí Minh");
          }
        );
      } else {
        setLocationError(t('messages.browser_no_geolocation'));
        setUserLocation({ lat: 10.8231, lon: 106.6297 });
        setUserCity("Hồ Chí Minh");
      }
    };

    getLocation();
  }, []);

  // Fetch recommended places - prefer city match + rating >= 4
  useEffect(() => {
    // Wait for either userCity OR fallback after location error
    if (!userLocation) return;

    const fetchRecommended = async () => {
      setPlacesLoading(true);
      try {
        let places: any[] = [];

        // If we successfully detected a city, filter by city
        if (userCity) {
          places = await vietSpotAPI.getPlaces({
            limit: 20,
            city: userCity,
            minRating: 4,
            sortBy: "rating",
          });
          console.log("Recommended places for city:", userCity, "found:", places.length);
        }

        // If no city or no results, use GPS location
        if (!places || places.length === 0) {
          places = await vietSpotAPI.getPlaces({
            limit: 20,
            lat: userLocation.lat,
            lon: userLocation.lon,
            maxDistance: 50,
            minRating: 4,
            sortBy: "rating",
          });
          console.log("Recommended places by GPS found:", places.length);
        }

        // Final fallback: get top rated anywhere
        if (!places || places.length === 0) {
          places = await vietSpotAPI.getPlaces({
            limit: 20,
            minRating: 4,
            sortBy: "rating",
          });
          console.log("Recommended places fallback found:", places.length);
        }

        setRecommendedPlaces(places.slice(0, 10).map(transformPlace));
      } catch (error) {
        console.error("Error fetching recommended places:", error);
        setRecommendedPlaces([]);
      } finally {
        setPlacesLoading(false);
      }
    };

    fetchRecommended();
  }, [userLocation, userCity]);

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
    setPlacesLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setUserLocation(coords);
          setLocationError(null);

          // Update city from new coordinates
          const city = await getCityFromCoords(coords.lat, coords.lon);
          setUserCity(city);
        },
        (error) => {
          console.log("Geolocation error:", error.message);
          setLocationError(t('messages.cannot_get_location'));
          setNearbyLoading(false);
          setPlacesLoading(false);
        }
      );
    }
  };

  // Map emoji based on category name (case-insensitive matching)
  const getEmojiForCategory = (category: string): string => {
    const lower = category.toLowerCase();
    if (lower.includes('bảo tàng') || lower.includes('triển lãm')) return '🏛️';
    if (lower.includes('di tích') || lower.includes('lịch sử')) return '🏯';
    if (lower.includes('công viên') || lower.includes('vườn')) return '🌳';
    if (lower.includes('nhà hàng') || lower.includes('quán ăn')) return '🍽️';
    if (lower.includes('cafe') || lower.includes('cà phê')) return '☕';
    if (lower.includes('spa') || lower.includes('massage')) return '💆';
    if (lower.includes('khách sạn') || lower.includes('resort')) return '🏨';
    if (lower.includes('biển') || lower.includes('beach')) return '🏖️';
    if (lower.includes('núi') || lower.includes('mountain')) return '🏔️';
    if (lower.includes('chợ') || lower.includes('market')) return '🛒';
    if (lower.includes('bar') || lower.includes('club')) return '🍸';
    if (lower.includes('chùa') || lower.includes('đền') || lower.includes('temple')) return '🛕';
    if (lower.includes('siêu thị') || lower.includes('mall')) return '🛍️';
    return '📍';
  };

  const categories = categoriesResponse && categoriesResponse.length > 0
    ? categoriesResponse.map((cat) => ({
      id: cat,
      label: cat,
      emoji: getEmojiForCategory(cat),
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
              className="w-[260px] shrink-0 animate-in fade-in slide-in-from-right-4"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/place/${place.id}`)}
            >
              <PlaceCard
                {...place}
                ratingCount={place.ratingCount}
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
              {t('app.tagline')} 🇻🇳
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

        {/* Recommended For You */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t('home.recommended')}</h3>
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
            emptyMessage={t('messages.loading_places')}
          />
        </div>

        {/* Nearby Places */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">{t('home.nearby')}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshLocation}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('common.refresh')}
            </Button>
          </div>
          {locationError && !nearbyLoading && nearbyPlaces.length === 0 ? (
            <div
              className="bg-muted/50 rounded-xl p-8 text-center cursor-pointer hover:bg-muted transition-colors"
              onClick={handleRefreshLocation}
            >
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">{locationError}</p>
              <p className="text-sm text-primary font-medium">{t('messages.press_to_grant_permission')}</p>
            </div>
          ) : (
            <PlacesList
              places={nearbyPlaces}
              loading={nearbyLoading}
              emptyMessage={t('messages.no_nearby_places')}
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
                    ratingCount={place.ratingCount}
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