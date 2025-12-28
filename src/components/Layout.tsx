import { ReactNode, useState } from "react";
import logo from "@/images/logo2.jpg";
import logo2 from "@/images/logo.png";
import { Home, Heart, Bell, Settings, Search, MapPin, User, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vietspots_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    const v = !collapsed;
    setCollapsed(v);
    try { localStorage.setItem('vietspots_sidebar_collapsed', v ? '1' : '0'); } catch { }
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className={"hidden lg:flex flex-col border-r border-border bg-card fixed h-full transition-all " + (collapsed ? 'w-16' : 'w-64')}>
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link
            to="/"
            className={"flex items-center gap-2 " + (collapsed ? 'w-full' : '')}
            onClick={(e) => {
              if (collapsed) {
                // If collapsed, reopen instead of navigating away
                e.preventDefault();
                try { localStorage.setItem('vietspots_sidebar_collapsed', '0'); } catch { }
                setCollapsed(false);
              }
            }}
          >
            <div className={"h-10 w-10 rounded-xl overflow-hidden bg-primary flex items-center justify-center" + (collapsed ? ' mx-auto' : '')}>
              <img src={logo} alt={t('app.name')} className="h-10 w-10 object-cover" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-primary">{t('app.name')}</h1>
                <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button onClick={toggleCollapsed} aria-label="Toggle sidebar" className="ml-2 p-1 rounded hover:bg-secondary">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
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
                  isActive && "scale-110",
                  // Ensure active icon keeps strong appearance when collapsed
                  isActive ? "text-primary-foreground" : "text-muted-foreground",
                  collapsed && isActive && "stroke-2"
                )} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <Link
            to={user ? "/settings" : "/auth"}
            className={cn(
              "flex items-center rounded-xl hover:bg-secondary transition-colors",
              collapsed ? "p-3 justify-center" : "gap-3 p-3"
            )}
          >
            <div className={cn(
              "h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center",
              collapsed && "mx-auto"
            )}>
              <User className={cn("h-5 w-5 text-primary", collapsed && "stroke-2")} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.user_metadata?.full_name || t('auth.guest')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || t('auth.login')}
                </p>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className={"flex-1 " + (collapsed ? 'lg:ml-16' : 'lg:ml-64')}>
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
