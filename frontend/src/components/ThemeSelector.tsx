import React from "react";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "../contexts/ThemeContext";

/** Toggle dark/light em chip de papel. As paletas emerald/ocean/violet saíram. */
const ThemeSelector: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-full h-full flex items-center justify-center rounded-md border border-rule bg-paperAlt text-pencil hover:text-ink hover:border-ruleStrong transition-colors"
      title={isDarkMode ? "Modo claro" : "Modo escuro"}
      aria-label={
        isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"
      }
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
};

export default ThemeSelector;
