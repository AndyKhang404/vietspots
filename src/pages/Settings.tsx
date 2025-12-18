import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Globe,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

const settingsGroups = [
  {
    title: "Tài khoản",
    items: [
      { icon: User, label: "Thông tin cá nhân", hasArrow: true },
      { icon: Bell, label: "Cài đặt thông báo", hasArrow: true },
      { icon: Globe, label: "Ngôn ngữ", value: "Tiếng Việt", hasArrow: true },
    ],
  },
  {
    title: "Giao diện",
    items: [{ icon: Moon, label: "Chế độ tối", hasSwitch: true }],
  },
  {
    title: "Hỗ trợ",
    items: [
      { icon: HelpCircle, label: "Trung tâm trợ giúp", hasArrow: true },
    ],
  },
];

export default function Settings() {
  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Cài đặt</h2>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Người dùng</h3>
              <p className="text-sm text-muted-foreground">user@example.com</p>
            </div>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="space-y-6">
          {settingsGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                {group.title}
              </h3>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {group.items.map((item, index) => (
                  <button
                    key={item.label}
                    className={`w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors ${
                      index !== group.items.length - 1
                        ? "border-b border-border"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{item.label}</span>
                    </div>
                    {item.hasArrow && (
                      <div className="flex items-center gap-2">
                        {item.value && (
                          <span className="text-sm text-muted-foreground">
                            {item.value}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    {item.hasSwitch && <Switch />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <button className="w-full mt-6 flex items-center justify-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Đăng xuất</span>
        </button>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          VietSpots v1.0.0
        </p>
      </div>

      <Chatbot />
    </Layout>
  );
}
