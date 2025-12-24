import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Star,
  Phone,
  Globe,
  Clock,
  Navigation,
  Share2,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  Send,
  Trash2,
  Wifi,
  ParkingCircle,
  UtensilsCrossed,
  Camera,
  RefreshCw,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useReviews } from "@/hooks/useReviews";
import vietSpotAPI, { PlaceInfo } from "@/api/vietspot";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Helper to get coordinates from API response
const getCoordinates = (place: PlaceInfo) => {
  if (place.latitude && place.longitude) {
    return { lat: place.latitude, lng: place.longitude };
  }
  if (place.coordinates?.lat && place.coordinates?.lon) {
    return { lat: place.coordinates.lat, lng: place.coordinates.lon };
  }
  return null;
};

// Amenity icon mapping
const amenityIcons: Record<string, typeof Wifi> = {
  "Free WiFi": Wifi,
  "WiFi": Wifi,
  "Parking": ParkingCircle,
  "Bãi đỗ xe": ParkingCircle,
  "Restaurant": UtensilsCrossed,
  "Nhà hàng": UtensilsCrossed,
  "Photo Spot": Camera,
  "24/7 Open": Clock,
  "Mở cửa 24/7": Clock,
  "Nhà vệ sinh": RefreshCw,
  "Phù hợp cho trẻ em": Camera,
  "Thẻ tín dụng": DollarSign,
  "Chỗ ngồi cho xe lăn": Navigation,
  "Nhà vệ sinh cho xe lăn": Navigation,
};

// Extract amenities from API response
const getAmenities = (place: PlaceInfo) => {
  const amenities: { icon: typeof Wifi; label: string }[] = [];
  const about = place.about;
  
  if (!about) return amenities;
  
  // Check amenities section
  if (about.amenities && typeof about.amenities === 'object') {
    Object.entries(about.amenities).forEach(([key, value]) => {
      if (value === true) {
        const icon = amenityIcons[key] || Camera;
        amenities.push({ icon, label: key });
      }
    });
  }
  
  // Check accessibility section
  if (about.accessibility && typeof about.accessibility === 'object') {
    Object.entries(about.accessibility).forEach(([key, value]) => {
      if (value === true) {
        const icon = amenityIcons[key] || Navigation;
        amenities.push({ icon, label: key });
      }
    });
  }
  
  // Check payments section  
  if (about.payments && typeof about.payments === 'object') {
    Object.entries(about.payments).forEach(([key, value]) => {
      if (value === true) {
        const icon = amenityIcons[key] || DollarSign;
        amenities.push({ icon, label: key });
      }
    });
  }
  
  return amenities;
};

export default function PlaceDetail() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    reviews,
    loading: reviewsLoading,
    submitting,
    fetchReviews,
    submitReview,
    deleteReview,
    getUserReview,
    averageRating,
    totalReviews,
  } = useReviews(placeId);

  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [newReviewContent, setNewReviewContent] = useState("");
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    const fetchPlace = async () => {
      if (!placeId) return;

      setLoading(true);
      try {
        const response = await vietSpotAPI.getPlace(placeId);
        if (response) {
          setPlace(response);
          const imgs = response.images?.map((img: { url: string } | string) => 
            typeof img === 'string' ? img : img.url
          ) || [];
          if (imgs.length > 0) {
            setSelectedImage(imgs[0]);
          } else if (response.image_url) {
            setSelectedImage(response.image_url);
          }
        }
      } catch (error) {
        console.error("Error fetching place:", error);
        toast.error("Không thể tải thông tin địa điểm");
      } finally {
        setLoading(false);
      }
    };

    fetchPlace();
    fetchReviews();
  }, [placeId, fetchReviews]);

  // Initialize map when place data is loaded
  useEffect(() => {
    if (!place || !mapContainerRef.current) return;
    const coords = getCoordinates(place);
    if (!coords) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
    }

    const trackAsiaKey = import.meta.env.VITE_TRACKASIA_PUBLIC_KEY || 'public_key';
    
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: `https://maps.track-asia.com/styles/v1/streets.json?key=${trackAsiaKey}`,
      center: [coords.lng, coords.lat],
      zoom: 14,
      interactive: true,
    });

    // Add destination marker
    new maplibregl.Marker({ color: '#ef4444' })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [place]);

  // Add route to map when user location and showRoute are set
  useEffect(() => {
    const coords = place ? getCoordinates(place) : null;
    if (!mapRef.current || !userLocation || !showRoute || !coords) return;
    const map = mapRef.current;
    const routeSourceId = 'route';
    const routeLayerId = 'route-line';

    // Add user location marker
    const userMarkerEl = document.createElement('div');
    userMarkerEl.className = 'user-location-marker';
    userMarkerEl.style.width = '20px';
    userMarkerEl.style.height = '20px';
    userMarkerEl.style.backgroundColor = '#3b82f6';
    userMarkerEl.style.borderRadius = '50%';
    userMarkerEl.style.border = '3px solid white';
    userMarkerEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    new maplibregl.Marker({ element: userMarkerEl })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);

    // Fetch route from OSRM
    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${coords.lng},${coords.lat}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const routeGeometry = data.routes[0].geometry;

          // Remove existing route layer/source if exists
          if (map.getLayer(routeLayerId)) {
            map.removeLayer(routeLayerId);
          }
          if (map.getSource(routeSourceId)) {
            map.removeSource(routeSourceId);
          }

          // Add route source
          map.addSource(routeSourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: routeGeometry,
            },
          });

          // Add route layer
          map.addLayer({
            id: routeLayerId,
            type: 'line',
            source: routeSourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 5,
              'line-opacity': 0.8,
            },
          });

          // Fit map to show entire route
          const coordinates = routeGeometry.coordinates;
          const bounds = coordinates.reduce(
            (bounds: maplibregl.LngLatBounds, coord: [number, number]) => {
              return bounds.extend(coord as [number, number]);
            },
            new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
          );

          map.fitBounds(bounds, { padding: 50 });

          // Show route info
          const distance = (data.routes[0].distance / 1000).toFixed(1);
          const duration = Math.round(data.routes[0].duration / 60);
          toast.success(`Khoảng cách: ${distance}km • Thời gian: ${duration} phút`);
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        toast.error('Không thể tải lộ trình. Vui lòng thử lại.');
      } finally {
        setRouteLoading(false);
      }
    };

    if (map.isStyleLoaded()) {
      fetchRoute();
    } else {
      map.on('load', fetchRoute);
    }
  }, [userLocation, showRoute, place]);

  // Handle get directions - get user location and show route on map
  const handleShowRouteOnMap = () => {
    const coords = place ? getCoordinates(place) : null;
    if (!coords) {
      toast.error('Địa điểm không có tọa độ');
      return;
    }

    setRouteLoading(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setShowRoute(true);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí.');
          setRouteLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error('Trình duyệt không hỗ trợ định vị');
      setRouteLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    const success = await submitReview(newRating, newReviewContent, reviewImages);
    if (success) {
      setNewReviewContent("");
      setNewRating(5);
      setReviewImages([]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setReviewImages((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: place?.name,
          text: `Khám phá ${place?.name} trên VietSpots!`,
          url,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết!");
    }
  };

  const handleOpenDirections = () => {
    const coords = place ? getCoordinates(place) : null;
    if (coords) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`,
        "_blank"
      );
    } else if (place?.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`,
        "_blank"
      );
    }
  };

  const handleOpenWebsite = () => {
    if (place?.website) {
      window.open(place.website, "_blank");
    }
  };

  const userReview = getUserReview();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!place) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-10 text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy địa điểm</h1>
          <Button onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
      </Layout>
    );
  }

  const images: string[] = (place.images || []).map((img: string | { url: string; id: string }) => 
    typeof img === 'string' ? img : img.url
  ).concat(place.image_url && !(place.images?.length) ? [place.image_url] : []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => fetchReviews()}
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image */}
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Image Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={cn(
                      "shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                      selectedImage === img ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Place Info */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                    {place.name}
                  </h1>
                  {place.category && (
                    <Badge variant="secondary" className="mb-3">
                      {place.category}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      toggleFavorite({
                        id: place.place_id || placeId || '',
                        name: place.name,
                        address: place.address,
                        image: images[0],
                        rating: place.rating,
                        category: place.category,
                      })
                    }
                  >
                    <Heart
                      className={cn(
                        "h-5 w-5",
                        isFavorite(place.place_id || placeId || '') && "fill-primary text-primary"
                      )}
                    />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1.5 rounded-full">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-bold">
                    {(averageRating || place.rating || 0).toFixed(1)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {(place.total_comments ?? totalReviews ?? 0)} đánh giá
                </span>
              </div>

              {/* Highlights */}
              {(() => {
                const amenities = getAmenities(place);
                if (amenities.length === 0) return null;
                return (
                  <div className="mb-6">
                    <h3 className="font-semibold text-foreground mb-3">Tiện ích</h3>
                    <div className="flex flex-wrap gap-2">
                      {amenities.map((chip) => (
                        <div
                          key={chip.label}
                          className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm"
                        >
                          <chip.icon className="h-4 w-4 text-primary" />
                          <span className="text-foreground">{chip.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Description */}
              {place.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-foreground mb-2">Giới thiệu</h3>
                  <p className="text-muted-foreground leading-relaxed">{place.description}</p>
                </div>
              )}

              {/* Location Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3">Vị trí</h3>
                
                {/* Map Preview */}
                {getCoordinates(place) && (
                  <div 
                    ref={mapContainerRef} 
                    className="w-full h-[200px] rounded-xl overflow-hidden mb-4"
                  />
                )}

                {/* Address */}
                <div className="flex items-start gap-3 text-muted-foreground p-4 bg-muted/50 rounded-xl">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{place.address?.replace(/\b[A-Z0-9]{4,}\+[A-Z0-9]{2,}\b/gi, '').replace(/\b\d{5,6}\b/g, '').replace(/,\s*,/g, ',').replace(/,\s*$/g, '').replace(/^\s*,/g, '').trim()}</span>
                </div>
              </div>

              {/* Price & Opening Hours */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Opening Hours */}
                {place.opening_hours && (
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                    <Clock className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground mb-1">Giờ mở cửa</p>
                      <span className="text-sm text-muted-foreground">
                        {typeof place.opening_hours === 'string' 
                          ? place.opening_hours 
                          : Object.entries(place.opening_hours).map(([day, time]) => (
                              <div key={day}>{day}: {time}</div>
                            ))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {place.phone && (
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                    <Phone className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground mb-1">Điện thoại</p>
                      <a href={`tel:${place.phone}`} className="text-sm text-primary hover:underline">
                        {place.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Website */}
              {place.website && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl mb-6">
                  <Globe className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground mb-1">Website</p>
                    <button
                      onClick={handleOpenWebsite}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {place.website}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  className="gap-2" 
                  onClick={handleShowRouteOnMap}
                  disabled={routeLoading}
                >
                  {routeLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Navigation className="h-5 w-5" />
                  )}
                  {showRoute ? 'Đang hiển thị' : 'Chỉ đường'}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                  Chia sẻ
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Reviews */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Đánh giá ({place.total_comments ?? totalReviews})
              </h2>

              {/* Write Review Form */}
              {user && !userReview ? (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                  <h3 className="font-semibold mb-3">Viết đánh giá của bạn</h3>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={cn(
                            "h-6 w-6 transition-colors",
                            star <= newRating
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Review Content */}
                  <Textarea
                    value={newReviewContent}
                    onChange={(e) => setNewReviewContent(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    className="mb-3"
                    rows={3}
                  />

                  {/* Image Upload */}
                  <div className="flex items-center gap-2 mb-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <span>
                          <ImageIcon className="h-4 w-4" />
                          Thêm ảnh
                        </span>
                      </Button>
                    </label>
                    {reviewImages.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {reviewImages.length} ảnh đã chọn
                      </span>
                    )}
                  </div>

                  {/* Preview Images */}
                  {reviewImages.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {reviewImages.map((file, i) => (
                        <div key={i} className="relative shrink-0">
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                          <button
                            onClick={() =>
                              setReviewImages((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="w-full gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Gửi đánh giá
                  </Button>
                </div>
              ) : !user ? (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl text-center">
                  <p className="text-muted-foreground mb-3">
                    Đăng nhập để viết đánh giá
                  </p>
                  <Button onClick={() => navigate("/auth")} variant="outline">
                    Đăng nhập
                  </Button>
                </div>
              ) : null}

              {/* Reviews List - Show only first 3 */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {reviewsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : reviews.length > 0 ? (
                    reviews.slice(0, 3).map((review) => (
                      <div
                        key={review.id}
                        className="p-4 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={review.user_avatar} />
                              <AvatarFallback>
                                {review.user_name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{review.user_name}</p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "h-3 w-3",
                                      i < review.rating
                                        ? "fill-yellow-500 text-yellow-500"
                                        : "text-muted-foreground"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {review.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteReview(review.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {review.content && (
                          <p className="text-muted-foreground text-sm mb-2">
                            {review.content}
                          </p>
                        )}
                        {review.images && review.images.length > 0 && (
                          <div className="flex gap-2 mt-2 overflow-x-auto">
                            {review.images.map((img) => (
                              <img
                                key={img.id}
                                src={img.image_url}
                                alt=""
                                className="h-20 w-20 object-cover rounded-lg shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(img.image_url, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Chưa có đánh giá nào</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      <Chatbot />
    </Layout>
  );
}