import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type ColorTheme = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'teal';

interface ThemeContextType {
  theme: Theme;
  colorTheme: ColorTheme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const colorThemes: { value: ColorTheme; label: string; primary: string }[] = [
  { value: 'red', label: 'Đỏ/Hồng', primary: 'hsl(0, 72%, 51%)' },
  { value: 'blue', label: 'Xanh dương', primary: 'hsl(217, 91%, 60%)' },
  { value: 'green', label: 'Xanh lá', primary: 'hsl(142, 76%, 36%)' },
  { value: 'purple', label: 'Tím', primary: 'hsl(271, 91%, 65%)' },
  { value: 'orange', label: 'Cam', primary: 'hsl(25, 95%, 53%)' },
  { value: 'teal', label: 'Xanh ngọc', primary: 'hsl(172, 66%, 50%)' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('colorTheme') as ColorTheme;
    return saved || 'red';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all color theme classes
    colorThemes.forEach(t => root.classList.remove(`theme-${t.value}`));
    
    // Add current color theme class
    root.classList.add(`theme-${colorTheme}`);
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setColorTheme = (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, toggleTheme, setTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}