import { createContext, useContext } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('theme') as Theme) || 'dark';
};

export const setStoredTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme', theme);
};

export const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
  }
};