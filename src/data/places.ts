import { PlaceInfo } from "@/api/vietspot";

// Helper to get image URL from mixed format (string or object)
function getImageUrl(img: string | { url: string } | { id: string; url: string }): string {
  if (typeof img === 'string') return img;
  return img.url;
}

// Place type
export interface Place {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  ratingCount: number;
  totalComments: number;
  description: string;
  category: string;
  address?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  openingHours?: Record<string, string>;
  about?: Record<string, unknown>;
}

// Transform API PlaceInfo to app format - matching mobile app logic
export function transformPlace(place: PlaceInfo): Place {
  // Handle images - can be array of strings or objects
  const images = place.images?.map((img) => {
    if (typeof img === 'string') return img;
    return (img as { url: string }).url;
  }).filter(url => url && url.length > 0) || [];
  
  const firstImage = images[0] || place.image_url || "https://images.unsplash.com/photo-1528127269322-539801943592?w=800";
  
  // Parse opening hours if it's an object
  const openingHours = typeof place.opening_hours === 'object' && place.opening_hours !== null
    ? place.opening_hours as Record<string, string>
    : undefined;
  
  // Clean address: remove ZIP code (5 digits at end after comma/space)
  const cleanLocation = (addr: string | undefined): string => {
    if (!addr) return '';
    // Remove ZIP code pattern (e.g., ", 700000" or " 70000")
    return addr.replace(/[,\s]+\d{5,6}\s*$/g, '').trim();
  };

  const rawLocation = place.city || place.district || place.address?.split(',').slice(-2).join(',').trim() || "";
  
  return {
    id: place.id || place.place_id || "",
    name: place.name,
    location: cleanLocation(rawLocation),
    image: firstImage,
    rating: place.rating || 0,
    ratingCount: place.rating_count || 0,
    totalComments: place.total_comments || place.rating_count || 0,
    description: place.description || place.category || "",
    category: place.category || "other",
    address: place.address,
    phone: place.phone,
    website: place.website,
    latitude: place.latitude || place.coordinates?.lat,
    longitude: place.longitude || place.coordinates?.lon,
    images: images,
    openingHours: openingHours,
    about: place.about as Record<string, unknown>,
  };
}

// Fallback places for when API is unavailable
export const fallbackPlaces: Place[] = [
  {
    id: "1",
    name: "Vịnh Hạ Long",
    location: "Quảng Ninh",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    rating: 4.9,
    ratingCount: 1250,
    totalComments: 1250,
    description: "Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi hùng vĩ",
    category: "beach",
  },
  {
    id: "2",
    name: "Phố cổ Hội An",
    location: "Quảng Nam",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    rating: 4.8,
    ratingCount: 980,
    totalComments: 980,
    description: "Thương cảng cổ với kiến trúc độc đáo và đèn lồng rực rỡ",
    category: "historical",
  },
  {
    id: "3",
    name: "Sa Pa",
    location: "Lào Cai",
    image: "https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800",
    rating: 4.7,
    ratingCount: 756,
    totalComments: 756,
    description: "Ruộng bậc thang tuyệt đẹp và văn hóa dân tộc phong phú",
    category: "mountain",
  },
  {
    id: "4",
    name: "Đà Lạt",
    location: "Lâm Đồng",
    image: "https://images.unsplash.com/photo-1555921015-5532091f6026?w=800",
    rating: 4.6,
    ratingCount: 890,
    totalComments: 890,
    description: "Thành phố ngàn hoa với khí hậu mát mẻ quanh năm",
    category: "city",
  },
  {
    id: "5",
    name: "Bãi biển Mỹ Khê",
    location: "Đà Nẵng",
    image: "https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=800",
    rating: 4.8,
    ratingCount: 1100,
    totalComments: 1100,
    description: "Một trong những bãi biển đẹp nhất hành tinh",
    category: "beach",
  },
  {
    id: "6",
    name: "Phú Quốc",
    location: "Kiên Giang",
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800",
    rating: 4.7,
    ratingCount: 820,
    totalComments: 820,
    description: "Đảo ngọc với bãi cát trắng mịn và hải sản tươi ngon",
    category: "beach",
  },
  {
    id: "7",
    name: "Hoàng thành Thăng Long",
    location: "Hà Nội",
    image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
    rating: 4.5,
    ratingCount: 560,
    totalComments: 560,
    description: "Di sản văn hóa thế giới UNESCO với lịch sử nghìn năm",
    category: "historical",
  },
  {
    id: "8",
    name: "Cố đô Huế",
    location: "Thừa Thiên Huế",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    rating: 4.6,
    ratingCount: 670,
    totalComments: 670,
    description: "Kinh đô triều Nguyễn với nhiều lăng tẩm cổ kính",
    category: "historical",
  },
];

export const categories = [
  { id: "beach", label: "Biển đảo", emoji: "🏖️" },
  { id: "mountain", label: "Núi rừng", emoji: "🏔️" },
  { id: "city", label: "Thành phố", emoji: "🏙️" },
  { id: "historical", label: "Lịch sử", emoji: "🏛️" },
  { id: "food", label: "Ẩm thực", emoji: "🍜" },
  { id: "cafe", label: "Cafe", emoji: "☕" },
  { id: "restaurant", label: "Nhà hàng", emoji: "🍽️" },
];

// Keep for backward compatibility
export const allPlaces = fallbackPlaces;
