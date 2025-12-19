import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import { Bell, MapPin, Star, Gift, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const notifications = [
  {
    id: "1",
    type: "promo",
    icon: Gift,
    title: "Ưu đãi đặc biệt!",
    message: "Giảm 30% tour Phú Quốc trong tháng này",
    time: "2 giờ trước",
    read: false,
  },
  {
    id: "2",
    type: "place",
    icon: MapPin,
    title: "Địa điểm mới",
    message: "Khám phá Mù Cang Chải - điểm đến hot nhất mùa lúa chín",
    time: "1 ngày trước",
    read: false,
  },
  {
    id: "3",
    type: "review",
    icon: Star,
    title: "Đánh giá mới",
    message: "Vịnh Hạ Long vừa được cập nhật 50+ đánh giá mới",
    time: "2 ngày trước",
    read: true,
  },
  {
    id: "4",
    type: "promo",
    icon: Gift,
    title: "Flash sale!",
    message: "Giảm 50% vé máy bay nội địa - chỉ trong hôm nay",
    time: "3 ngày trước",
    read: true,
  },
];

export default function Notifications() {
  const { t } = useTranslation();

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
              <p className="text-muted-foreground">Cập nhật mới nhất cho bạn</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Check className="h-4 w-4" />
            Đọc tất cả
          </Button>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.map((notif, index) => (
            <div
              key={notif.id}
              className={`flex gap-4 p-5 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer animate-in fade-in slide-in-from-left-4 ${
                notif.read
                  ? "bg-card border-border"
                  : "bg-secondary/50 border-primary/20"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.read ? "bg-muted" : "bg-primary/10"
                }`}
              >
                <notif.icon
                  className={`h-6 w-6 ${
                    notif.read ? "text-muted-foreground" : "text-primary"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3
                    className={`font-semibold ${
                      notif.read ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {notif.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {notif.time}
                    </span>
                    {!notif.read && (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mt-1">
                  {notif.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Chatbot />
    </Layout>
  );
}
