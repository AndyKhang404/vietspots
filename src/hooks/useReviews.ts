import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import vietSpotAPI from "@/api/vietspot";

export interface Review {
  id: string;
  user_id: string;
  place_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
  images: ReviewImage[];
  user_name?: string;
  user_avatar?: string;
}

export interface ReviewImage {
  id: string;
  review_id: string;
  image_url: string;
  created_at: string;
}

export function useReviews(placeId?: string) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch reviews for a place - from both backend API and local Supabase
  const fetchReviews = useCallback(async () => {
    if (!placeId) return;

    setLoading(true);
    try {
      // Fetch from backend API (Railway) - returns raw array
      const apiComments = await vietSpotAPI.getPlaceComments(placeId);

      // Fetch from local database
      const { data: localReviews, error } = await supabase
        .from("reviews")
        .select(`
          *,
          review_images (*)
        `)
        .eq("place_id", placeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for local reviews
      const userIds = localReviews?.map((r) => r.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, { name: p.full_name, avatar: p.avatar_url }]) || []
      );

      // Format local reviews
      const localFormatted: Review[] = (localReviews || []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        place_id: r.place_id,
        rating: r.rating,
        content: r.content,
        created_at: r.created_at,
        updated_at: r.updated_at,
        images: (r.review_images || []).map((img: { id: string; image_url: string; created_at: string }) => ({
          id: img.id,
          review_id: r.id,
          image_url: img.image_url,
          created_at: img.created_at,
        })),
        user_name:
          profileMap.get(r.user_id)?.name ||
          (user && r.user_id === user.id
            ? (user.user_metadata as any)?.full_name || user.email
            : "Người dùng"),
        user_avatar:
          profileMap.get(r.user_id)?.avatar || (user && r.user_id === user.id ? (user.user_metadata as any)?.avatar_url : undefined) || undefined,
      }));

      // Format API comments to Review shape
      const apiFormatted: Review[] = (apiComments || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id ?? "",
        place_id: c.place_id,
        rating: Number(c.rating) || 0,
        content: c.text ?? null,
        created_at: c.date,
        updated_at: c.date,
        images: (c.images || []).map((img: any, idx: number) => {
          const url = typeof img === "string" ? img : img?.url;
          return {
            id: (typeof img === "object" && img?.id) ? img.id : `${c.id}_${idx}`,
            review_id: c.id,
            image_url: url,
            created_at: c.date,
          };
        }).filter((img: any) => Boolean(img.image_url)),
        user_name: c.author || "Du khách",
      }));

      // Combine and sort by date
      const combined = [...localFormatted, ...apiFormatted].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setReviews(combined);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  // Submit a new review
  const submitReview = async (rating: number, content: string, imageFiles?: File[]) => {
    if (!user || !placeId) {
      toast.error(t('review.login_required'));
      return false;
    }

    setSubmitting(true);
    try {
      // Insert review
      const { data: review, error: reviewError } = await supabase
        .from("reviews")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          place_id: placeId,
          rating,
          content: content || null,
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Upload images if any
      if (imageFiles && imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileName = `${user.id}/${review.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("review-images")
            .upload(fileName, file);

          if (uploadError) {
            console.error("Error uploading image:", uploadError);
            continue;
          }

          const { data: publicUrl } = supabase.storage
            .from("review-images")
            .getPublicUrl(fileName);

          await supabase.from("review_images").insert({
            id: crypto.randomUUID(),
            review_id: review.id,
            image_url: publicUrl.publicUrl,
          });
        }
      }

      toast.success(t('review.submitted'));
      await fetchReviews();
      return true;
    } catch (error: unknown) {
      const err = error as { code?: string };
      console.error("Error submitting review:", error);
      if (err?.code === "23505") {
        toast.error(t('review.already_submitted'));
      } else {
        toast.error(t('review.submit_error'));
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Update a review
  const updateReview = async (reviewId: string, rating: number, content: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("reviews")
        .update({ rating, content })
        .eq("id", reviewId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success(t('review.update_success'));
      await fetchReviews();
      return true;
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error(t('review.submit_error'));
      return false;
    }
  };

  // Delete a review
  const deleteReview = async (reviewId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success(t('review.delete_success'));
      await fetchReviews();
      return true;
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error(t('review.submit_error'));
      return false;
    }
  };

  // Get user's own review for this place
  const getUserReview = useCallback(() => {
    if (!user) return null;
    return reviews.find((r) => r.user_id === user.id);
  }, [user, reviews]);

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return {
    reviews,
    loading,
    submitting,
    fetchReviews,
    submitReview,
    updateReview,
    deleteReview,
    getUserReview,
    averageRating,
    totalReviews: reviews.length,
  };
}