import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import { Bell, MapPin, Star, Gift } from "lucide-react";

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
  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Thông báo</h2>
        </div>

        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex gap-3 p-4 rounded-xl border transition-colors ${
                notif.read
                  ? "bg-card border-border"
                  : "bg-secondary border-primary/20"
              }`}
            >
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                  notif.read ? "bg-muted" : "bg-primary/10"
                }`}
              >
                <notif.icon
                  className={`h-5 w-5 ${
                    notif.read ? "text-muted-foreground" : "text-primary"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`font-semibold text-sm ${
                      notif.read ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {notif.title}
                  </h3>
                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {notif.message}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {notif.time}
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
