import { useState } from "react";
import Layout from "@/components/Layout";
import PlaceCard from "@/components/PlaceCard";
import Chatbot from "@/components/Chatbot";
import { Heart } from "lucide-react";

const savedPlaces = [
  {
    id: "1",
    name: "Vịnh Hạ Long",
    location: "Quảng Ninh",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
    rating: 4.9,
    description: "Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi hùng vĩ",
  },
  {
    id: "2",
    name: "Phố cổ Hội An",
    location: "Quảng Nam",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
    rating: 4.8,
    description: "Thương cảng cổ với kiến trúc độc đáo và đèn lồng rực rỡ",
  },
];

export default function Favorites() {
  const [favorites, setFavorites] = useState<string[]>(
    savedPlaces.map((p) => p.id)
  );
  const [places, setPlaces] = useState(savedPlaces);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f !== id));
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="h-5 w-5 text-primary fill-primary" />
          <h2 className="text-xl font-bold text-foreground">Yêu thích</h2>
        </div>

        {places.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                {...place}
                isFavorite={favorites.includes(place.id)}
                onFavoriteToggle={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">
              Chưa có địa điểm yêu thích
            </h3>
            <p className="text-sm text-muted-foreground">
              Nhấn vào biểu tượng trái tim để lưu địa điểm yêu thích của bạn
            </p>
          </div>
        )}
      </div>

      <Chatbot />
    </Layout>
  );
}
