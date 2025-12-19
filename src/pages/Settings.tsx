import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import LanguageSelector from "@/components/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Globe,
  Moon,
  HelpCircle,
  LogOut,
  LogIn,
  ChevronRight,
  Shield,
  Palette,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [languageOpen, setLanguageOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: t('settings.logout'),
    });
    navigate('/');
  };

  const getCurrentLanguageName = () => {
    return i18n.language === 'vi' ? 'Tiếng Việt' : 'English';
  };

  const settingsGroups = [
    {
      title: t('settings.account'),
      items: [
        { icon: User, label: t('settings.personalInfo'), hasArrow: true, onClick: () => {} },
        { icon: Bell, label: t('settings.notifications'), hasArrow: true, onClick: () => {} },
        { icon: Shield, label: "Bảo mật", hasArrow: true, onClick: () => {} },
      ],
    },
    {
      title: t('settings.appearance'),
      items: [
        { 
          icon: Moon, 
          label: t('settings.darkMode'), 
          hasSwitch: true,
          checked: theme === 'dark',
          onToggle: toggleTheme
        },
        { 
          icon: Globe, 
          label: t('settings.language'), 
          value: getCurrentLanguageName(), 
          hasArrow: true,
          onClick: () => setLanguageOpen(true)
        },
        { icon: Palette, label: "Chủ đề màu", value: "Đỏ/Hồng", hasArrow: true, onClick: () => {} },
      ],
    },
    {
      title: t('settings.support'),
      items: [
        { icon: HelpCircle, label: t('settings.helpCenter'), hasArrow: true, onClick: () => {} },
      ],
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('settings.title')}</h1>
            <p className="text-muted-foreground">Quản lý tài khoản và tùy chọn</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <div className="text-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {user?.user_metadata?.full_name || t('auth.guest')}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {user?.email || t('auth.noAccount')}
                </p>
                
                {/* Login/Logout Button */}
                {user ? (
                  <button 
                    onClick={handleLogout}
                    className="w-full mt-6 flex items-center justify-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">{t('settings.logout')}</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate('/auth')}
                    className="w-full mt-6 flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <LogIn className="h-5 w-5" />
                    <span className="font-medium">{t('settings.login')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Settings Groups */}
          <div className="lg:col-span-2 space-y-6">
            {settingsGroups.map((group, groupIndex) => (
              <div 
                key={group.title}
                className="animate-in fade-in slide-in-from-right-4"
                style={{ animationDelay: `${groupIndex * 100}ms` }}
              >
                <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                  {group.title}
                </h3>
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  {group.items.map((item, index) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={`w-full flex items-center justify-between p-4 lg:p-5 hover:bg-secondary/50 transition-colors ${
                        index !== group.items.length - 1
                          ? "border-b border-border"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                          <item.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="text-foreground font-medium">{item.label}</span>
                      </div>
                      {item.hasArrow && (
                        <div className="flex items-center gap-3">
                          {item.value && (
                            <span className="text-sm text-muted-foreground">
                              {item.value}
                            </span>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      {item.hasSwitch && (
                        <Switch 
                          checked={item.checked} 
                          onCheckedChange={item.onToggle}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* App Version */}
            <p className="text-center text-sm text-muted-foreground pt-4">
              VietSpots {t('settings.version')} 1.0.0
            </p>
          </div>
        </div>
      </div>

      <LanguageSelector open={languageOpen} onOpenChange={setLanguageOpen} />
      <Chatbot />
    </Layout>
  );
}
