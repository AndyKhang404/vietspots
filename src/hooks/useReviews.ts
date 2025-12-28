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

  // Fetch reviews (stored as `comments` in Supabase schema) for a place
  const fetchReviews = useCallback(async () => {
    if (!placeId) return;

    setLoading(true);
    try {
      // Query the `comments` table and include any linked `images` rows
      const res = await (supabase as any)
        .from("comments")
        .select(`*, images (*)`)
        .eq("place_id", placeId)
        .order("created_at", { ascending: false });

      if (res.error) {
        console.error('Supabase error fetching comments:', res.error);
        toast.error(t('review.fetch_error') || `Không thể tải đánh giá: ${res.error.message || res.error}`);
        setReviews([]);
        setLoading(false);
        return;
      }

      const localReviews = (res.data as any[]) || [];

      // Fetch user profiles for these comments from `users` table
      const userIds = localReviews.map((r) => r.user_id).filter(Boolean) || [];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: p } = await (supabase as any)
          .from("users")
          .select("id, name, avatar_url")
          .in("id", userIds);
        profiles = p || [];
      }

      const profileMap = new Map(profiles.map((p) => [p.id, { name: p.name, avatar: p.avatar_url }]));

      // Map rows to Review[] (keep `review_id` naming for compatibility in UI)
      const localFormatted: Review[] = localReviews.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        place_id: r.place_id,
        rating: Number(r.rating) || 0,
        content: r.text ?? null,
        created_at: r.created_at || r.date || new Date().toISOString(),
        updated_at: r.created_at || r.date || new Date().toISOString(),
        images: (r.images || []).map((img: any) => ({ id: img.id, review_id: r.id, image_url: img.url, created_at: img.uploaded_at })),
        user_name: (() => {
          // Prefer linked `users` table name when available
          const u = r.user_id ? profileMap.get(r.user_id) : undefined;
          if (u?.name) return u.name;
          // If comment has an `author` field (scraped or manual), use it
          if (r.author) return r.author;
          // If this comment belongs to current authenticated user, try their profile
          if (user && r.user_id === user.id) return (user.user_metadata as any)?.full_name || (user as any).name || user.email;
          return "Người dùng";
        })(),
        user_avatar: (() => {
          const u = r.user_id ? profileMap.get(r.user_id) : undefined;
          if (u?.avatar) return u.avatar;
          if (user && r.user_id === user.id) return (user.user_metadata as any)?.avatar_url || (user as any).avatar_url || undefined;
          return undefined;
        })(),
      } as Review));

      // Attempt to fetch external API comments, but don't fail the whole flow if it errors
      let apiFormatted: Review[] = [];
      try {
        const apiComments = await vietSpotAPI.getPlaceComments(placeId);
        apiFormatted = (apiComments || []).map((c: any) => ({
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
      } catch (apiErr) {
        // Log and continue with local results only, but surface a warning so we can debug missing external comments
        // eslint-disable-next-line no-console
        console.warn('Failed to fetch external comments, continuing with local reviews only', apiErr);
        toast.error(t('review.external_fetch_warning') || 'Không thể tải bình luận từ API ngoài, chỉ hiển thị bình luận cục bộ');
      }

      // Combine local + external, but deduplicate (prefer local comments over external)
      const byKey = new Map<string, Review>();

      // Add local (comments table) first so they take precedence
      for (const r of localFormatted) {
        if (r.id) {
          byKey.set(String(r.id), r);
        } else {
          const key = `${r.user_id}_${r.created_at}_${(r.content || '').slice(0, 50)}`;
          byKey.set(key, r);
        }
      }

      // Add apiFormatted only if not duplicated
      for (const r of apiFormatted) {
        if (r.id) {
          if (!byKey.has(String(r.id))) byKey.set(String(r.id), r);
        } else {
          const key = `${r.user_id}_${r.created_at}_${(r.content || '').slice(0, 50)}`;
          if (!byKey.has(key)) byKey.set(key, r);
        }
      }

      const combined = Array.from(byKey.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setReviews(combined);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
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
      // Insert directly into `comments` table
      const { data: comment, error } = await (supabase as any).from('comments').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        place_id: placeId,
        rating,
        text: content || null,
        author: (user.user_metadata as any)?.full_name || null,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }).select().single();

      if (error) {
        console.error('Error inserting comment:', error);
        throw error;
      }

      // If images provided, upload to Supabase Storage and insert into `images` table
      if (imageFiles && imageFiles.length > 0) {
        const bucket = (import.meta as any).env?.VITE_SUPABASE_IMAGES_BUCKET || 'images';
        for (const file of imageFiles) {
          try {
            const fileName = `${user.id}/${comment.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file as File);
            if (uploadError) {
              console.error('Image upload error:', uploadError);
              toast.error(t('review.image_upload_error') || 'Image upload failed');
              continue;
            }

            const { publicURL, error: publicUrlErr } = supabase.storage.from(bucket).getPublicUrl(fileName) as any;
            // Older Supabase client returns { data: { publicUrl } } in some setups; handle both
            let url: string | undefined = undefined;
            if (publicUrlErr) {
              console.warn('getPublicUrl error:', publicUrlErr);
            }
            if (publicURL) url = publicURL;
            else if ((publicUrlErr == null) && (publicURL == null)) {
              // try alternate shape
              const { data: pu } = supabase.storage.from(bucket).getPublicUrl(fileName) as any;
              url = pu?.publicUrl || pu?.publicURL || undefined;
            }

            if (!url) {
              console.warn('Could not determine public URL for uploaded image');
              toast.error(t('review.image_save_error') || 'Could not get public URL for image');
              continue;
            }

            const { error: imgErr } = await (supabase as any).from('images').insert({
              id: crypto.randomUUID(),
              place_id: placeId,
              comment_id: comment.id,
              url,
            });
            if (imgErr) {
              console.error('Error inserting images row:', imgErr);
              toast.error(t('review.image_save_error') || 'Failed to save review image');
            }
          } catch (imgEx) {
            console.error('Exception uploading image:', imgEx);
            toast.error(t('review.image_upload_error') || 'Image upload failed');
          }
        }
      }

      toast.success(t('review.submitted'));
      await fetchReviews();
      return true;
    } catch (err: unknown) {
      const e: any = err;
      console.error("Error submitting review:", err);
      if (e?.code === "23505") {
        toast.error(t('review.already_submitted'));
      } else if (e?.message) {
        toast.error(`${t('review.submit_error')} (${e.message})`);
      } else {
        toast.error(t('review.submit_error'));
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Update a review (comments table)
  const updateReview = async (reviewId: string, rating: number, content: string, imageFiles?: File[]) => {
    if (!user) return false;

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('comments')
        .update({ rating, text: content })
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;

      // If new images were provided while editing, upload them and insert into images table
      if (imageFiles && imageFiles.length > 0) {
        const bucket = (import.meta as any).env?.VITE_SUPABASE_IMAGES_BUCKET || 'images';
        for (const file of imageFiles) {
          try {
            const fileName = `${user.id}/${reviewId}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file as File);
            if (uploadError) {
              console.error('Image upload error (update):', uploadError);
              toast.error(t('review.image_upload_error') || 'Image upload failed');
              continue;
            }

            const { publicURL, error: publicUrlErr } = supabase.storage.from(bucket).getPublicUrl(fileName) as any;
            let url: string | undefined = undefined;
            if (publicUrlErr) {
              console.warn('getPublicUrl error (update):', publicUrlErr);
            }
            if (publicURL) url = publicURL;
            else if ((publicUrlErr == null) && (publicURL == null)) {
              const { data: pu } = supabase.storage.from(bucket).getPublicUrl(fileName) as any;
              url = pu?.publicUrl || pu?.publicURL || undefined;
            }

            if (!url) {
              console.warn('Could not determine public URL for uploaded image (update)');
              toast.error(t('review.image_save_error') || 'Could not get public URL for image');
              continue;
            }

            const { error: imgErr } = await (supabase as any).from('images').insert({
              id: crypto.randomUUID(),
              place_id: placeId,
              comment_id: reviewId,
              url,
            });
            if (imgErr) {
              console.error('Error inserting images row (update):', imgErr);
              toast.error(t('review.image_save_error') || 'Failed to save review image');
            }
          } catch (imgEx) {
            console.error('Exception uploading image (update):', imgEx);
            toast.error(t('review.image_upload_error') || 'Image upload failed');
          }
        }
      }

      toast.success(t('review.update_success'));
      await fetchReviews();
      return true;
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error(t('review.submit_error'));
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a review (comments table)
  const deleteReview = async (reviewId: string) => {
    if (!user) return false;

    try {
      const { error } = await (supabase as any)
        .from('comments')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

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