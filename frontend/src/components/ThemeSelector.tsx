import React, { useState } from 'react';
import { useTheme, ThemePaletteType } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Sun, Moon, Palette, X } from 'lucide-react';

const ThemeSelector: React.FC = () => {
  const { paletteType, setPaletteType, isDarkMode, toggleTheme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const palettes: { id: ThemePaletteType; name: string; primary: string }[] = [
    { id: 'emerald', name: 'Emerald', primary: '#059669' },
    { id: 'ocean', name: 'Ocean', primary: '#0284c7' },
    { id: 'violet', name: 'Violet', primary: '#7c3aed' },
  ];

  return (
    <div 
      className={cn(
        "flex items-center transition-all duration-500 ease-in-out relative group h-10",
        isExpanded 
          ? "bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-2xl shadow-2xl" 
          : "bg-transparent border-transparent p-0"
      )}
    >
      {/* Botão de Trigger (Paleta) - Oculto quando expandido */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-500",
            "bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 active:scale-90"
          )}
          title="Seletor de Tema"
        >
          <Palette className="w-5.5 h-5.5 text-white" />
        </button>
      )}

      {/* Conteúdo Expansível */}
      <div className={cn(
        "flex items-center gap-3 overflow-hidden transition-all duration-500 ease-in-out",
        isExpanded ? "max-w-[400px] opacity-100 px-1" : "max-w-0 opacity-0 pointer-events-none"
      )}>
        {/* Botão para fechar */}
        <button
          onClick={() => setIsExpanded(false)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        {/* Palette Selectors */}
        <div className="flex items-center gap-2.5 pr-3 border-r border-white/10 flex-shrink-0">
          {palettes.map((p) => (
            <button
              key={p.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPaletteType(p.id);
              }}
              className={cn(
                "relative w-7.5 h-7.5 rounded-lg transition-all duration-500 flex items-center justify-center group overflow-hidden",
                paletteType === p.id 
                  ? "scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-2 ring-white" 
                  : "hover:scale-105 opacity-40 hover:opacity-100 grayscale-[0.5] hover:grayscale-0"
              )}
              style={{ 
                backgroundColor: p.primary,
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)`
              }}
              title={p.name}
            >
              {/* Subtle shine effect on active */}
              {paletteType === p.id && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              )}
            </button>
          ))}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
          }}
          className={cn(
            "w-9.5 h-9.5 rounded-lg flex items-center justify-center transition-all duration-500 flex-shrink-0",
            "bg-white/10 hover:bg-white/20 border border-white/10 shadow-sm active:scale-90"
          )}
          title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
        >
          {isDarkMode ? (
            <Sun className="w-5.5 h-5.5 text-yellow-400 animate-in spin-in-180 duration-500" />
          ) : (
            <Moon className="w-5.5 h-5.5 text-blue-200 animate-in spin-in-90 duration-500" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ThemeSelector;
