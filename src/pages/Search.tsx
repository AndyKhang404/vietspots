import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Search as SearchIcon, SlidersHorizontal, Grid3X3, List, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/contexts/FavoritesContext";
import { usePlaces, useSearchPlaces, useCategories } from "@/hooks/useVietSpotAPI";
import { transformPlace, fallbackPlaces, categories as defaultCategories } from "@/data/places";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function Search() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [activeFilter, setActiveFilter] = useState(searchParams.get("category") || "all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const { toggleFavorite, isFavorite } = useFavorites();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data from API
  const { data: categoriesResponse } = useCategories();
  const { data: placesResponse, isLoading: placesLoading } = usePlaces({
    category: activeFilter !== "all" ? activeFilter : undefined,
    limit: 50,
  });
  const { data: searchResponse, isLoading: searchLoading } = useSearchPlaces({
    q: debouncedSearch,
    category: activeFilter !== "all" ? activeFilter : undefined,
    limit: 50,
  });

  // Build filters from API or use defaults
  const apiCategories = categoriesResponse || [];
  const filters = [
    { id: "all", label: "Tất cả" },
    ...apiCategories.map((cat) => {
      const defaultCat = defaultCategories.find((c) => c.id === cat);
      return { id: cat, label: defaultCat?.label || cat };
    }),
  ];

  // Transform API data or use fallback
  const isSearching = debouncedSearch.length > 0;
  const rawPlaces = isSearching
    ? searchResponse || []
    : placesResponse || [];

  const places = rawPlaces.length > 0
    ? rawPlaces.map(transformPlace)
    : fallbackPlaces;

  // Filter by category on client side if needed
  const filteredPlaces = places.filter((place) => {
    const matchesSearch = isSearching ? true :
      place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || place.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const isLoading = isSearching ? searchLoading : placesLoading;

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    const newParams = new URLSearchParams(searchParams);
    if (filter === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", filter);
    }
    setSearchParams(newParams);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{t('search.title')}</h1>
          <p className="text-muted-foreground">Tìm địa điểm du lịch yêu thích của bạn</p>
        </div>

        {/* Search Bar & Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-2xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search.placeholder')}
              className="pl-12 h-12 text-base rounded-xl"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
            <div className="hidden lg:flex border border-border rounded-xl overflow-hidden">
              <Button 
                variant={viewMode === "grid" ? "secondary" : "ghost"} 
                size="icon"
                className="rounded-none h-12 w-12"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-5 w-5" />
              </Button>
              <Button 
                variant={viewMode === "list" ? "secondary" : "ghost"} 
                size="icon"
                className="rounded-none h-12 w-12"
                onClick={() => setViewMode("list")}
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((filter, index) => (
            <button
              key={filter.id}
              onClick={() => handleFilterChange(filter.id)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 animate-in fade-in slide-in-from-left-2",
                activeFilter === filter.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card border border-border text-foreground hover:bg-secondary"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredPlaces.length}</span> kết quả được tìm thấy
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Places Grid */}
            <div className={cn(
              "grid gap-4 lg:gap-6",
              viewMode === "grid" 
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
                : "grid-cols-1 lg:grid-cols-2"
            )}>
              {filteredPlaces.map((place, index) => (
                <div
                  key={place.id}
                  className="animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 30}ms` }}
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
                    className={viewMode === "list" ? "flex-row" : ""}
                  />
                </div>
              ))}
            </div>

            {filteredPlaces.length === 0 && (
              <div className="text-center py-20 animate-in fade-in">
                <div className="h-20 w-20 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <SearchIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t('search.noResults')}</h3>
                <p className="text-sm text-muted-foreground">Thử tìm kiếm với từ khóa khác</p>
              </div>
            )}
          </>
        )}
      </div>

      <Chatbot />
    </Layout>
  );
}
