import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Star, Trash2, Loader2 } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export default function Favorites() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wishlistItems, loading, removeFavorite, refreshWishlist } = useFavorites();

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-primary fill-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('favorites.title')}</h1>
              <p className="text-muted-foreground">{t('favorites.description')}</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground bg-secondary px-4 py-2 rounded-full">
            {t('messages.places_loaded', { count: wishlistItems.length })}
          </span>
        </div>

        {/* Login prompt for guests */}
        {!user && (
          <div className="bg-muted/50 rounded-xl p-6 mb-6 text-center">
            <p className="text-muted-foreground mb-3">
              {t('messages.login_to_sync_favorites')}
            </p>
            <Button onClick={() => navigate("/auth")} variant="outline">
              {t('auth.login')}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : wishlistItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {wishlistItems.map((item, index) => (
              <div
                key={item.id}
                className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/place/${item.place_id}`)}
              >
                <div className="relative h-44 lg:h-52 overflow-hidden">
                  {item.place_image ? (
                    <img
                      src={item.place_image}
                      alt={item.place_name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <MapPin className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm transition-all duration-200 hover:scale-110 shadow-lg text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(item.place_id);
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                  {item.place_rating && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-card/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold">{item.place_rating}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 lg:p-5">
                  <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                    {item.place_name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleString(i18n.language || 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {item.place_address && (
                    <div className="flex items-center gap-1.5 text-primary mt-1.5">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm truncate">{item.place_address}</span>
                    </div>
                  )}
                  {item.place_category && (
                    <Badge variant="secondary" className="mt-2">
                      {item.place_category}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 animate-in fade-in zoom-in-95">
            <div className="h-24 w-24 rounded-full bg-secondary mx-auto mb-6 flex items-center justify-center">
              <Heart className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('favorites.empty')}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t('ui.press_heart_to_save')}
            </p>
          </div>
        )}
      </div>

      <Chatbot />
    </Layout>
  );
}