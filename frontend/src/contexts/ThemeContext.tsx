import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  cardBackground: string;
  cardBorder: string;
}

interface ThemeContextType {
  theme: ColorPalette;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('isDarkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const theme = useMemo((): ColorPalette => {
    const primaryColor = '#4f46e5'; // Indigo default
    const accentColor = '#8b5cf6'; // Violet default
    
    if (isDarkMode) {
      return {
        primary: primaryColor,
        secondary: '#1e1b4b',
        accent: accentColor,
        background: '#020617', // deep black-blue
        text: '#f8fafc', // slate-50
        cardBackground: '#0f172a', // slate-900
        cardBorder: `${primaryColor}44`,
      };
    } else {
      return {
        primary: primaryColor,
        secondary: '#e0e7ff',
        accent: accentColor,
        background: '#f1f5f9', // slate-100
        text: '#0f172a', // slate-900
        cardBackground: '#ffffff',
        cardBorder: `${primaryColor}33`,
      };
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    applyThemeToCss(theme);
  }, [isDarkMode, theme]);

  const applyThemeToCss = (currentTheme: ColorPalette) => {
    document.documentElement.style.setProperty('--color-primary', currentTheme.primary);
    document.documentElement.style.setProperty('--color-secondary', currentTheme.secondary);
    document.documentElement.style.setProperty('--color-accent', currentTheme.accent);
    document.documentElement.style.setProperty('--color-background', currentTheme.background);
    document.documentElement.style.setProperty('--color-text', currentTheme.text);
    document.documentElement.style.setProperty('--color-card-background', currentTheme.cardBackground);
    document.documentElement.style.setProperty('--color-card-border', currentTheme.cardBorder);
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
