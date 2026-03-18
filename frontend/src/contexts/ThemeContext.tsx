import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';

import { HEALTH_CALENDAR } from '../utils/healthData';

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
  setThemeMonth: (date: Date) => void;
  campaignInfo: {
    label: string;
    cause: string;
    colorName: string;
    hex: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('isDarkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const [themeMonth, setThemeMonth] = useState<number>(new Date().getMonth());

  // Get health campaign for the selected month
  const campaignData = HEALTH_CALENDAR[themeMonth];
  const activeCampaign = campaignData.campaigns[0];

  const theme = useMemo((): ColorPalette => {
    const primaryColor = activeCampaign.hex;
    
    if (isDarkMode) {
      return {
        primary: primaryColor,
        secondary: activeCampaign.accentHex,
        accent: activeCampaign.accentHex,
        background: '#020617', // deep black-blue
        text: '#f8fafc', // slate-50
        cardBackground: '#0f172a', // slate-900
        cardBorder: `${primaryColor}44`,
      };
    } else {
      return {
        primary: primaryColor,
        secondary: activeCampaign.accentHex,
        accent: primaryColor,
        background: '#f1f5f9', // slate-100 (slightly more depth than pure white)
        text: '#0f172a', // slate-900 (neutral contrast)
        cardBackground: '#ffffff',
        cardBorder: `${primaryColor}33`, // slightly more visible border
      };
    }
  }, [isDarkMode, activeCampaign]);

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
    
    document.documentElement.style.setProperty('--campaign-hex', activeCampaign.hex);
    document.documentElement.style.setProperty('--campaign-text', activeCampaign.textHex);
    document.documentElement.style.setProperty('--campaign-accent', activeCampaign.accentHex);
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const updateThemeMonth = (date: Date) => {
    setThemeMonth(date.getMonth());
  };

  const campaignInfo = {
    label: activeCampaign.label,
    cause: activeCampaign.cause,
    colorName: activeCampaign.color,
    hex: activeCampaign.hex,
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, setThemeMonth: updateThemeMonth, campaignInfo }}>
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
