import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useMemo,
} from "react";

export type ThemePaletteType = "emerald" | "ocean" | "violet";
export type DesignVariant = "caderno" | "legado";

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
  designVariant: DesignVariant;
  themeTransitionEnabled: boolean;
  toggleTheme: () => void;
  setPaletteType: (palette: ThemePaletteType) => void;
  setDesignVariant: (variant: DesignVariant) => void;
  setThemeTransitionEnabled: (enabled: boolean) => void;
}

// Paletas originais (pré-caderno) — ativas apenas quando designVariant === "legado"
const LEGACY_PALETTES: Record<ThemePaletteType, { primary: string; accent: string }> =
  {
    emerald: { primary: "#059669", accent: "#10b981" },
    ocean: { primary: "#0284c7", accent: "#38bdf8" },
    violet: { primary: "#7c3aed", accent: "#a78bfa" },
  };

// Identidade única "Caderno de contas" — as 3 paletas resolvem para o mesmo
// tema (tinta/caneta). Mantidas no tipo para não quebrar consumidores antigos.
const CADERNO_IDENTITY: { primary: string; accent: string } = {
  primary: "#1F2937",
  accent: "#E11D48",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem("isDarkMode");
    return savedMode ? JSON.parse(savedMode) : false;
  });

  const [paletteType, setPaletteTypeState] = useState<ThemePaletteType>(() => {
    const savedPalette = localStorage.getItem("themePalette");
    return (savedPalette as ThemePaletteType) || "emerald";
  });

  // Alternância "testar versão caderno" / "visual antigo". Default: caderno.
  const [designVariant, setDesignVariantState] = useState<DesignVariant>(() => {
    const saved = localStorage.getItem("designVariant");
    return saved === "legado" ? "legado" : "caderno";
  });

  const [themeTransitionEnabled, setThemeTransitionEnabledState] =
    useState<boolean>(() => {
      const saved = localStorage.getItem("themeTransitionEnabled");
      return saved === "true"; // Default to false
    });

  const theme = useMemo((): ColorPalette => {
    const isLegacy = designVariant === "legado";
    const colors = isLegacy ? LEGACY_PALETTES[paletteType] : CADERNO_IDENTITY;
    const primaryColor = colors.primary;
    const accentColor = colors.accent;

    if (isLegacy) {
      // ---- Visual antigo (pré-caderno): emerald/ocean/violet ----
      if (isDarkMode) {
        return {
          primary: primaryColor,
          secondary:
            paletteType === "emerald"
              ? "#064e3b"
              : paletteType === "ocean"
                ? "#0c4a6e"
                : "#4c1d95",
          accent: accentColor,
          background: "#020617", // deep black-blue
          text: "#f8fafc", // slate-50
          cardBackground: "#0f172a", // slate-900
          cardBorder: `${primaryColor}44`,
          ring: primaryColor,
        };
      }
      return {
        primary: primaryColor,
        secondary:
          paletteType === "emerald"
            ? "#ecfdf5"
            : paletteType === "ocean"
              ? "#f0f9ff"
              : "#f5f3ff",
        accent: accentColor,
        background: "#f8fafc", // slate-50
        text: "#0f172a", // slate-900
        cardBackground: "#ffffff",
        cardBorder: `${primaryColor}33`,
        ring: primaryColor,
      };
    }

    // ---- Caderno de contas ----
    if (isDarkMode) {
      return {
        primary: primaryColor,
        secondary: "#262117", // papel-alt escuro
        accent: "#F43F5E", // caneta suave
        background: "#1E1B16", // papel escuro
        text: "#F5F1E6", // tinta clara
        cardBackground: "#262117",
        cardBorder: "rgba(245,241,230,0.16)",
        ring: "#F43F5E",
      };
    }
    return {
      primary: primaryColor,
      secondary: "#FDFBF4", // papel-alt
      accent: accentColor,
      background: "#F7F2E7", // papel
      text: "#1F2937", // tinta
      cardBackground: "#FDFBF4",
      cardBorder: "rgba(31,41,55,0.14)",
      ring: "#E11D48",
    };
  }, [isDarkMode, paletteType, designVariant]);

  const setPaletteType = (palette: ThemePaletteType) => {
    setPaletteTypeState(palette);
    localStorage.setItem("themePalette", palette);
  };

  const setDesignVariant = (variant: DesignVariant) => {
    setDesignVariantState(variant);
    localStorage.setItem("designVariant", variant);
  };

  const setThemeTransitionEnabled = (enabled: boolean) => {
    setThemeTransitionEnabledState(enabled);
    localStorage.setItem("themeTransitionEnabled", String(enabled));
  };

  useEffect(() => {
    localStorage.setItem("isDarkMode", JSON.stringify(isDarkMode));
    applyThemeToCss(theme);
    updatePwaMetaTags(
      designVariant === "legado" ? theme.primary : theme.background,
    );
  }, [isDarkMode, theme, themeTransitionEnabled, designVariant]);

  const applyThemeToCss = (currentTheme: ColorPalette) => {
    const root = document.documentElement;

    // Theme Transition Variable
    root.style.setProperty(
      "--theme-transition-duration",
      themeTransitionEnabled ? "500ms" : "0ms",
    );

    // Custom App Variables
    root.style.setProperty("--color-primary", currentTheme.primary);
    root.style.setProperty("--color-secondary", currentTheme.secondary);
    root.style.setProperty("--color-accent", currentTheme.accent);
    root.style.setProperty("--color-background", currentTheme.background);
    root.style.setProperty("--color-text", currentTheme.text);
    root.style.setProperty(
      "--color-card-background",
      currentTheme.cardBackground,
    );
    root.style.setProperty("--color-card-border", currentTheme.cardBorder);

    // Shadcn/ui Variables Override
    // Shadcn/ui expects HSL values without the hsl() wrapper
    const hexToHsl = (hex: string): string => {
      let r = 0,
        g = 0,
        b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let h = 0;
      let s: number;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    if (designVariant === "legado") {
      // ---- Visual antigo: shadcn neutro (slate) + paleta emerald/ocean/violet ----
      root.style.setProperty(
        "--background",
        isDarkMode ? "222.2 84% 4.9%" : "210 40% 98%",
      );
      root.style.setProperty(
        "--foreground",
        isDarkMode ? "210 40% 98%" : "222.2 84% 4.9%",
      );
      root.style.setProperty(
        "--card",
        isDarkMode ? "222.2 84% 4.9%" : "0 0% 100%",
      );
      root.style.setProperty(
        "--card-foreground",
        isDarkMode ? "210 40% 98%" : "222.2 84% 4.9%",
      );
      root.style.setProperty(
        "--popover",
        isDarkMode ? "222.2 84% 4.9%" : "0 0% 100%",
      );
      root.style.setProperty(
        "--popover-foreground",
        isDarkMode ? "210 40% 98%" : "222.2 84% 4.9%",
      );
      root.style.setProperty(
        "--muted",
        isDarkMode ? "217.2 32.6% 17.5%" : "210 40% 96.1%",
      );
      root.style.setProperty(
        "--muted-foreground",
        isDarkMode ? "215 20.2% 65.1%" : "215.4 16.3% 46.9%",
      );
      root.style.setProperty(
        "--border",
        isDarkMode ? "217.2 32.6% 17.5%" : "214.3 31.8% 91.4%",
      );
      root.style.setProperty(
        "--input",
        isDarkMode ? "217.2 32.6% 17.5%" : "214.3 31.8% 91.4%",
      );
      root.style.setProperty("--primary", hexToHsl(currentTheme.primary));
      root.style.setProperty("--ring", hexToHsl(currentTheme.ring));
      root.style.setProperty("--accent", hexToHsl(currentTheme.accent));
      root.style.setProperty("--secondary", hexToHsl(currentTheme.secondary));

      if (isDarkMode) {
        root.style.setProperty("--primary-foreground", "210 40% 98%");
        root.style.setProperty("--accent-foreground", "210 40% 98%");
        root.style.setProperty("--secondary-foreground", "210 40% 98%");
        root.style.setProperty("--destructive", "0 72% 50%");
        root.style.setProperty("--destructive-foreground", "210 40% 98%");
      } else {
        root.style.setProperty("--primary-foreground", "210 40% 98%");
        root.style.setProperty("--accent-foreground", "222.2 47.4% 11.2%");
        root.style.setProperty("--secondary-foreground", "222.2 47.4% 11.2%");
        root.style.setProperty("--destructive", "0 72% 45%");
        root.style.setProperty("--destructive-foreground", "210 40% 98%");
      }
      return;
    }

    // ---- Caderno de contas ----
    root.style.setProperty("--background", hexToHsl(currentTheme.background));
    root.style.setProperty("--foreground", hexToHsl(currentTheme.text));
    root.style.setProperty("--card", hexToHsl(currentTheme.cardBackground));
    root.style.setProperty(
      "--card-foreground",
      hexToHsl(currentTheme.text),
    );
    root.style.setProperty("--popover", hexToHsl(currentTheme.cardBackground));
    root.style.setProperty(
      "--popover-foreground",
      hexToHsl(currentTheme.text),
    );
    root.style.setProperty("--primary", hexToHsl(currentTheme.primary));
    root.style.setProperty("--ring", hexToHsl(currentTheme.ring));
    root.style.setProperty("--accent", hexToHsl(currentTheme.accent));
    root.style.setProperty("--secondary", hexToHsl(currentTheme.secondary));

    // Caderno extras
    root.style.setProperty("--paper", hexToHsl(currentTheme.background));
    root.style.setProperty("--paper-alt", hexToHsl(currentTheme.cardBackground));
    root.style.setProperty("--ink", hexToHsl(currentTheme.text));
    root.style.setProperty("--pen", hexToHsl(currentTheme.accent));
    root.style.setProperty(
      "--ink-muted",
      hexToHsl(isDarkMode ? "#A8A29E" : "#9CA3AF"),
    );
    root.style.setProperty(
      "--highlight",
      isDarkMode ? "48 60% 30%" : "48 96% 77%",
    );

    const rule = isDarkMode ? "44 30% 90% / 0.16" : "215 20% 22% / 0.14";
    const ruleStrong = isDarkMode
      ? "44 30% 90% / 0.26"
      : "215 20% 22% / 0.24";
    const border = isDarkMode ? "44 30% 90% / 0.16" : "215 20% 22% / 0.18";
    root.style.setProperty("--rule", rule);
    root.style.setProperty("--rule-strong", ruleStrong);
    root.style.setProperty("--border", border);
    root.style.setProperty("--input", border);

    root.style.setProperty(
      "--muted",
      hexToHsl(isDarkMode ? "#262117" : "#F2EDE2"),
    );
    root.style.setProperty(
      "--muted-foreground",
      hexToHsl(isDarkMode ? "#A8A29E" : "#9CA3AF"),
    );

    // Foreground colors (usually constant light/dark, but can be derived)
    if (isDarkMode) {
      root.style.setProperty("--primary-foreground", "38 15% 10%");
      root.style.setProperty("--accent-foreground", "38 15% 10%");
      root.style.setProperty("--secondary-foreground", "44 43% 93%");
      root.style.setProperty("--destructive", "0 72% 50%");
      root.style.setProperty("--destructive-foreground", "38 15% 10%");
    } else {
      root.style.setProperty("--primary-foreground", "41 50% 94%");
      root.style.setProperty("--accent-foreground", "41 50% 94%");
      root.style.setProperty("--secondary-foreground", "215 28% 17%");
      root.style.setProperty("--destructive", "0 72% 45%");
      root.style.setProperty("--destructive-foreground", "41 50% 94%");
    }
  };

  const updatePwaMetaTags = (color: string) => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", color);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode,
        paletteType,
        designVariant,
        themeTransitionEnabled,
        toggleTheme,
        setPaletteType,
        setDesignVariant,
        setThemeTransitionEnabled,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
