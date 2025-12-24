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
  category?: string;
  isFavorite?: boolean;
  onFavoriteToggle?: (place: {
    id: string;
    name: string;
    address?: string;
    image?: string;
    rating?: number;
    category?: string;
  }) => void;
  className?: string;
}

export default function PlaceCard({
  id,
  name,
  location,
  image,
  rating,
  description,
  category,
  isFavorite = false,
  onFavoriteToggle,
  className,
}: PlaceCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.({
      id,
      name,
      address: location,
      image,
      rating,
      category,
    });
  };

  return (
    <div className={cn(
      "bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer",
      className
    )}>
      <div className="relative h-44 lg:h-52 overflow-hidden">
        <img
          src={image.includes('?') ? image : `${image}?w=600&h=400&fit=crop&q=80`}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-3 right-3 h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm transition-all duration-200 hover:scale-110 shadow-lg",
            isFavorite && "text-primary bg-primary/20"
          )}
          onClick={handleFavoriteClick}
        >
          <Heart className={cn("h-5 w-5 transition-all duration-200", isFavorite && "fill-current scale-110")} />
        </Button>
        {rating > 0 ? (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-card/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-card/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
            <Star className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Mới</span>
          </div>
        )}
      </div>
      <div className="p-4 lg:p-5">
        <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-primary transition-colors">{name}</h3>
        <div className="flex items-center gap-1.5 text-primary mt-1.5">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">{location}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}