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
        { 
          icon: Globe, 
          label: t('settings.language'), 
          value: getCurrentLanguageName(), 
          hasArrow: true,
          onClick: () => setLanguageOpen(true)
        },
      ],
    },
    {
      title: t('settings.appearance'),
      items: [{ 
        icon: Moon, 
        label: t('settings.darkMode'), 
        hasSwitch: true,
        checked: theme === 'dark',
        onToggle: toggleTheme
      }],
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
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{t('settings.title')}</h2>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {user?.user_metadata?.full_name || t('auth.guest')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {user?.email || t('auth.noAccount')}
              </p>
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
                    onClick={item.onClick}
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
        </div>

        {/* Login/Logout Button */}
        {user ? (
          <button 
            onClick={handleLogout}
            className="w-full mt-6 flex items-center justify-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">{t('settings.logout')}</span>
          </button>
        ) : (
          <button 
            onClick={() => navigate('/auth')}
            className="w-full mt-6 flex items-center justify-center gap-2 p-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <LogIn className="h-5 w-5" />
            <span className="font-medium">{t('settings.login')}</span>
          </button>
        )}

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          VietSpots v1.0.0
        </p>
      </div>

      <LanguageSelector open={languageOpen} onOpenChange={setLanguageOpen} />
      <Chatbot />
    </Layout>
  );
}
