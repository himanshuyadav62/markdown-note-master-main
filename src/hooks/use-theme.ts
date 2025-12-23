import { useEffect } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme-preference', 'light');

  useEffect(() => {
    const root = globalThis.document.documentElement;
    root.dataset.appearance = theme || 'light';
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => current === 'light' ? 'dark' : 'light');
  };

  return { theme: theme || 'light', toggleTheme };
}
