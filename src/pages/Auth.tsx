import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import logo from '@/images/logo2.jpg';
import logo2 from '@/images/logo.png';
import { z } from 'zod';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(6);

export default function Auth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validate = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};

    if (!emailSchema.safeParse(email).success) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!passwordSchema.safeParse(password).success) {
      newErrors.password = t('auth.password_too_short');
    }

    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = t('auth.enter_full_name');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const res = await signIn(email, password);
        if (res.error) {
          console.error('Sign in error', res.error);
          toast({
            variant: 'destructive',
            title: t('auth.loginError'),
            description: res.error.message || t('auth.invalidCredentials'),
          });
        } else {
          toast({ title: t('auth.loginSuccess') });
          navigate('/');
        }
      } else {
        const res = await signUp(email, password, fullName);
        if (res.error) {
          console.error('Sign up error', res.error);
          const message = (res.error.message || '').includes('already registered')
            ? t('auth.emailExists')
            : res.error.message || t('auth.signupError');
          toast({
            variant: 'destructive',
            title: t('auth.signupError'),
            description: message,
          });
        } else {
          // If there's no session returned, Supabase likely requires email confirmation
          const createdUser = res.data?.user;
          // Always switch to login page after signup so user can sign in (or check email for confirmation)
          toast({ title: t('auth.signupSuccess'), description: createdUser && !res.data?.session ? t('auth.check_email_for_confirmation') : undefined });
          setIsLogin(true);
          // Redirect to login view (same page, but ensure route is /auth)
          navigate('/auth');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src={logo} alt={t('app.name')} className="h-6 w-6 rounded-md object-contain" />
            <h1 className="text-xl font-bold text-primary">{t('app.name')}</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-white/90 rounded-xl px-3 py-2 shadow-md">
              <img src={logo2} alt={t('app.name')} className="h-10 w-auto" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? t('auth.login') : t('auth.signup')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t('app.tagline')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t('auth.fullName')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : (isLogin ? t('auth.login') : t('auth.signup'))}
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center mt-6 text-muted-foreground">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? t('auth.signup') : t('auth.login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
