import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import Chatbot from "@/components/Chatbot";
import LanguageSelector from "@/components/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, colorThemes, ColorTheme } from "@/contexts/ThemeContext";
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
  Check,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, colorTheme, toggleTheme, setColorTheme } = useTheme();
  const { toast } = useToast();

  const [languageOpen, setLanguageOpen] = useState(false);
  const [colorThemeOpen, setColorThemeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [bio, setBio] = useState(user?.user_metadata?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogout = async () => {
    await signOut();
    toast({
      title: t('settings.logout'),
    });
    navigate('/');
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone,
          bio: bio,
          avatar_url: avatarUrl
        }
      });

      if (error) throw error;

      // Also upsert into public.profiles so server-side reads (RLS / API) see updated profile
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id || user?.id;
        if (userId) {
          // Use upsert on user_id (profiles_user_id_key)
          const { error: profilesError } = await supabase
            .from('profiles')
            .upsert({ user_id: userId, full_name: fullName, avatar_url: avatarUrl, preferences: [] }, { onConflict: 'user_id' });

          if (profilesError) {
            // eslint-disable-next-line no-console
            console.warn('Failed to upsert public.profiles after updating auth user metadata', profilesError);
          }

          // Also upsert into public.users so that the `users` table (if present) reflects the changes
          try {
            const { error: usersError } = await (supabase as any)
              .from('users')
              .upsert({ id: userId, email: user?.email || userData?.user?.email || null, name: fullName || null, avatar_url: avatarUrl || null, phone: phone || null }, { onConflict: 'id' });

            if (usersError) {
              // eslint-disable-next-line no-console
              console.warn('Failed to upsert public.users after updating profile', usersError);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Unexpected error upserting public.users', e);
          }
        }
      } catch (e) {
        // non-fatal: log
        // eslint-disable-next-line no-console
        console.warn('Failed to upsert public.profiles after updating auth user metadata', e);
      }

      toast({ title: t('settings.profile_updated') });
      setProfileOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: t('messages.error_occurred_apology'), variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: t('settings.password_mismatch'), variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: t('settings.password_too_short'), variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({ title: t('settings.password_changed') });
      setSecurityOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error changing password:", error);
      toast({ title: t('messages.error_occurred_apology'), variant: "destructive" });
    }
  };

  const getCurrentLanguageName = () => {
    return i18n.language === 'vi' ? 'Tiếng Việt' : 'English';
  };

  const getCurrentColorThemeName = () => {
    const key = colorThemes.find(ct => ct.value === colorTheme)?.labelKey;
    return key ? t(key) : t('settings.default_color_theme');
  };

  const settingsGroups = [
    {
      title: t('settings.account'),
      items: [
        {
          icon: User,
          label: t('settings.personalInfo'),
          hasArrow: true,
          onClick: () => user ? setProfileOpen(true) : navigate('/auth')
        },
        {
          icon: Bell,
          label: t('settings.notifications'),
          hasArrow: true,
          onClick: () => setNotificationsOpen(true)
        },
        {
          icon: Shield,
          label: t('settings.security'),
          hasArrow: true,
          onClick: () => user ? setSecurityOpen(true) : navigate('/auth')
        },
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
        {
          icon: Palette,
          label: t('settings.color_theme'),
          value: getCurrentColorThemeName(),
          hasArrow: true,
          onClick: () => setColorThemeOpen(true)
        },
      ],
    },
    {
      title: t('settings.support'),
      items: [
        { icon: HelpCircle, label: t('settings.helpCenter'), hasArrow: true, onClick: () => setHelpOpen(true) },
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
            <p className="text-muted-foreground">{t('settings.description')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card (left column on lg+) */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-6">
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
          {/* Settings Groups (right column on lg+) */}
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
                      className={`w-full flex items-center justify-between p-4 lg:p-5 hover:bg-secondary/50 transition-colors ${index !== group.items.length - 1
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

      {/* Language Selector */}
      <LanguageSelector open={languageOpen} onOpenChange={setLanguageOpen} />

      {/* Color Theme Dialog */}
      <Dialog open={colorThemeOpen} onOpenChange={setColorThemeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.choose_color_theme')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {colorThemes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setColorTheme(themeOption.value);
                  setColorThemeOpen(false);
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${colorTheme === themeOption.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
                  }`}
              >
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: themeOption.primary }}
                />
                <span className="font-medium text-foreground">{t(themeOption.labelKey)}</span>
                {colorTheme === themeOption.value && (
                  <Check className="h-5 w-5 text-primary ml-auto" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Center Dialog (placeholder content) */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('settings.helpCenter')}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="mb-2">{t('settings.helpCenter')}: </p>
            <p className="text-sm text-muted-foreground">{t('messages.help_center_placeholder') || 'Trung tâm trợ giúp đang được cập nhật. Vui lòng quay lại sau.'}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('settings.profile_info')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Avatar preview */}
            <div className="flex flex-col items-center gap-3">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
              <div className="w-full">
                <Label htmlFor="avatarUrl">{t('settings.avatar_url')}</Label>
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="fullName">{t('settings.full_name')}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('settings.enter_full_name')}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="phone">{t('settings.phone')}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0123 456 789"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="bio">{t('settings.bio')}</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('settings.bio_placeholder')}
                className="mt-1.5"
              />
            </div>

            {/* Account info */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">{t('settings.account_info')}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('settings.account_created')}</span>
                  <span className="text-foreground">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('settings.last_login')}</span>
                  <span className="text-foreground">
                    {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="w-full">
              {t('settings.save_changes')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.notification_settings')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="font-medium text-foreground">{t('settings.push_notifications')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.push_notifications_desc')}</p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="font-medium text-foreground">{t('settings.email_notifications')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.email_notifications_desc')}</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Dialog */}
      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.change_password')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="newPassword">{t('settings.new_password')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t('settings.confirm_password')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleChangePassword} className="w-full">
              {t('settings.change_password_button')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Chatbot />
    </Layout >
  );
}