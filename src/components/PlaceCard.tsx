import { Heart, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlaceCardProps {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  description: string;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

export default function PlaceCard({
  id,
  name,
  location,
  image,
  rating,
  description,
  isFavorite = false,
  onFavoriteToggle,
}: PlaceCardProps) {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-40">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-2 right-2 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm",
            isFavorite && "text-primary"
          )}
          onClick={() => onFavoriteToggle?.(id)}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </Button>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-full px-2 py-1">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-medium">{rating}</span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-foreground truncate">{name}</h3>
        <div className="flex items-center gap-1 text-primary mt-1">
          <MapPin className="h-3 w-3" />
          <span className="text-xs">{location}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
}
