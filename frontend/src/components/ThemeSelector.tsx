import { Sun, Moon, Palette, X } from "lucide-react";
import React, { useState } from "react";

import { useTheme, ThemePaletteType } from "../contexts/ThemeContext";
import { cn } from "../lib/utils";

const ThemeSelector: React.FC = () => {
  const { paletteType, setPaletteType, isDarkMode, toggleTheme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const palettes: { id: ThemePaletteType; name: string; primary: string }[] = [
    { id: "emerald", name: "Emerald", primary: "#059669" },
    { id: "ocean", name: "Ocean", primary: "#0284c7" },
    { id: "violet", name: "Violet", primary: "#7c3aed" },
  ];

  return (
    <div
      className={cn(
        "flex items-center transition-all duration-500 ease-in-out absolute right-0 h-10 sm:h-12 rounded-2xl overflow-hidden",
        isExpanded
          ? "bg-white/10 backdrop-blur-xl border border-white/20 px-2 shadow-2xl w-auto z-50"
          : "bg-white/10 backdrop-blur-md border border-white/20 w-10 sm:w-12 shadow-lg z-10",
      )}
    >
      {/* Botão de Trigger (Paleta) - Encolhe quando expandido */}
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex items-center justify-center transition-all duration-500 shrink-0",
          isExpanded
            ? "w-0 opacity-0 pointer-events-none"
            : "w-full h-full opacity-100",
        )}
        title="Seletor de Tema"
      >
        <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </button>

      {/* Conteúdo Expansível */}
      <div
        className={cn(
          "flex items-center gap-2 transition-all duration-500 ease-in-out overflow-hidden whitespace-nowrap",
          isExpanded
            ? "max-w-[400px] opacity-100"
            : "max-w-0 opacity-0 pointer-events-none",
        )}
      >
        {/* Dark Mode Toggle */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
            setIsExpanded(false);
          }}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0",
            "bg-white/5 hover:bg-white/10 border border-white/5 shadow-sm active:scale-90",
          )}
          title={
            isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"
          }
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-yellow-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-200" />
          )}
        </button>

        {/* Palette Selectors */}
        <div className="flex items-center gap-2 px-2 border-x border-white/10 flex-shrink-0">
          {palettes.map((p) => (
            <button
              key={p.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPaletteType(p.id);
                setIsExpanded(false);
              }}
              className={cn(
                "relative w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center group overflow-hidden",
                paletteType === p.id
                  ? "scale-110 shadow-[0_0_10px_rgba(255,255,255,0.2)] ring-1.5 ring-white"
                  : "hover:scale-105 opacity-40 hover:opacity-100 grayscale-[0.3] hover:grayscale-0",
              )}
              style={{
                backgroundColor: p.primary,
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)`,
              }}
              title={p.name}
            >
              {paletteType === p.id && (
                <div className="absolute inset-0 bg-white/10 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Botão para fechar */}
        <button
          onClick={() => setIsExpanded(false)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>
    </div>
  );
};

export default ThemeSelector;
