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
  
  // Clean address: remove ZIP code (5-6 digits anywhere) and Plus Codes (like RM23+86R)
  const cleanLocation = (addr: string | undefined): string => {
    if (!addr) return '';
    // Remove Plus Codes (e.g., "RM23+86R", "XXXX+XXX")
    // Remove ZIP code patterns (e.g., "700000", "550000", etc.) anywhere in string
    return addr
      .replace(/\b[A-Z0-9]{4,}\+[A-Z0-9]{2,}\b/gi, '') // Remove Plus Codes
      .replace(/\b\d{5,6}\b/g, '') // Remove 5-6 digit numbers
      .replace(/,\s*,/g, ',') // Clean double commas
      .replace(/,\s*$/g, '') // Remove trailing comma
      .replace(/^\s*,/g, '') // Remove leading comma
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };
  
  // Format location as "Số + Tên đường, Quận" from address
  // Example: "86 Phan Sào Nam, Phường 11, Tân Bình, TP.HCM" -> "86 Phan Sào Nam, Tân Bình"
  const formatStreetDistrict = (fullAddress: string | undefined, city?: string, district?: string): string => {
    if (!fullAddress && !district && !city) return '';
    
    // Clean ZIP and Plus Code first
    const cleanAddr = cleanLocation(fullAddress);
    
    // Split by comma and clean each part
    const parts = cleanAddr?.split(',').map(p => p.trim()).filter(Boolean) || [];
    
    if (parts.length === 0) return cleanLocation(city || '');
    
    // First part is usually street with number (e.g., "86 Phan Sào Nam")
    const streetPart = parts[0];
    
    // Find district (Quận/District name like "Tân Bình", "Bình Chánh", "Quận 1", etc.)
    // Skip "Phường", "Xã" parts and city names, look for district/huyện
    let districtPart = '';
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i].toLowerCase();
      // Skip phường, xã, skip city names (Thành phố, TP, Việt Nam)
      if (p.includes('phường') || p.includes('xã') || p.includes('thành phố') || p.includes('việt nam') || p.startsWith('tp')) {
        continue;
      }
      // Found district (Bình Chánh, Tân Bình, etc.)
      districtPart = parts[i];
      break;
    }
    
    // If we have district from API, prefer it
    if (district && !districtPart) {
      districtPart = district;
    }
    
    if (streetPart && districtPart) {
      return `${streetPart}, ${districtPart}`;
    }
    
    return streetPart || districtPart || cleanLocation(city || '');
  };

  const rawLocation = formatStreetDistrict(place.address, place.city, place.district);
  
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
  // Categories from VietSpot API
  { id: "Biển & Bãi Biển", label: "Biển & Bãi Biển", emoji: "🏖️" },
  { id: "Bảo Tàng & Triển Lãm", label: "Bảo Tàng & Triển Lãm", emoji: "🏛️" },
  { id: "Di Tích Lịch Sử", label: "Di Tích Lịch Sử", emoji: "🏯" },
  { id: "Điểm Ngắm Cảnh", label: "Điểm Ngắm Cảnh", emoji: "🌄" },
  { id: "Giải Trí & Vui Chơi", label: "Giải Trí & Vui Chơi", emoji: "🎡" },
  { id: "Công Viên & Thiên Nhiên", label: "Công Viên & Thiên Nhiên", emoji: "🌳" },
  { id: "Chùa & Đền", label: "Chùa & Đền", emoji: "⛩️" },
  { id: "Nhà Thờ & Thánh Đường", label: "Nhà Thờ & Thánh Đường", emoji: "⛪" },
  { id: "Mua Sắm", label: "Mua Sắm", emoji: "🛍️" },
  { id: "Ẩm Thực", label: "Ẩm Thực", emoji: "🍜" },
  { id: "Cafe", label: "Cafe", emoji: "☕" },
  { id: "Nhà Hàng", label: "Nhà Hàng", emoji: "🍽️" },
  { id: "Spa & Làm Đẹp", label: "Spa & Làm Đẹp", emoji: "💆" },
  { id: "Thể Thao & Gym", label: "Thể Thao & Gym", emoji: "🏋️" },
  { id: "Khách Sạn & Lưu Trú", label: "Khách Sạn & Lưu Trú", emoji: "🏨" },
  // Legacy categories for backward compatibility
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
