import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

export interface WishlistItem {
  id: string;
  place_id: string;
  place_name: string;
  place_address?: string;
  place_image?: string;
  place_rating?: number;
  place_category?: string;
  created_at: string;
}

interface FavoritesContextType {
  favorites: string[];
  wishlistItems: WishlistItem[];
  loading: boolean;
  toggleFavorite: (place: {
    id: string;
    name: string;
    address?: string;
    image?: string;
    rating?: number;
    category?: string;
  }) => Promise<void>;
  isFavorite: (id: string) => boolean;
  removeFavorite: (placeId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [localFavorites, setLocalFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("vietspots_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch wishlist from Supabase when user is logged in
  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setFavorites(localFavorites);
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const items: WishlistItem[] = (data || []).map((item) => ({
        id: item.id,
        place_id: item.place_id,
        place_name: item.place_name,
        place_address: item.place_address || undefined,
        place_image: item.place_image || undefined,
        place_rating: item.place_rating ? Number(item.place_rating) : undefined,
        place_category: item.place_category || undefined,
        created_at: item.created_at,
      }));

      setWishlistItems(items);
      setFavorites(items.map((item) => item.place_id));
      setHasFetched(true);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      // On error, still mark as fetched to prevent infinite retries
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }, [user]); // Remove localFavorites from dependencies to prevent loops

  // Fetch only once when user changes
  useEffect(() => {
    if (user && !hasFetched) {
      fetchWishlist();
    } else if (!user) {
      setFavorites(localFavorites);
      setWishlistItems([]);
      setHasFetched(false);
    }
  }, [user, hasFetched, fetchWishlist, localFavorites]);

  // Save local favorites to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem("vietspots_favorites", JSON.stringify(localFavorites));
      setFavorites(localFavorites);
    }
  }, [localFavorites, user]);

  const toggleFavorite = async (place: {
    id: string;
    name: string;
    address?: string;
    image?: string;
    rating?: number;
    category?: string;
  }) => {
    const isCurrentlyFavorite = favorites.includes(place.id);

    if (!user) {
      // Guest mode - use localStorage
      if (isCurrentlyFavorite) {
        setLocalFavorites((prev) => prev.filter((id) => id !== place.id));
        toast.success(t('messages.removed_favorite'));
      } else {
        setLocalFavorites((prev) => [...prev, place.id]);
        toast.success(t('messages.saved_favorite'));
      }
      return;
    }

    // Logged in - sync with Supabase
    try {
      if (isCurrentlyFavorite) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", user.id)
          .eq("place_id", place.id);

        if (error) throw error;

        setFavorites((prev) => prev.filter((id) => id !== place.id));
        setWishlistItems((prev) => prev.filter((item) => item.place_id !== place.id));
        toast.success(t('messages.removed_favorite'));
      } else {
        const { data, error } = await supabase
          .from("wishlists")
          .insert({
            user_id: user.id,
            place_id: place.id,
            place_name: place.name,
            place_address: place.address,
            place_image: place.image,
            place_rating: place.rating,
            place_category: place.category,
          })
          .select()
          .single();

        if (error) throw error;

        const newItem: WishlistItem = {
          id: data.id,
          place_id: data.place_id,
          place_name: data.place_name,
          place_address: data.place_address || undefined,
          place_image: data.place_image || undefined,
          place_rating: data.place_rating ? Number(data.place_rating) : undefined,
          place_category: data.place_category || undefined,
          created_at: data.created_at,
        };

        setFavorites((prev) => [...prev, place.id]);
        setWishlistItems((prev) => [newItem, ...prev]);
        toast.success(t('messages.saved_favorite'));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error(t('messages.error_occurred_apology'));
    }
  };

  const removeFavorite = async (placeId: string) => {
    if (!user) {
      setLocalFavorites((prev) => prev.filter((id) => id !== placeId));
      toast.success(t('messages.removed_favorite'));
      return;
    }

    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", user.id)
        .eq("place_id", placeId);

      if (error) throw error;

      setFavorites((prev) => prev.filter((id) => id !== placeId));
      setWishlistItems((prev) => prev.filter((item) => item.place_id !== placeId));
      toast.success(t('messages.removed_favorite'));
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error(t('messages.error_occurred_apology'));
    }
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const refreshWishlist = useCallback(async () => {
    setHasFetched(false);
    await fetchWishlist();
  }, [fetchWishlist]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        wishlistItems,
        loading,
        toggleFavorite,
        isFavorite,
        removeFavorite,
        refreshWishlist,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}