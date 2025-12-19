import { PlaceInfo } from "@/api/vietspot";

// Transform API PlaceInfo to app format
export function transformPlace(place: PlaceInfo) {
  return {
    id: place.place_id,
    name: place.name,
    location: place.city || place.district || place.address || "",
    image: place.image_url || place.images?.[0] || "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    rating: place.rating || 0,
    description: place.description || "",
    category: place.category || "other",
    address: place.address,
    phone: place.phone,
    website: place.website,
    latitude: place.latitude,
    longitude: place.longitude,
    images: place.images || [],
  };
}

// Fallback places for when API is unavailable
export const fallbackPlaces = [
  {
    id: "1",
    name: "Vịnh Hạ Long",
    location: "Quảng Ninh",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    rating: 4.9,
    description: "Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi hùng vĩ",
    category: "beach",
  },
  {
    id: "2",
    name: "Phố cổ Hội An",
    location: "Quảng Nam",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    rating: 4.8,
    description: "Thương cảng cổ với kiến trúc độc đáo và đèn lồng rực rỡ",
    category: "historical",
  },
  {
    id: "3",
    name: "Sa Pa",
    location: "Lào Cai",
    image: "https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800",
    rating: 4.7,
    description: "Ruộng bậc thang tuyệt đẹp và văn hóa dân tộc phong phú",
    category: "mountain",
  },
  {
    id: "4",
    name: "Đà Lạt",
    location: "Lâm Đồng",
    image: "https://images.unsplash.com/photo-1555921015-5532091f6026?w=800",
    rating: 4.6,
    description: "Thành phố ngàn hoa với khí hậu mát mẻ quanh năm",
    category: "city",
  },
  {
    id: "5",
    name: "Bãi biển Mỹ Khê",
    location: "Đà Nẵng",
    image: "https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=800",
    rating: 4.8,
    description: "Một trong những bãi biển đẹp nhất hành tinh",
    category: "beach",
  },
  {
    id: "6",
    name: "Phú Quốc",
    location: "Kiên Giang",
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800",
    rating: 4.7,
    description: "Đảo ngọc với bãi cát trắng mịn và hải sản tươi ngon",
    category: "beach",
  },
  {
    id: "7",
    name: "Hoàng thành Thăng Long",
    location: "Hà Nội",
    image: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
    rating: 4.5,
    description: "Di sản văn hóa thế giới UNESCO với lịch sử nghìn năm",
    category: "historical",
  },
  {
    id: "8",
    name: "Cố đô Huế",
    location: "Thừa Thiên Huế",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    rating: 4.6,
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
