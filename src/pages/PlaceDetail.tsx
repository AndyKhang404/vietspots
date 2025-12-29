import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  ChevronDown,
  Wifi,
  ParkingCircle,
  UtensilsCrossed,
  Camera,
  RefreshCw,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import { categories as allCategories } from '@/data/places';
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
// Slugify helper for amenity translation keys
const slugify = (s: string) => s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

// Amenity icon mapping (keys stored as slugified strings to support variants)
const amenityIcons: Record<string, typeof Wifi> = {};

// Helper to register icon variants (auto-slugifies keys)
const registerAmenityIcon = (keys: string[], icon: typeof Wifi) => {
  keys.forEach((k) => {
    amenityIcons[slugify(k)] = icon;
  });
};

registerAmenityIcon(['Free WiFi', 'WiFi', 'free_wifi', 'wifi'], Wifi);
registerAmenityIcon(['Parking', 'Bãi đỗ xe', 'parking', 'bãi đỗ xe'], ParkingCircle);
registerAmenityIcon(['Restaurant', 'Nhà hàng', 'restaurant', 'nha_hang'], UtensilsCrossed);
registerAmenityIcon(['Photo Spot', 'photo_spot', 'photo_spot'], Camera);
registerAmenityIcon(['24/7 Open', 'Mở cửa 24/7', 'mo_cua_24_7'], Clock);
registerAmenityIcon(['Nhà vệ sinh', 'nha_ve_sinh', 'restroom'], RefreshCw);
registerAmenityIcon(['Phù hợp cho trẻ em', 'phu_hop_cho_tre_em', 'child_friendly'], Camera);
registerAmenityIcon(['Thẻ tín dụng', 'the_tin_dung', 'credit_card', 'card'], DollarSign);
registerAmenityIcon(['Chỗ ngồi cho xe lăn', 'chỗ ngồi cho xe lăn', 'cho_ngoi_cho_xe_lan', 'wheelchair_seating'], Navigation);
registerAmenityIcon(['Nhà vệ sinh cho xe lăn', 'nha_ve_sinh_cho_xe_lan', 'restroom_wheelchair'], Navigation);

// Additional common amenity icons
// Map additional amenity keys to existing icons (avoid importing icons that may not exist)
registerAmenityIcon(['wheelchair', 'accessible', 'accessibility', 'khong_gian_tiep_can', 'cho_nguoi_khuyet_tat'], Navigation);
registerAmenityIcon(['credit_card', 'the_tin_dung', 'thanh_toan_the', 'atm', 'atm_card'], DollarSign);
registerAmenityIcon(['baby_change', 'baby', 'thay_tã', 'phu_hop_cho_tre_em'], Camera);
registerAmenityIcon(['coffee', 'cafe', 'cà_phê', 'cafe_coffee'], UtensilsCrossed);

// Fallback icon
const defaultAmenityIcon = Camera;

const getIconForAmenity = (label: string) => {
  const key = slugify(label);
  return amenityIcons[key] || defaultAmenityIcon;
};

// (slugify already defined above)

// Extract amenities from API response
const getAmenities = (place: PlaceInfo) => {
  const amenities: { icon: typeof Wifi; label: string }[] = [];
  const about = place.about;

  if (!about) return amenities;

  // Check amenities section
  if (about.amenities && typeof about.amenities === 'object') {
    Object.entries(about.amenities).forEach(([key, value]) => {
      if (value === true) {
        const icon = getIconForAmenity(key);
        amenities.push({ icon, label: key });
      }
    });
  }

  // Check accessibility section
  if (about.accessibility && typeof about.accessibility === 'object') {
    Object.entries(about.accessibility).forEach(([key, value]) => {
      if (value === true) {
        const icon = getIconForAmenity(key);
        amenities.push({ icon, label: key });
      }
    });
  }

  // Check payments section  
  if (about.payments && typeof about.payments === 'object') {
    Object.entries(about.payments).forEach(([key, value]) => {
      if (value === true) {
        const icon = getIconForAmenity(key);
        amenities.push({ icon, label: key });
      }
    });
  }

  return amenities;
};

// Grouping map: slugified amenity key -> group key
const amenityGroupMap: Record<string, string> = {
  // Facilities / general
  'nha_ve_sinh': 'facilities',
  'free_wifi': 'facilities',
  'wifi': 'facilities',
  'parking': 'facilities',
  'photo_spot': 'facilities',
  'restaurant': 'food',
  'coffee': 'food',

  // Accessibility
  'nha_ve_sinh_cho_xe_lan': 'facilities',
  'cho_ngoi_cho_xe_lan': 'accessibility',
  'wheelchair': 'accessibility',
  'khong_gian_tiep_can': 'accessibility',
  // Ramps / wheelchair parking variants
  'loi_vao_cho_xe_lan': 'accessibility',
  'cho_do_xe_cho_xe_lan': 'accessibility',
  // Wheelchair parking / accessible parking variants
  'cho_do_xe_cho_xe_lan_parking': 'accessibility',
  'wheelchair_parking': 'accessibility',
  'accessible_parking': 'accessibility',
  'parking_wheelchair': 'accessibility',
  // Common parking keys from API
  'bai_do_xe_mien_phi': 'facilities',
  'do_xe_mien_phi_tren_duong': 'facilities',
  // Child-friendly / family
  'phu_hop_cho_tre_em': 'accessibility',
  'child_friendly': 'accessibility',

  // Additional keys discovered in backend scan
  'cho_phep_cho': 'facilities',
  'nhac_song': 'other',
  'phu_hop_cho_nhom': 'facilities',

  // Beverages / dining options
  'bia': 'food',
  'bua_sang': 'food',
  'bua_trua': 'food',
  'bua_toi': 'food',
  'ca_phe': 'food',

  // Service / delivery / reservations
  'nhan_dat_cho': 'other',
  'an_tai_cho': 'food',
  'do_an_mang_di': 'food',
  'giao_hang': 'other',
  'mua_hang_ngay_tren_xe': 'other',

  // Payments
  'the_tin_dung': 'payments',
  'credit_card': 'payments',
  // Debit / NFC / contactless payment variants
  'the_ghi_no': 'payments',
  'debit_card': 'payments',
  'nfc': 'payments',
  'contactless': 'payments',
  'thanh_toan_nfc': 'payments',

  // Cash / payment variants found in real data
  'chi_tien_mat': 'payments',

  // Hours / services
  'mo_cua_24_7': 'hours',
};

// Order of groups for rendering
const GROUP_ORDER = ['facilities', 'accessibility', 'payments', 'food', 'hours', 'other'];

// Build grouped amenities from place data. Returns record[groupKey] = array of {icon,label}
const getGroupedAmenities = (place: PlaceInfo) => {
  const groups: Record<string, { icon: typeof Wifi; label: string }[]> = {};
  const push = (groupKey: string, item: { icon: typeof Wifi; label: string }) => {
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  };

  const addFromObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    Object.entries(obj).forEach(([key, value]) => {
      if (value === true) {
        const icon = getIconForAmenity(key);
        const slug = slugify(key);
        const group = amenityGroupMap[slug] || 'other';
        push(group, { icon, label: key });
      }
    });
  };

  const about = place.about;
  if (!about) return groups;

  addFromObject(about.amenities);
  addFromObject(about.accessibility);
  addFromObject(about.payments);
  // Also include parking, dining and service options which often contain amenity-like keys
  addFromObject(about.parking);
  addFromObject(about.dining_options);
  addFromObject(about.service_options);

  return groups;
};

// Try to translate amenity label using i18n keys, fallback to provided label
function translateAmenity(label: string, t: (k: string, v?: any) => string) {
  const key = `amenities.${slugify(label)}`;
  const translated = t(key);
  // If translation equals key, fallback to original label
  if (translated === key) return label;
  return translated;
}

// Translate Vietnamese day names to English when needed
function translateDayName(day: string, lang: string) {
  if (lang === 'en') {
    const map: Record<string, string> = {
      'chủ nhật': 'Sunday',
      'chủ nhật:': 'Sunday',
      'thứ hai': 'Monday',
      'thứ ba': 'Tuesday',
      'thứ tư': 'Wednesday',
      'thứ năm': 'Thursday',
      'thứ sáu': 'Friday',
      'thứ bảy': 'Saturday',
    };
    const key = day.toLowerCase().replace(/\s+/g, ' ');
    return map[key] || day;
  }
  return day;
}

// Get current day index (0 = Sunday, 1 = Monday, ... 6 = Saturday)
function getCurrentDayIndex(): number {
  return new Date().getDay();
}

// Map Vietnamese day names to day index
const dayNameToIndex: Record<string, number> = {
  'chủ nhật': 0,
  'thứ hai': 1,
  'thứ ba': 2,
  'thứ tư': 3,
  'thứ năm': 4,
  'thứ sáu': 5,
  'thứ bảy': 6,
};

// Check if a day name matches current day
function isCurrentDay(dayName: string): boolean {
  const normalized = dayName.toLowerCase().replace(/[:\s]+/g, ' ').trim();
  const currentDayIndex = getCurrentDayIndex();
  return dayNameToIndex[normalized] === currentDayIndex;
}

// Check if currently open based on time string (e.g., "08:00 - 22:00")
function isCurrentlyOpen(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  
  const normalized = timeStr.toLowerCase().trim();
  
  // Check for "open all day" or "24h" patterns
  if (normalized.includes('mở cửa cả ngày') || 
      normalized.includes('24 giờ') || 
      normalized.includes('24h') ||
      normalized.includes('open 24')) {
    return true;
  }
  
  // Check for closed patterns
  if (normalized.includes('đóng cửa') || normalized.includes('closed')) {
    return false;
  }
  
  // Parse time range like "08:00 - 22:00" or "8:00 AM - 10:00 PM"
  const timeMatch = normalized.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?\s*[-–]\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (!timeMatch) return false;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  let openHour = parseInt(timeMatch[1]);
  const openMin = parseInt(timeMatch[2] || '0');
  const openAmPm = timeMatch[3]?.toLowerCase();
  
  let closeHour = parseInt(timeMatch[4]);
  const closeMin = parseInt(timeMatch[5] || '0');
  const closeAmPm = timeMatch[6]?.toLowerCase();
  
  // Convert to 24h format if AM/PM specified
  if (openAmPm === 'pm' && openHour !== 12) openHour += 12;
  if (openAmPm === 'am' && openHour === 12) openHour = 0;
  if (closeAmPm === 'pm' && closeHour !== 12) closeHour += 12;
  if (closeAmPm === 'am' && closeHour === 12) closeHour = 0;
  
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
  
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

// Check if the time string indicates "open all day"
function isOpenAllDay(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const normalized = timeStr.toLowerCase().trim();
  return normalized.includes('mở cửa cả ngày') || 
         normalized.includes('24 giờ') || 
         normalized.includes('24h') ||
         normalized.includes('open 24');
}

export default function PlaceDetail() {
  const { t, i18n } = useTranslation();
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();

  // React Router stores an internal history index in window.history.state.idx.
  // This is more reliable than window.history.length inside embedded previews.
  const canGoBack = typeof window.history.state?.idx === "number" && window.history.state.idx > 0;
  const handleBack = () => {
    if (canGoBack) navigate(-1);
    else navigate("/", { replace: true });
  };

  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    reviews,
    loading: reviewsLoading,
    submitting,
    fetchReviews,
    submitReview,
    deleteReview,
    updateReview,
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
  const [editingReview, setEditingReview] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  // Collapsible group state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    GROUP_ORDER.forEach((g) => (m[g] = true));
    return m;
  });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const toggleGroup = (g: string) => {
    setExpandedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  };

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
        toast.error(t('messages.cannot_load_place'));
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
      try {
        mapRef.current.remove();
      } catch (e) {
        // Ignore cleanup errors
      }
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
      try {
        if (map && map.remove) {
          map.remove();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
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
          toast.success(t('route.route_info', { distance, duration }));
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        toast.error(t('messages.cannot_load_route'));
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
      toast.error(t('messages.no_coordinates'));
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
          toast.error(t('messages.location_permission_required'));
          setRouteLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error(t('messages.browser_no_geolocation'));
      setRouteLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (editingReview && userReview) {
      const success = await updateReview(userReview.id, newRating, newReviewContent, reviewImages);
      if (success) {
        setEditingReview(false);
        setNewReviewContent("");
        setNewRating(5);
        setReviewImages([]);
      }
      return;
    }

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
          text: t('messages.share_text', { name: place?.name }),
          url,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('messages.link_copied'));
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
          <h1 className="text-2xl font-bold mb-4">{t('messages.not_found_place')}</h1>
          <Button onClick={handleBack}>{t('common.back')}</Button>
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
          <Button variant="ghost" className="gap-2" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => fetchReviews()}
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh')}
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
                      {(() => {
                        const c = allCategories.find(cc => cc.id === place.category || cc.labelKey === place.category);
                        return c ? t(c.labelKey) : place.category;
                      })()}
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
                    {(place.rating || averageRating || 0).toFixed(1)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {`${(place.total_comments ?? place.rating_count ?? totalReviews)} ${t('place.reviews')}`}
                </span>
              </div>

              {/* Highlights - grouped amenities */}
              {(() => {
                const grouped = getGroupedAmenities(place);
                const hasAny = GROUP_ORDER.some((g) => (grouped[g] && grouped[g].length > 0));
                if (!hasAny) return null;
                return (
                  <div className="mb-6">
                    <h3 className="font-semibold text-foreground mb-3">{t('place.amenities')}</h3>
                    <div className="space-y-3">
                      {GROUP_ORDER.map((g) => {
                        const items = grouped[g];
                        if (!items || items.length === 0) return null;
                        const expanded = !!expandedGroups[g];
                        return (
                          <div key={g}>
                            <button
                              type="button"
                              onClick={() => toggleGroup(g)}
                              aria-expanded={expanded}
                              className="w-full flex items-center justify-between mb-2 text-sm font-medium text-foreground"
                            >
                              <div className="flex items-center gap-2">
                                <span>{t(`amenity_groups.${g}`)}</span>
                                <span className="text-xs text-muted-foreground">{`(${items.length})`}</span>
                              </div>
                              <ChevronDown className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-180' : '')} />
                            </button>

                            {expanded && (
                              <div className="flex flex-wrap gap-2">
                                {items.map((chip) => (
                                  <div
                                    key={chip.label}
                                    className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm"
                                  >
                                    <chip.icon className="h-4 w-4 text-primary" />
                                    <span className="text-foreground">{translateAmenity(chip.label, t)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Description */}
              {place.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-foreground mb-2">{t('place.about')}</h3>
                  <p className="text-muted-foreground leading-relaxed">{place.description}</p>
                </div>
              )}

              {/* Location Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-foreground mb-3">{t('place.location')}</h3>

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
                      <p className="font-medium text-foreground mb-1">{t('place.opening_hours')}</p>
                      <div className="text-sm space-y-0.5">
                        {typeof place.opening_hours === 'string'
                          ? (
                            <span className={cn(
                              "font-semibold",
                              isOpenAllDay(place.opening_hours) || isCurrentlyOpen(place.opening_hours)
                                ? "text-green-600"
                                : "text-destructive"
                            )}>
                              {place.opening_hours}
                            </span>
                          )
                          : Object.entries(place.opening_hours).map(([day, time]) => {
                            const isTodayDay = isCurrentDay(day);
                            const timeStr = String(time);
                            const isOpen = isOpenAllDay(timeStr) || isCurrentlyOpen(timeStr);
                            
                            return (
                              <div key={day} className="flex gap-1">
                                <span className={cn(
                                  isTodayDay && "font-bold text-foreground"
                                )}>
                                  {translateDayName(day, i18n.language)}:
                                </span>
                                <span className={cn(
                                  isTodayDay && "font-bold",
                                  isTodayDay && (isOpen ? "text-green-600" : "text-destructive")
                                )}>
                                  {timeStr}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {place.phone && (
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                    <Phone className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground mb-1">{t('place.phone')}</p>
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
                    <p className="font-medium text-foreground mb-1">{t('place.website')}</p>
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
                  {showRoute ? t('messages.showing') : t('messages.directions')}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                  {t('actions.share')}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Reviews */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                {`${t('place.reviews')} (${place.total_comments ?? totalReviews})`}
              </h2>

              {/* Write Review Form */}
              {user && (!userReview || editingReview) ? (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{t('review.write')}</h3>
                    {editingReview && (
                      <span className="text-sm text-primary font-medium">Bạn đang sửa đánh giá</span>
                    )}
                  </div>

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
                    placeholder={t('review.placeholder')}
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
                          {t('actions.add_image')}
                        </span>
                      </Button>
                    </label>
                    {reviewImages.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {t('place.selected_images', { count: reviewImages.length })}
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
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmitReview}
                      disabled={submitting}
                      className="flex-1 gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {editingReview ? t('common.save') : t('actions.send_review')}
                    </Button>
                    {editingReview && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingReview(false);
                          setNewReviewContent("");
                          setNewRating(5);
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    )}
                  </div>
                </div>
              ) : !user ? (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl text-center">
                  <p className="text-muted-foreground mb-3">
                    {t('messages.login_to_review')}
                  </p>
                  <Button onClick={() => navigate("/auth")} variant="outline">
                    {t('auth.login')}
                  </Button>
                </div>
              ) : null}

              {/* Reviews List - allow scrolling through all comments */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {reviewsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : reviews.length > 0 ? (
                    reviews.map((review) => (
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
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteReview(review.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => {
                                  setEditingReview(true);
                                  setNewRating(review.rating || 5);
                                  setNewReviewContent(review.content || "");
                                }}
                              >
                                {t('common.edit')}
                              </Button>
                            </div>
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
                          {formatDateTime(review.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">{t('review.no_reviews')}</p>
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

// Format date/time as "HH:MM:SS DD/MM/YYYY"
const formatDateTime = (dInput?: string | number | Date) => {
  if (!dInput) return "";
  const d = new Date(dInput);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(
    d.getMonth() + 1
  )}/${d.getFullYear()}`;
};