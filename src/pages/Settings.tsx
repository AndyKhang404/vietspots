import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { supabase, SUPABASE_DEBUG } from "@/integrations/supabase/client";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut, refreshUser } = useAuth();
  const { theme, colorTheme, toggleTheme, setColorTheme } = useTheme();
  const { toast } = useToast();

  const [languageOpen, setLanguageOpen] = useState(false);
  const [colorThemeOpen, setColorThemeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'privacy'>('profile');
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [bio, setBio] = useState(user?.user_metadata?.bio || "");
  const [companionType, setCompanionType] = useState<string>(user?.user_metadata?.companion_type || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [avatarValid, setAvatarValid] = useState<boolean | null>(null);
  const [gender, setGender] = useState<string>(user?.user_metadata?.gender || "");
  const [age, setAge] = useState<string>(user?.user_metadata?.age ? String(user?.user_metadata?.age) : "");
  const [hobbies, setHobbies] = useState<string[]>(user?.user_metadata?.hobby ? String(user?.user_metadata?.hobby).split(',') : []);
  const [culture, setCulture] = useState<string>(user?.user_metadata?.culture || "");
  const [religion, setReligion] = useState<string>(user?.user_metadata?.religion || "");

  const hobbyOptions = [
    'Phiêu lưu', 'Ít di chuyển', 'Đẹp', 'Bí ẩn', 'Ẩm thực', 'Văn hóa', 'Thiên nhiên', 'Cuộc sống về đêm'
  ];

  const cultureOptions = [
    'Việt Nam', 'Trung Quốc', 'Nhật Bản', 'Hàn Quốc', 'Thái Lan', 'Ấn Độ', 'Phương Tây / Châu Âu', 'Mỹ', 'Trung Đông', 'Châu Phi', 'Khác'
  ];

  const religionOptions = [
    'Không', 'Phật giáo', 'Thiên Chúa giáo', 'Hồi giáo', 'Ấn Độ giáo', 'Do Thái giáo', 'Đạo Sikh', 'Khác'
  ];

  // Refresh local profile form from auth user metadata when opening dialog
  useEffect(() => {
    if (!profileOpen) return;
    const meta = user?.user_metadata || {};
    setFullName(meta.full_name || "");
    setPhone(meta.phone || "");
    setBio(meta.bio || "");
    setAvatarUrl(meta.avatar_url || "");
    setGender(meta.gender || "");
    setAge(meta.age ? String(meta.age) : "");
    setHobbies(meta.hobby ? String(meta.hobby).split(',') : []);
    setCulture(meta.culture || "");
    setReligion(meta.religion || "");
    setCompanionType(meta.companion_type || meta.companionType || "");
    setAvatarValid(null);
  }, [profileOpen, user]);

  // Validate avatar URL by attempting to load it in an Image object.
  useEffect(() => {
    if (!avatarUrl) {
      setAvatarValid(null);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setAvatarValid(true); };
    img.onerror = () => { if (!cancelled) setAvatarValid(false); };
    // Start loading
    img.src = avatarUrl;

    // If the URL is the same-origin but returns HTML (not an image), onerror will fire.
    return () => { cancelled = true; };
  }, [avatarUrl]);
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
      // Debug: log session and supabase env to help diagnose why upserts fail
      try {
        const { data: authData } = await supabase.auth.getUser();
        // eslint-disable-next-line no-console
        console.log('[Settings] supabase debug', SUPABASE_DEBUG);
        // eslint-disable-next-line no-console
        console.log('[Settings] auth.getUser()', authData);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Settings] failed to fetch current auth user for debug', e);
      }
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone,
          bio: bio,
          companion_type: companionType || null,
          introduction: bio || null,
          avatar_url: avatarUrl,
          gender: gender || null,
          age: age ? parseInt(age, 10) : null,
          hobby: hobbies.length > 0 ? hobbies : null,
          culture: culture || null,
          religion: religion || null,
        }
      });

      if (error) throw error;

      // Upsert into `public.users` so that the app-level users table (if present) reflects the changes.
      // NOTE: we intentionally skip upserting into `public.profiles` to avoid failures when
      // the `profiles` table does not exist in the target Supabase project.
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id || user?.id;
        if (userId) {
          // eslint-disable-next-line no-console
          console.log('[Settings] userId before users upsert:', userId);

          try {
            const payload: any = {
              id: userId,
              email: user?.email || userData?.user?.email || null,
              name: fullName || null,
              avatar_url: avatarUrl || null,
              phone: phone || null,
              gender: gender || null,
              age: age ? parseInt(age, 10) : null,
              hobby: hobbies.length > 0 ? hobbies : null,
              culture: culture || null,
              religion: religion || null,
              companion_type: companionType || null,
              introduction: bio || null,
            };

            // eslint-disable-next-line no-console
            console.log('[Settings] users upsert payload:', payload);

            const { error: usersError } = await (supabase as any)
              .from('users')
              .upsert(payload, { onConflict: 'id' });

            if (usersError) {
              // eslint-disable-next-line no-console
              console.error('Failed to upsert public.users after updating profile', usersError);
              // eslint-disable-next-line no-console
              console.error('users upsert response:', { usersError });
              throw usersError;
            }

            // eslint-disable-next-line no-console
            console.log('users upsert success');
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Unexpected error upserting public.users', e);
          }
        }
      } catch (e) {
        // non-fatal: log
        // eslint-disable-next-line no-console
        console.warn('Failed to upsert public.users after updating auth user metadata', e);
      }

      toast({ title: t('settings.profile_updated') });
      // Refresh auth user metadata so other UI (sidebar/profile card) updates without full reload
      try {
        await refreshUser();
      } catch (e) {
        // ignore
      }
      setProfileOpen(false);
    } catch (error) {
      // Improve error visibility during debugging: show Supabase message when available
      // eslint-disable-next-line no-console
      console.error("Error updating profile:", error);
      const errMessage = (error && (error as any).message) ? (error as any).message : t('messages.error_occurred_apology');
      toast({ title: errMessage, variant: "destructive" });
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
          onClick: () => {
            if (user) {
              setProfileTab('profile');
              setProfileOpen(true);
            } else {
              navigate('/auth');
            }
          }
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
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-24 w-24 object-cover rounded-full" />
                  ) : (
                    <User className="h-12 w-12 text-primary" />
                  )}
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
            <p className="font-medium mb-4">{t('help.intro') || 'Cần trợ giúp? Dưới đây là câu trả lời cho các câu hỏi thường gặp.'}</p>

            <div className="mb-4">
              <input placeholder="Tìm kiếm trợ giúp (ví dụ: gửi đánh giá, lịch sử)" className="w-full p-3 rounded-md border border-border" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="font-semibold mb-2">{t('help.q1.title') || 'Không thể gửi đánh giá?'}</h4>
                <p className="text-sm text-muted-foreground">{t('help.q1.body') || 'Đảm bảo bạn đã đăng nhập. Nếu vẫn không được, kiểm tra kết nối mạng hoặc truy cập phần Hồ sơ để cập nhật thông tin tài khoản.'}</p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="font-semibold mb-2">{t('help.q2.title') || 'Tại sao tôi không thấy đánh giá của người khác?'}</h4>
                <p className="text-sm text-muted-foreground">{t('help.q2.body') || 'Ứng dụng kết hợp đánh giá từ nhiều nguồn. Nếu không thấy, hãy thử làm mới hoặc kiểm tra cài đặt lọc hiển thị.'}</p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="font-semibold mb-2">{t('help.q3.title') || 'Lịch sử tìm kiếm được lưu như thế nào?'}</h4>
                <p className="text-sm text-muted-foreground">{t('help.q3.body') || 'VietSpots tự động lưu các địa điểm bạn đã tìm kiếm để giúp bạn truy cập nhanh hơn. Bạn có thể xem hoặc xóa lịch sử trong Tab Tìm kiếm → Lịch sử.'}</p>
              </div>

              <div className="bg-card rounded-lg p-4 border border-border">
                <h4 className="font-semibold mb-2">{t('help.q4.title') || 'Các vấn đề khác'}</h4>
                <p className="text-sm text-muted-foreground">{t('help.q4.body') || 'Cập nhật sau.'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <p className="text-sm">{t('help.contact_prompt') || 'Nếu cần hỗ trợ trực tiếp, liên hệ với chúng tôi:'}</p>
              <div className="flex gap-3 mt-3 items-center">
                <a href="mailto:iamhuy29062006@gmail.com" className="text-sm text-primary hover:underline">iamhuy29062006@gmail.com</a>
                <Link to="/contact" className="text-sm text-muted-foreground hover:underline">{t('help.contact_page') || 'Trang Liên hệ'}</Link>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:underline">{t('help.privacy_policy') || 'Chính sách'}</Link>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{t('settings.personalInfo')}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Tabs: Profile | Privacy */}
          <div className="mt-2 px-4">
            <div className="flex gap-2">
              <button
                onClick={() => setProfileTab('profile')}
                className={`flex-1 py-2 rounded-t-xl border border-border ${profileTab === 'profile' ? 'bg-primary/10 text-primary font-medium' : 'bg-card'}`}
              >
                Thông tin hồ sơ
              </button>
              <button
                onClick={() => setProfileTab('privacy')}
                className={`flex-1 py-2 rounded-t-xl border border-border ${profileTab === 'privacy' ? 'bg-primary/10 text-primary font-medium' : 'bg-card'}`}
              >
                Thông tin riêng tư
              </button>
            </div>
          </div>

          <div className="space-y-4 mt-4 px-4">
            {profileTab === 'profile' ? (
              <div>
                {/* Avatar preview */}
                <div className="flex flex-col items-center gap-3">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onLoad={() => setAvatarValid(true)}
                        onError={() => setAvatarValid(false)}
                      />
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
                    {avatarValid === false && (
                      <p className="text-sm text-destructive mt-1">Không thể tải ảnh từ URL này — hãy dùng đường dẫn trực tiếp tới ảnh (.jpg, .png) hoặc mở liên kết trong tab mới để kiểm tra.</p>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ""} disabled className="mt-1.5" />
                </div>
                <div className="mt-3">
                  <Label htmlFor="fullName">{t('settings.full_name')}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('settings.enter_full_name')}
                    className="mt-1.5"
                  />
                </div>
                <div className="mt-3">
                  <Label htmlFor="phone">{t('settings.phone')}</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0123 456 789"
                    className="mt-1.5"
                  />
                </div>
                <div className="mt-3">
                  <Label htmlFor="bio">Giới thiệu</Label>
                  <Input
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Viết đôi dòng giới thiệu về bạn"
                    className="mt-1.5"
                  />
                </div>

                {/* Personal extra fields: gender & age */}
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label htmlFor="gender">Giới tính</Label>
                    <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1.5 w-full rounded-md border p-2">
                      <option value="">Không chọn</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="age">Tuổi</Label>
                    <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" className="mt-1.5" />
                  </div>
                </div>

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

                <Button onClick={handleSaveProfile} disabled={!!(avatarUrl && avatarValid === false)} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 mt-4">
                  {t('settings.save_changes')}
                </Button>
              </div>
            ) : (
              <div>
                {/* Privacy UI styled like screenshots */}
                <div className="mb-4">
                  <h4 className="text-base font-semibold">Sở thích</h4>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {hobbyOptions.map((h) => {
                      const active = hobbies.includes(h);
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHobbies(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h])}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full border-2 ${active ? 'bg-amber-400 text-black border-amber-400' : 'bg-white text-foreground border-black'} shadow-sm`}
                        >
                          {active && <Check className="h-4 w-4" />}
                          <span className="text-sm">{h}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-base font-semibold">Văn hóa</h4>
                  <div className="mt-3 bg-white rounded-xl border border-border">
                    {cultureOptions.map((c) => (
                      <label key={c} className="flex items-center justify-between p-4 border-b last:border-b-0">
                        <span>{c}</span>
                        <input type="radio" name="culture" value={c} checked={culture === c} onChange={(e) => setCulture(e.target.value)} className="ml-4 accent-red-600" />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-base font-semibold">Tôn giáo</h4>
                  <div className="mt-3 bg-white rounded-xl border border-border">
                    {religionOptions.map((r) => (
                      <label key={r} className="flex items-center justify-between p-4 border-b last:border-b-0">
                        <span className={`${r === religion ? 'text-red-600' : ''}`}>{r}</span>
                        <input type="radio" name="religion" value={r} checked={religion === r} onChange={(e) => setReligion(e.target.value)} className="ml-4 accent-red-600" />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-base font-semibold">Bạn đồng hành</h4>
                  <div className="mt-3 bg-white rounded-xl border border-border">
                    {['Một mình', 'Cặp đôi', 'Gia đình', 'Bạn bè'].map((opt) => (
                      <label key={opt} className={`flex items-center justify-between p-4 border-b last:border-b-0 cursor-pointer ${companionType === opt ? 'bg-primary/5' : ''}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{opt}</span>
                        </div>
                        <input type="radio" name="companion" value={opt} checked={companionType === opt} onChange={(e) => setCompanionType(e.target.value)} className="ml-4 accent-red-600" />
                      </label>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={!!(avatarUrl && avatarValid === false)} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Lưu
                </Button>
              </div>
            )}
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