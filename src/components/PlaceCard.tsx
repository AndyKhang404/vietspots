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
  className?: string;
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
  className,
}: PlaceCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group",
      className
    )}>
      <div className="relative h-40 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-2 right-2 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm transition-all duration-200 hover:scale-110",
            isFavorite && "text-primary bg-primary/20"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle?.(id);
          }}
        >
          <Heart className={cn("h-4 w-4 transition-all duration-200", isFavorite && "fill-current scale-110")} />
        </Button>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full px-2 py-1">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-medium">{rating}</span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{name}</h3>
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
