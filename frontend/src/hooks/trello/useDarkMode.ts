import { useEffect } from 'react';

import { useLocalStorage } from './useLocalStorage';

export function useDarkMode() {
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', true);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  return [darkMode, setDarkMode] as const;
}