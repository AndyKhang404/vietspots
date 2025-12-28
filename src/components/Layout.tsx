import { ReactNode } from "react";
import logo from "@/images/logo2.jpg";
import logo2 from "@/images/logo.png";
import { Home, Heart, Bell, Settings, Search, MapPin, User, Calendar } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: t('nav.home'), path: "/" },
    { icon: Search, label: t('nav.search'), path: "/search" },
    { icon: Calendar, label: t('nav.itinerary'), path: "/itinerary" },
    { icon: Bell, label: t('nav.notifications'), path: "/notifications" },
    { icon: Heart, label: t('nav.favorites'), path: "/favorites" },
    { icon: Settings, label: t('nav.settings'), path: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-primary flex items-center justify-center">
              <img src={logo} alt={t('app.name')} className="h-10 w-10 object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">{t('app.name')}</h1>
              <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-110",
                  isActive && "scale-110"
                )} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <Link
            to={user ? "/settings" : "/auth"}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.full_name || t('auth.guest')}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || t('auth.login')}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Header - Mobile & Tablet */}
        <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-primary">{t('app.name')}</h1>
            </div>
            <Link to={user ? "/settings" : "/auth"}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-64px)] lg:min-h-screen pb-20 lg:pb-0">
          {children}
          <Footer />
        </main>
      </div>

      {/* Bottom Navigation - Mobile & Tablet */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
