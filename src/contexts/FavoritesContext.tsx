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
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        setLoading(false);
        return;
      }
      // Ensure we query with the authenticated user's id (refresh session)
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr) console.error('getUser error', userErr);
      const currentUser = data?.user;
      const dbUserId = currentUser?.id || user?.id;

      const { data: result, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", dbUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Supabase error inserting/deleting wishlist:', error);
        throw error;
      }

      const items: WishlistItem[] = (result || []).map((item) => ({
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
    } catch (error: any) {
      console.error("Error fetching wishlist:", error);
      const msg = error?.message || JSON.stringify(error);
      toast.error(`${t('messages.cannot_load_favorites') || 'Cannot load favorites.'} ${msg}`);
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

    // Logged in - ensure we have the correct authenticated user
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        toast.error(t('messages.login_required'));
        return;
      }
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        console.error('Failed to get current supabase user', userErr);
      }
      const currentUser = data?.user;
      const dbUserId = currentUser?.id || user?.id;
      if (!dbUserId) {
        toast.error(t('messages.login_required'));
        return;
      }
      if (isCurrentlyFavorite) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", dbUserId)
          .eq("place_id", place.id);

        if (error) throw error;

        setFavorites((prev) => prev.filter((id) => id !== place.id));
        setWishlistItems((prev) => prev.filter((item) => item.place_id !== place.id));
        toast.success(t('messages.removed_favorite'));
      } else {
        const payload: Record<string, any> = {
          user_id: user.id,
          place_id: place.id,
          place_name: place.name,
        };
        if (place.address) payload.place_address = place.address;
        if (place.image) payload.place_image = place.image;
        if (place.rating !== undefined && place.rating !== null) payload.place_rating = place.rating;
        if (place.category) payload.place_category = place.category;

        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("wishlists")
          .insert({ id: crypto.randomUUID(), created_at: now, updated_at: now, ...payload, user_id: dbUserId } as any)
          .select('id,place_id,place_name,place_address,place_image,place_rating,place_category,created_at')
          .single();

        console.debug('wishlists.insert result', { data, error, dbUserId });

        if (error) {
          console.error('Supabase wishlists insert error', error);
          throw error;
        }

        // Try to refresh from DB (handles RLS/defaults); if that fails, fall back to using returned row
        try {
          await fetchWishlist();
        } catch (e) {
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
        }

        toast.success(t('messages.saved_favorite'));
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      const msg = error?.message || JSON.stringify(error);
      toast.error(`${t('messages.error_occurred_apology')} ${msg}`);
    }
  };

  const removeFavorite = async (placeId: string) => {
    if (!user) {
      setLocalFavorites((prev) => prev.filter((id) => id !== placeId));
      toast.success(t('messages.removed_favorite'));
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        toast.error(t('messages.login_required'));
        return;
      }
      const { data, error: userErr } = await supabase.auth.getUser();
      if (userErr) console.error('getUser error', userErr);
      const currentUser = data?.user;
      const dbUserId = currentUser?.id || user?.id;

      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", dbUserId)
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