import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import vietSpotAPI, { DayItinerary } from "@/api/vietspot";

export interface SavedItinerary {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  days: number;
  budget: string | null;
  preferences: string[];
  itinerary_data: DayItinerary[];
  is_public: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export function useItinerary() {
  const { user } = useAuth();
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [currentItinerary, setCurrentItinerary] = useState<DayItinerary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch user's saved itineraries
  const fetchItineraries = useCallback(async () => {
    if (!user) {
      setItineraries([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItineraries(
        (data || []).map((item) => ({
          ...item,
          preferences: item.preferences || [],
          itinerary_data: item.itinerary_data as unknown as DayItinerary[],
        }))
      );
    } catch (error) {
      console.error("Error fetching itineraries:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Generate a new itinerary using the backend API
  const generateItinerary = async (params: {
    destination: string;
    days: number;
    budget?: string;
    preferences?: string[];
  }) => {
    setGenerating(true);
    try {
      const response = await vietSpotAPI.generateItinerary({
        destination: params.destination,
        days: params.days,
        preferences: params.preferences,
      });

      // Handle different response formats
      let itineraryData: DayItinerary[] | null = null;
      
      if (Array.isArray(response)) {
        // Direct array response
        itineraryData = response as DayItinerary[];
      } else if (response && typeof response === 'object') {
        // Object with data property
        if ('data' in response && Array.isArray(response.data)) {
          itineraryData = response.data as DayItinerary[];
        } else if ('itinerary' in response && Array.isArray(response.itinerary)) {
          itineraryData = response.itinerary as DayItinerary[];
        }
      }

      if (itineraryData && itineraryData.length > 0) {
        setCurrentItinerary(itineraryData);
        toast.success("Lịch trình đã được tạo!");
        return itineraryData;
      } else {
        console.error("Invalid itinerary response:", response);
        toast.error("Không thể tạo lịch trình. Vui lòng thử lại.");
        return null;
      }
    } catch (error) {
      console.error("Error generating itinerary:", error);
      toast.error("Không thể tạo lịch trình. Vui lòng thử lại.");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  // Save itinerary to Supabase
  const saveItinerary = async (params: {
    title: string;
    destination: string;
    days: number;
    budget?: string;
    preferences?: string[];
    itinerary_data: DayItinerary[];
    is_public?: boolean;
  }) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để lưu lịch trình");
      return null;
    }

    try {
      const shareToken = params.is_public
        ? Math.random().toString(36).substring(2, 15)
        : null;

      const insertData = {
        user_id: user.id,
        title: params.title,
        destination: params.destination,
        days: params.days,
        budget: params.budget || null,
        preferences: params.preferences || [],
        itinerary_data: JSON.parse(JSON.stringify(params.itinerary_data)),
        is_public: params.is_public || false,
        share_token: shareToken,
      };

      const { data, error } = await supabase
        .from("itineraries")
        .insert([insertData] as never)
        .select()
        .single();

      if (error) throw error;

      toast.success("Lịch trình đã được lưu!");
      await fetchItineraries();
      return data;
    } catch (error) {
      console.error("Error saving itinerary:", error);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
      return null;
    }
  };

  // Update an itinerary
  const updateItinerary = async (
    id: string,
    updates: Partial<{
      title: string;
      itinerary_data: DayItinerary[];
      is_public: boolean;
    }>
  ) => {
    if (!user) return false;

    try {
      const updateData: Record<string, unknown> = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
      if (updates.itinerary_data !== undefined) {
        updateData.itinerary_data = updates.itinerary_data as unknown as Record<string, unknown>;
      }

      const { error } = await supabase
        .from("itineraries")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Lịch trình đã được cập nhật!");
      await fetchItineraries();
      return true;
    } catch (error) {
      console.error("Error updating itinerary:", error);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
      return false;
    }
  };

  // Delete an itinerary
  const deleteItinerary = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("itineraries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Lịch trình đã được xóa!");
      await fetchItineraries();
      return true;
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
      return false;
    }
  };

  // Get a public itinerary by share token
  const getPublicItinerary = async (shareToken: string) => {
    try {
      const { data, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("share_token", shareToken)
        .eq("is_public", true)
        .single();

      if (error) throw error;

      return data
        ? {
            ...data,
            preferences: data.preferences || [],
            itinerary_data: data.itinerary_data as unknown as DayItinerary[],
          }
        : null;
    } catch (error) {
      console.error("Error fetching public itinerary:", error);
      return null;
    }
  };

  // Generate share URL
  const getShareUrl = (itinerary: SavedItinerary) => {
    if (!itinerary.share_token) return null;
    return `${window.location.origin}/itinerary/shared/${itinerary.share_token}`;
  };

  return {
    itineraries,
    currentItinerary,
    loading,
    generating,
    fetchItineraries,
    generateItinerary,
    saveItinerary,
    updateItinerary,
    deleteItinerary,
    getPublicItinerary,
    getShareUrl,
    setCurrentItinerary,
  };
}