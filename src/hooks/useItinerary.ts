import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import vietSpotAPI, { DayItinerary } from "@/api/vietspot";
import { cleanAddress } from "@/lib/utils";

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [currentItinerary, _setCurrentItinerary] = useState<DayItinerary[] | null>(() => {
    try {
      const raw = sessionStorage.getItem("vietspot_current_itinerary");
      return raw ? (JSON.parse(raw) as DayItinerary[]) : null;
    } catch (err) {
      console.warn("Could not read persisted itinerary", err);
      return null;
    }
  });

  const setCurrentItinerary = (it: DayItinerary[] | null) => {
    try {
      if (it === null) sessionStorage.removeItem("vietspot_current_itinerary");
      else sessionStorage.setItem("vietspot_current_itinerary", JSON.stringify(it));
    } catch (err) {
      console.warn("Could not persist itinerary", err);
    }
    _setCurrentItinerary(it);
  };
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
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        setItineraries([]);
        setLoading(false);
        return;
      }

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) console.error('getUser error', userErr);
      const currentUser = userData?.user;
      const dbUserId = currentUser?.id || user?.id;

      const { data: result, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("user_id", dbUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Supabase error saving itinerary:', error);
        throw error;
      }

      setItineraries(
        (result || []).map((item) => ({
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

  // Generate a new itinerary using the Chat API
  const generateItinerary = async (params: {
    destination: string;
    days: number;
    budget?: string;
    preferences?: string[];
  }) => {
    setGenerating(true);
    try {
      // Build a natural language prompt for the chatbot
      const prefsText = params.preferences?.length
        ? (i18n.language && i18n.language.startsWith('vi') ? ` với sở thích: ${params.preferences.join(", ")}` : ` with preferences: ${params.preferences.join(", ")}`)
        : "";
      const budgetText = params.budget
        ? (i18n.language && i18n.language.startsWith('vi')
          ? ` ngân sách ${params.budget === "low" ? "tiết kiệm" : params.budget === "high" ? "cao cấp" : "trung bình"}`
          : ` with ${params.budget === "low" ? "low" : params.budget === "high" ? "high-end" : "medium"} budget`)
        : "";

      const message = (i18n.language && i18n.language.startsWith('vi'))
        ? `Hãy lập lịch trình du lịch ${params.days} ngày ở ${params.destination}${budgetText}${prefsText}. Trả về chi tiết từng ngày với thời gian và địa điểm cụ thể.`
        : `Please create a ${params.days}-day itinerary in ${params.destination}${budgetText}${prefsText}. Return a detailed day-by-day plan with times and places.`;

      // Call the chat API
      const response = await vietSpotAPI.chat({
        message,
        session_id: sessionStorage.getItem("vietspot_itinerary_session") || undefined,
      });

      // Save session for continuity
      if (response.session_id) {
        sessionStorage.setItem("vietspot_itinerary_session", response.session_id);
      }

      // Check if response has itinerary data
      if (response.itinerary && response.itinerary.length > 0) {
        // Sanitize addresses coming from the chat API (remove plus codes / zip codes)
        const sanitized = response.itinerary.map((day) => ({
          ...day,
          activities: day.activities.map((act) => ({
            ...act,
            place: {
              ...act.place,
              address: cleanAddress((act.place as any).address),
            },
          })),
        }));

        setCurrentItinerary(sanitized);
        toast.success(t('messages.itinerary_created'));
        return sanitized;
      }

      // Try to parse from places if no itinerary
      if (response.places && response.places.length > 0) {
        // Create a simple itinerary from returned places
        const generatedItinerary: DayItinerary[] = [];
        const placesPerDay = Math.ceil(response.places.length / params.days);

        for (let day = 1; day <= params.days; day++) {
          const dayPlaces = response.places.slice(
            (day - 1) * placesPerDay,
            day * placesPerDay
          );

          const activities = dayPlaces.map((place, idx) => {
            const hour = 8 + idx * 2; // Start at 8AM, 2 hours per activity
            return {
              time: `${hour.toString().padStart(2, "0")}:00`,
              place: {
                ...place,
                place_id: place.place_id || place.id,
              },
              duration: i18n.language && i18n.language.startsWith('vi') ? '2 giờ' : '2h',
              notes: place.description || undefined,
            };
          });

          // sanitize addresses for generated places
          activities.forEach((a) => {
            if (a.place && 'address' in a.place) {
              (a.place as any).address = cleanAddress((a.place as any).address);
            }
          });

          generatedItinerary.push({
            day,
            activities,
          });
        }

        if (generatedItinerary.length > 0) {
          setCurrentItinerary(generatedItinerary);
          toast.success(t('messages.itinerary_created_from_suggestions'));
          return generatedItinerary;
        }
      }

      // No itinerary or places returned
      // chat response returned but no itinerary/places: not logging in production
      toast.error(t('messages.cannot_create_itinerary'));
      return null;
    } catch (error) {
      console.error("Error generating itinerary:", error);
      toast.error(t('messages.cannot_create_itinerary'));
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
    // Ensure authenticated session/user
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) {
      toast.error(t('messages.login_to_save_itinerary'));
      return null;
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.error('getUser error', userErr);
    const currentUser = userData?.user;
    const dbUserId = currentUser?.id || user?.id;
    if (!dbUserId) {
      toast.error(t('messages.login_to_save_itinerary'));
      return null;
    }

    try {
      const shareToken = params.is_public
        ? Math.random().toString(36).substring(2, 15)
        : null;

      const insertData = {
        id: crypto.randomUUID(),
        user_id: dbUserId,
        title: params.title,
        destination: params.destination,
        days: params.days,
        budget: params.budget || null,
        preferences: params.preferences || [],
        itinerary_data: JSON.parse(JSON.stringify(params.itinerary_data)),
        is_public: params.is_public || false,
        share_token: shareToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from("itineraries")
        .insert([insertData] as never)
        .select('id,user_id,title,destination,days,budget,preferences,itinerary_data,is_public,share_token,created_at,updated_at')
        .single();

      // itineraries.insert result (debug suppressed)

      if (error) {
        console.error('Supabase itineraries insert error', error);
        throw error;
      }

      toast.success(t('messages.itinerary_saved'));
      // Refresh list to ensure server-side defaults and RLS are reflected
      await fetchItineraries();
      return inserted;
    } catch (error: any) {
      console.error("Error saving itinerary:", error);
      const msg = error?.message || JSON.stringify(error);
      toast.error(`${t('messages.cannot_create_itinerary')} ${msg}`);
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

      toast.success(t('itinerary.updated'));
      await fetchItineraries();
      return true;
    } catch (error) {
      console.error("Error updating itinerary:", error);
      toast.error(t('messages.error_occurred_apology'));
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

      toast.success(t('itinerary.deleted'));
      await fetchItineraries();
      return true;
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      toast.error(t('messages.error_occurred_apology'));
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