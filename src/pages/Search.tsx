import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Search as SearchIcon, SlidersHorizontal, Grid3X3, List, Loader2, X, Star, Clock, Navigation, Heart, Save, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFavorites } from "@/contexts/FavoritesContext";
import { usePlaces, useSearchPlaces, useCategories } from "@/hooks/useVietSpotAPI";
import { transformPlace, categories as defaultCategories } from "@/data/places";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SavedFilter {
  id: string;
  name: string;
  minRating: number;
  maxDistance: number;
  openNow: boolean;
}

const SAVED_FILTERS_KEY = "vietspots_saved_filters";

export default function Search() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [activeFilter, setActiveFilter] = useState(searchParams.get("category") || "all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(0);
  const [openNow, setOpenNow] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");
  const { toggleFavorite, isFavorite } = useFavorites();

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_FILTERS_KEY);
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved filters:", e);
      }
    }
  }, []);

  const activeFiltersCount = [minRating > 0, maxDistance > 0, openNow].filter(Boolean).length;

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast.error("Vui lòng nhập tên bộ lọc");
      return;
    }
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      minRating,
      maxDistance,
      openNow,
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    setFilterName("");
    toast.success("Đã lưu bộ lọc!");
  };

  const handleLoadFilter = (filter: SavedFilter) => {
    setMinRating(filter.minRating);
    setMaxDistance(filter.maxDistance);
    setOpenNow(filter.openNow);
    toast.success(`Đã áp dụng bộ lọc "${filter.name}"`);
  };

  const handleDeleteFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    toast.success("Đã xóa bộ lọc");
  };

  const handleClearFilters = () => {
    setMinRating(0);
    setMaxDistance(0);
    setOpenNow(false);
  };
  
  // Sync activeFilter with URL params when component mounts or URL changes
  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl && categoryFromUrl !== activeFilter) {
      setActiveFilter(categoryFromUrl);
    }
  }, [searchParams]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Only fetch places when there's a search term or category filter
  const { data: categoriesResponse, isLoading: categoriesLoading } = useCategories();
  // Use hardcoded categories if API returns limited results
  const allCategories = [
    "Biển & Bãi Biển",
    "Bảo Tàng & Triển Lãm", 
    "Di Tích Lịch Sử",
    "Điểm Ngắm Cảnh",
    "Giải Trí & Vui Chơi",
    "Công Viên & Thiên Nhiên",
    "Chùa & Đền",
    "Nhà Thờ & Thánh Đường",
    "Mua Sắm",
    "Ẩm Thực",
    "Cafe",
    "Nhà Hàng",
    "Spa & Làm Đẹp",
    "Thể Thao & Gym",
    "Khách Sạn & Lưu Trú",
  ];
  
  // Use API categories if available and has more than 2, otherwise use hardcoded
  const categoryList = (categoriesResponse && categoriesResponse.length > 2) 
    ? categoriesResponse 
    : allCategories;
  
  // Always fetch places - no "all" filter anymore, fetch first category by default
  const effectiveCategory = activeFilter || categoryList[0] || "";
  const shouldFetchPlaces = !!effectiveCategory;
  const { data: placesResponse, isLoading: placesLoading } = usePlaces(
    shouldFetchPlaces ? {
      category: effectiveCategory || undefined,
      limit: 200, // Increased limit to get more places
      minRating: minRating > 0 ? minRating : 0,
      sortBy: 'rating',
    } : { limit: 0 }
  );
  
  // Only search when user types something
  const { data: searchResponse, isLoading: searchLoading } = useSearchPlaces({
    q: debouncedSearch,
    category: effectiveCategory || undefined,
    limit: 200,
  });

  // Build filters from categories
  const filters = categoryList.map((cat) => {
    const defaultCat = defaultCategories.find((c) => c.id === cat);
    return { id: cat, label: defaultCat?.label || cat };
  });

  // Check if search term matches a category for quick category search
  const matchedCategoryBySearch = filters.find(
    (f) => f.label.toLowerCase().includes(searchTerm.toLowerCase()) && searchTerm.length >= 2
  );

  // Set default filter to first category if not set
  useEffect(() => {
    if (!activeFilter && filters.length > 0) {
      setActiveFilter(filters[0].id);
    }
  }, [filters, activeFilter]);

  // Auto-switch category when search matches a category name
  useEffect(() => {
    if (matchedCategoryBySearch && matchedCategoryBySearch.id !== activeFilter) {
      // Show suggestion but don't auto-switch
    }
  }, [matchedCategoryBySearch]);

  // Transform API data (no mock-data fallback)
  const isSearching = debouncedSearch.length > 0;
  const rawPlaces = isSearching ? searchResponse || [] : placesResponse || [];
  const places = rawPlaces.map(transformPlace);

  // Filter by category on client side if needed
  const filteredPlaces = places.filter((place) => {
    const matchesSearch =
      !isSearching ||
      place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !effectiveCategory || place.category === effectiveCategory;
    const matchesRating = minRating === 0 || place.rating >= minRating;
    return matchesSearch && matchesFilter && matchesRating;
  });

  const isLoading = isSearching ? searchLoading : placesLoading;
  const displayedCount = isLoading ? 0 : filteredPlaces.length;

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("category", filter);
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
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant={activeFiltersCount > 0 ? "default" : "outline"} 
                  size="icon" 
                  className="h-12 w-12 rounded-xl relative"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <ScrollArea className="max-h-[70vh]">
                  <div className="space-y-4 p-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Bộ lọc nâng cao</h4>
                      {activeFiltersCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-xs"
                          onClick={handleClearFilters}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Xóa tất cả
                        </Button>
                      )}
                    </div>

                    {/* Rating Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <Label>Rating tối thiểu</Label>
                        <span className="ml-auto text-sm font-medium text-primary">
                          {minRating > 0 ? `${minRating}+ sao` : "Tất cả"}
                        </span>
                      </div>
                      <Slider
                        value={[minRating]}
                        onValueChange={(value) => setMinRating(value[0])}
                        min={0}
                        max={5}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tất cả</span>
                        <span>5 sao</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Distance Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <Label>Khoảng cách tối đa</Label>
                        <span className="ml-auto text-sm font-medium text-primary">
                          {maxDistance > 0 ? `${maxDistance} km` : "Không giới hạn"}
                        </span>
                      </div>
                      <Slider
                        value={[maxDistance]}
                        onValueChange={(value) => setMaxDistance(value[0])}
                        min={0}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Không giới hạn</span>
                        <span>50 km</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Open Now Filter */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-500" />
                        <Label>Đang mở cửa</Label>
                      </div>
                      <Switch
                        checked={openNow}
                        onCheckedChange={setOpenNow}
                      />
                    </div>

                    <Separator />

                    {/* Save Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Lưu bộ lọc yêu thích</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Tên bộ lọc..."
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                          className="h-9 text-sm"
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleSaveFilter}
                          disabled={!filterName.trim() || activeFiltersCount === 0}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Saved Filters */}
                    {savedFilters.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Bộ lọc đã lưu</Label>
                        <div className="space-y-1">
                          {savedFilters.map((filter) => (
                            <div
                              key={filter.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                            >
                              <button
                                className="flex-1 text-left text-sm font-medium"
                                onClick={() => handleLoadFilter(filter)}
                              >
                                <Heart className="h-3 w-3 inline mr-1.5 text-primary" />
                                {filter.name}
                              </button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteFilter(filter.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      className="w-full" 
                      onClick={() => setFilterOpen(false)}
                    >
                      Áp dụng
                    </Button>
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
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

        {/* Category Search Suggestion */}
        {matchedCategoryBySearch && matchedCategoryBySearch.id !== activeFilter && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-2">
            <button
              onClick={() => {
                handleFilterChange(matchedCategoryBySearch.id);
                setSearchTerm("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
            >
              <Tag className="h-4 w-4" />
              <span className="text-sm">
                Chuyển sang danh mục: <strong>{matchedCategoryBySearch.label}</strong>
              </span>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categoriesLoading ? (
            // Skeleton loading for categories
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton 
                  key={i} 
                  className="h-10 rounded-xl" 
                  style={{ width: `${80 + Math.random() * 60}px` }}
                />
              ))}
            </>
          ) : (
            filters.map((filter, index) => (
              <button
                key={filter.id}
                onClick={() => handleFilterChange(filter.id)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 animate-in fade-in slide-in-from-left-2",
                  activeFilter === filter.id
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-card border border-border text-foreground hover:bg-secondary",
                  matchedCategoryBySearch?.id === filter.id && activeFilter !== filter.id
                    ? "ring-2 ring-primary ring-offset-2"
                    : ""
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {filter.label}
              </button>
            ))
          )}
        </div>

        {/* Results Count - only show when searching or filtering */}
        {(debouncedSearch || activeFilter !== "all") && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{displayedCount}</span> kết quả được tìm thấy
            </p>
          </div>
        )}

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
                  className="animate-in fade-in slide-in-from-bottom-4 cursor-pointer"
                  style={{ animationDelay: `${index * 30}ms` }}
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
