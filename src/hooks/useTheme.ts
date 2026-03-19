import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('abba-theme') as Theme) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('abba-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState(t => t === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, toggle, isDark: theme === 'dark' };
}
