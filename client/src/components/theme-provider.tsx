import { useState, useEffect } from 'react';
import { ThemeContext, Theme, getStoredTheme, setStoredTheme, applyTheme } from '@/lib/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return getStoredTheme();
    }
    return defaultTheme;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    updateTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}