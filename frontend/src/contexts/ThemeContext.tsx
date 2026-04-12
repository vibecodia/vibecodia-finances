import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';

export type ThemePaletteType = 'emerald' | 'ocean' | 'violet';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  cardBackground: string;
  cardBorder: string;
  ring: string;
}

interface ThemeContextType {
  theme: ColorPalette;
  isDarkMode: boolean;
  paletteType: ThemePaletteType;
  toggleTheme: () => void;
  setPaletteType: (palette: ThemePaletteType) => void;
}

const PALETTES: Record<ThemePaletteType, { primary: string; accent: string }> = {
  emerald: { primary: '#059669', accent: '#10b981' },
  ocean: { primary: '#0284c7', accent: '#38bdf8' },
  violet: { primary: '#7c3aed', accent: '#a78bfa' },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem('isDarkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const [paletteType, setPaletteTypeState] = useState<ThemePaletteType>(() => {
    const savedPalette = localStorage.getItem('themePalette');
    return (savedPalette as ThemePaletteType) || 'emerald';
  });

  const theme = useMemo((): ColorPalette => {
    const colors = PALETTES[paletteType];
    const primaryColor = colors.primary;
    const accentColor = colors.accent;
    
    if (isDarkMode) {
      return {
        primary: primaryColor,
        secondary: paletteType === 'emerald' ? '#064e3b' : paletteType === 'ocean' ? '#0c4a6e' : '#4c1d95',
        accent: accentColor,
        background: '#020617', // deep black-blue
        text: '#f8fafc', // slate-50
        cardBackground: '#0f172a', // slate-900
        cardBorder: `${primaryColor}44`,
        ring: primaryColor,
      };
    } else {
      return {
        primary: primaryColor,
        secondary: paletteType === 'emerald' ? '#ecfdf5' : paletteType === 'ocean' ? '#f0f9ff' : '#f5f3ff',
        accent: accentColor,
        background: '#f8fafc', // slate-50
        text: '#0f172a', // slate-900
        cardBackground: '#ffffff',
        cardBorder: `${primaryColor}33`,
        ring: primaryColor,
      };
    }
  }, [isDarkMode, paletteType]);

  const setPaletteType = (palette: ThemePaletteType) => {
    setPaletteTypeState(palette);
    localStorage.setItem('themePalette', palette);
  };

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    applyThemeToCss(theme);
    updatePwaMetaTags(theme.primary);
  }, [isDarkMode, theme]);

  const applyThemeToCss = (currentTheme: ColorPalette) => {
    const root = document.documentElement;
    
    // Custom App Variables
    root.style.setProperty('--color-primary', currentTheme.primary);
    root.style.setProperty('--color-secondary', currentTheme.secondary);
    root.style.setProperty('--color-accent', currentTheme.accent);
    root.style.setProperty('--color-background', currentTheme.background);
    root.style.setProperty('--color-text', currentTheme.text);
    root.style.setProperty('--color-card-background', currentTheme.cardBackground);
    root.style.setProperty('--color-card-border', currentTheme.cardBorder);

    // Shadcn/ui Variables Override
    // Shadcn/ui expects HSL values without the hsl() wrapper
    const hexToHsl = (hex: string): string => {
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s, l = (max + min) / 2;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    root.style.setProperty('--background', isDarkMode ? '222.2 84% 4.9%' : '210 40% 98%');
    root.style.setProperty('--foreground', isDarkMode ? '210 40% 98%' : '222.2 84% 4.9%');
    root.style.setProperty('--card', isDarkMode ? '222.2 84% 4.9%' : '0 0% 100%');
    root.style.setProperty('--card-foreground', isDarkMode ? '210 40% 98%' : '222.2 84% 4.9%');
    root.style.setProperty('--muted', isDarkMode ? '217.2 32.6% 17.5%' : '210 40% 96.1%');
    root.style.setProperty('--muted-foreground', isDarkMode ? '215 20.2% 65.1%' : '215.4 16.3% 46.9%');
    root.style.setProperty('--border', isDarkMode ? '217.2 32.6% 17.5%' : '214.3 31.8% 91.4%');
    root.style.setProperty('--input', isDarkMode ? '217.2 32.6% 17.5%' : '214.3 31.8% 91.4%');

    root.style.setProperty('--primary', hexToHsl(currentTheme.primary));
    root.style.setProperty('--ring', hexToHsl(currentTheme.ring));
    root.style.setProperty('--accent', hexToHsl(currentTheme.accent));
    root.style.setProperty('--secondary', hexToHsl(currentTheme.secondary));
    
    // Foreground colors (usually constant light/dark, but can be derived)
    if (isDarkMode) {
      root.style.setProperty('--primary-foreground', '210 40% 98%');
      root.style.setProperty('--accent-foreground', '210 40% 98%');
      root.style.setProperty('--secondary-foreground', '210 40% 98%');
    } else {
      root.style.setProperty('--primary-foreground', '210 40% 98%'); // Keep white on primary for better contrast
      root.style.setProperty('--accent-foreground', '222.2 47.4% 11.2%');
      root.style.setProperty('--secondary-foreground', '222.2 47.4% 11.2%');
    }
  };

  const updatePwaMetaTags = (color: string) => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, paletteType, toggleTheme, setPaletteType }}>
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
