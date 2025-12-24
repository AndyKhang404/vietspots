import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Star,
  Phone,
  Globe,
  Clock,
  Navigation,
  Share2,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useReviews } from "@/hooks/useReviews";
import vietSpotAPI, { PlaceInfo } from "@/api/vietspot";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PlaceDetail() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    reviews,
    loading: reviewsLoading,
    submitting,
    fetchReviews,
    submitReview,
    deleteReview,
    getUserReview,
    averageRating,
    totalReviews,
  } = useReviews(placeId);

  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [newReviewContent, setNewReviewContent] = useState("");
  const [reviewImages, setReviewImages] = useState<File[]>([]);

  useEffect(() => {
    const fetchPlace = async () => {
      if (!placeId) return;

      setLoading(true);
      try {
        const response = await vietSpotAPI.getPlace(placeId);
        if (response.data) {
          setPlace(response.data);
          if (response.data.images && response.data.images.length > 0) {
            setSelectedImage(response.data.images[0]);
          } else if (response.data.image_url) {
            setSelectedImage(response.data.image_url);
          }
        }
      } catch (error) {
        console.error("Error fetching place:", error);
        toast.error("Không thể tải thông tin địa điểm");
      } finally {
        setLoading(false);
      }
    };

    fetchPlace();
    fetchReviews();
  }, [placeId, fetchReviews]);

  const handleSubmitReview = async () => {
    const success = await submitReview(newRating, newReviewContent, reviewImages);
    if (success) {
      setNewReviewContent("");
      setNewRating(5);
      setReviewImages([]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setReviewImages((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: place?.name,
          text: `Khám phá ${place?.name} trên VietSpots!`,
          url,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết!");
    }
  };

  const userReview = getUserReview();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!place) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-10 text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy địa điểm</h1>
          <Button onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
      </Layout>
    );
  }

  const images = place.images || (place.image_url ? [place.image_url] : []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {/* Back Button */}
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image */}
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Image Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={cn(
                      "shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                      selectedImage === img ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Place Info */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                    {place.name}
                  </h1>
                  {place.category && (
                    <Badge variant="secondary" className="mb-3">
                      {place.category}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      toggleFavorite({
                        id: place.place_id,
                        name: place.name,
                        address: place.address,
                        image: images[0],
                        rating: place.rating,
                        category: place.category,
                      })
                    }
                  >
                    <Heart
                      className={cn(
                        "h-5 w-5",
                        isFavorite(place.place_id) && "fill-primary text-primary"
                      )}
                    />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-bold">
                    {(averageRating || place.rating || 0).toFixed(1)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {totalReviews || place.total_comments || 0} đánh giá
                </span>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3 text-muted-foreground mb-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{place.address}</span>
              </div>

              {/* Opening Hours */}
              {place.opening_hours && (
                <div className="flex items-start gap-3 text-muted-foreground mb-3">
                  <Clock className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                  <span>{place.opening_hours}</span>
                </div>
              )}

              {/* Phone */}
              {place.phone && (
                <div className="flex items-center gap-3 text-muted-foreground mb-3">
                  <Phone className="h-5 w-5 text-green-600 shrink-0" />
                  <a href={`tel:${place.phone}`} className="text-green-600 hover:underline">
                    {place.phone}
                  </a>
                </div>
              )}

              {/* Website */}
              {place.website && (
                <div className="flex items-center gap-3 text-muted-foreground mb-4">
                  <Globe className="h-5 w-5 text-blue-600 shrink-0" />
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Website
                  </a>
                </div>
              )}

              {/* Description */}
              {place.description && (
                <p className="text-muted-foreground leading-relaxed">{place.description}</p>
              )}

              {/* Directions Button */}
              <Button
                className="w-full mt-6 gap-2"
                onClick={() => {
                  if (place.latitude && place.longitude) {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`,
                      "_blank"
                    );
                  } else {
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        place.address
                      )}`,
                      "_blank"
                    );
                  }
                }}
              >
                <Navigation className="h-5 w-5" />
                Chỉ đường
              </Button>
            </div>
          </div>

          {/* Right Column - Reviews */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Đánh giá ({totalReviews})
              </h2>

              {/* Write Review Form */}
              {user && !userReview ? (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                  <h3 className="font-semibold mb-3">Viết đánh giá của bạn</h3>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={cn(
                            "h-6 w-6 transition-colors",
                            star <= newRating
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Review Content */}
                  <Textarea
                    value={newReviewContent}
                    onChange={(e) => setNewReviewContent(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    className="mb-3"
                    rows={3}
                  />

                  {/* Image Upload */}
                  <div className="flex items-center gap-2 mb-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <span>
                          <ImageIcon className="h-4 w-4" />
                          Thêm ảnh
                        </span>
                      </Button>
                    </label>
                    {reviewImages.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {reviewImages.length} ảnh đã chọn
                      </span>
                    )}
                  </div>

                  {/* Preview Images */}
                  {reviewImages.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {reviewImages.map((file, i) => (
                        <div key={i} className="relative shrink-0">
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                          <button
                            onClick={() =>
                              setReviewImages((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="w-full gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Gửi đánh giá
                  </Button>
                </div>
              ) : !user ? (
                <div className="mb-6 p-4 bg-muted/50 rounded-xl text-center">
                  <p className="text-muted-foreground mb-3">
                    Đăng nhập để viết đánh giá
                  </p>
                  <Button onClick={() => navigate("/auth")} variant="outline">
                    Đăng nhập
                  </Button>
                </div>
              ) : null}

              {/* Reviews List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {reviewsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : reviews.length > 0 ? (
                    reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={review.user_avatar} />
                              <AvatarFallback>
                                {review.user_name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{review.user_name}</p>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "h-3 w-3",
                                      i < review.rating
                                        ? "fill-yellow-500 text-yellow-500"
                                        : "text-muted-foreground"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {review.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteReview(review.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {review.content && (
                          <p className="text-muted-foreground text-sm mb-2">
                            {review.content}
                          </p>
                        )}
                        {review.images && review.images.length > 0 && (
                          <div className="flex gap-2 mt-2 overflow-x-auto">
                            {review.images.map((img) => (
                              <img
                                key={img.id}
                                src={img.image_url}
                                alt=""
                                className="h-16 w-16 object-cover rounded-lg shrink-0"
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Chưa có đánh giá nào</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      <Chatbot />
    </Layout>
  );
}