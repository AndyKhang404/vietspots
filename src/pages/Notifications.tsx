import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import { Bell, MapPin, Star, Gift, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

// Notification items are localized below inside the component using i18n

export default function Notifications() {
  const { t } = useTranslation();

  const STORAGE_KEY = 'vietspots_notifications_read';

  const baseNotifications = [
    {
      id: '1',
      type: 'promo',
      icon: Gift,
      title: t('notifications.items.promo.title'),
      message: t('notifications.items.promo.message'),
      time: t('notifications.items.promo.time'),
      read: false,
    },
    {
      id: '2',
      type: 'place',
      icon: MapPin,
      title: t('notifications.items.place.title'),
      message: t('notifications.items.place.message'),
      time: t('notifications.items.place.time'),
      read: false,
    },
    {
      id: '3',
      type: 'review',
      icon: Star,
      title: t('notifications.items.review.title'),
      message: t('notifications.items.review.message'),
      time: t('notifications.items.review.time'),
      read: true,
    },
    {
      id: '4',
      type: 'promo',
      icon: Gift,
      title: t('notifications.items.promo2.title'),
      message: t('notifications.items.promo2.message'),
      time: t('notifications.items.promo2.time'),
      read: true,
    },
  ];

  // Load persisted read flags (map of id -> boolean) and merge with baseNotifications
  const loadReadMap = (): Record<string, boolean> => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch { }
    return {};
  };

  const initialNotifications = (() => {
    const readMap = typeof window !== 'undefined' ? loadReadMap() : {};
    return baseNotifications.map(n => ({ ...n, read: readMap[n.id] ?? n.read }));
  })();

  const [notifications, setNotifications] = useState(initialNotifications);

  // Persist read flags whenever notifications change
  useEffect(() => {
    try {
      const map: Record<string, boolean> = {};
      for (const n of notifications) map[n.id] = !!n.read;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch { }
  }, [notifications]);

  // Mark a single notification as read
  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('notifications.title')}</h1>
              <p className="text-muted-foreground">{t('notifications.subtitle')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
            <Check className="h-4 w-4" />
            {t('notifications.mark_all_read')}
          </Button>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.map((notif, index) => (
            <div
              key={notif.id}
              onClick={() => markRead(notif.id)}
              className={`flex gap-4 p-5 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer animate-in fade-in slide-in-from-left-4 ${notif.read
                ? "bg-card border-border"
                : "bg-secondary/50 border-primary/20"
                }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${notif.read ? "bg-muted" : "bg-primary/10"
                  }`}
              >
                <notif.icon className={`h-6 w-6 ${notif.read ? "text-muted-foreground" : "text-primary"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className={`font-semibold ${notif.read ? "text-muted-foreground" : "text-foreground"}`}>
                    {notif.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{notif.time}</span>
                    {!notif.read && (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mt-1">{notif.message}</p>
              </div>
            </div>
          ))}

        </div>

        <Chatbot />
      </div>

    </Layout>
  );
}
