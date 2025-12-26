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
  categorySlug?: string;
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

  const slugify = (s: string | undefined) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

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
    description: place.description || "",
    category: place.category || "other",
    categorySlug: slugify(place.category),
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
    description: "A UNESCO World Heritage site with thousands of stunning limestone islands",
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
    description: "An ancient trading port known for unique architecture and colorful lanterns",
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
    description: "Famous for terraced rice fields and rich ethnic cultures",
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
    description: "The city of a thousand flowers with a cool climate year-round",
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
    description: "One of the world's most beautiful beaches",
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
    description: "An island paradise with white sandy beaches and fresh seafood",
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
    description: "A UNESCO cultural heritage site with a thousand years of history",
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
    description: "The former imperial capital with ancient tombs and palaces",
    category: "historical",
  },
];

export const categories = [
  { id: "beach", labelKey: "categories.beach", emoji: "🏖️" },
  { id: "mountain", labelKey: "categories.mountain", emoji: "🏔️" },
  { id: "city", labelKey: "categories.city", emoji: "🏙️" },
  { id: "historical", labelKey: "categories.historical", emoji: "🏛️" },
  { id: "food", labelKey: "categories.food", emoji: "🍜" },
  { id: "cafe", labelKey: "categories.cafe", emoji: "☕" },
  { id: "restaurant", labelKey: "categories.restaurant", emoji: "🍽️" },
  // API categories (Vietnamese names)
  { id: "Bảo Tàng & Triển Lãm", labelKey: "categories.bao_tang_trien_lam", emoji: "🏛️" },
  { id: "Biển & Bãi Biển", labelKey: "categories.bien_bai_bien", emoji: "🏖️" },
  { id: "Café & Bar", labelKey: "categories.cafe_bar", emoji: "☕" },
  { id: "Chùa & Đền Thờ", labelKey: "categories.chua_den_tho", emoji: "🛕" },
  { id: "Công Viên & Vườn", labelKey: "categories.cong_vien_vuon", emoji: "🌳" },
  { id: "Di Tích Lịch Sử", labelKey: "categories.di_tich_lich_su", emoji: "🏛️" },
  { id: "Điểm Ngắm Cảnh", labelKey: "categories.diem_ngam_canh", emoji: "🌄" },
  { id: "Điểm thu hút khách du lịch", labelKey: "categories.diem_thu_hut", emoji: "📍" },
  { id: "Giải Trí & Vui Chơi", labelKey: "categories.giai_tri_vui_choi", emoji: "🎢" },
  { id: "Khách Sạn & Resort", labelKey: "categories.khach_san_resort", emoji: "🏨" },
  { id: "Nhà Hàng & Ẩm Thực", labelKey: "categories.nha_hang_am_thuc", emoji: "🍽️" },
  { id: "Núi & Thiên Nhiên", labelKey: "categories.nui_thien_nhien", emoji: "🏔️" },
  { id: "Thác Nước & Hồ", labelKey: "categories.thac_nuoc_ho", emoji: "💧" },
  { id: "Trung Tâm Thương Mại", labelKey: "categories.trung_tam_thuong_mai", emoji: "🛒" },
  { id: "Trung Tâm Văn Hóa", labelKey: "categories.trung_tam_van_hoa", emoji: "🎭" },
];

// Keep for backward compatibility
export const allPlaces = fallbackPlaces;

// Resolve a category name or label to a known category id.
// Normalizes input (remove diacritics, lowercase, replace spaces) and
// attempts to match against the `categories` list `id` values.
export function resolveCategoryId(input?: string | null): string | null {
  if (!input) return null;
  const normalize = (s: string) =>
    s
      .toString()
      .normalize('NFD')
      .replace(/[ -\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

  const slug = normalize(input);

  // Direct id match
  if (categories.some((c) => c.id === slug)) return slug;

  // Try contains match (e.g., "beach resort" -> "beach")
  for (const c of categories) {
    if (slug.includes(c.id)) return c.id;
  }

  return null;
}
