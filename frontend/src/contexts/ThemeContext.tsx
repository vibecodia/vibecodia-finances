import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

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

const lightPalette: ColorPalette = {
  primary: '#2563eb', // blue-600
  secondary: '#1d4ed8', // blue-700
  accent: '#60a5fa', // blue-400
  background: '#f8fafc', // slate-50
  text: '#1e293b', // slate-800
  cardBackground: '#ffffff',
  cardBorder: '#e2e8f0', // slate-200
};

const darkPalette: ColorPalette = {
  primary: '#1e40af', // blue-800
  secondary: '#1e3a8a', // blue-900
  accent: '#3b82f6', // blue-500
  background: '#1e293b', // slate-800
  text: '#f8fafc', // slate-50
  cardBackground: '#334155', // slate-700
  cardBorder: '#475569', // slate-600
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('isDarkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const theme = isDarkMode ? darkPalette : lightPalette;

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