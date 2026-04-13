import React from 'react';
import { useTheme, ThemePaletteType } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Check } from 'lucide-react';

const ThemeSelector: React.FC = () => {
  const { paletteType, setPaletteType } = useTheme();

  const palettes: { id: ThemePaletteType; name: string; primary: string }[] = [
    { id: 'emerald', name: 'Emerald', primary: '#059669' },
    { id: 'ocean', name: 'Ocean', primary: '#0284c7' },
    { id: 'violet', name: 'Violet', primary: '#7c3aed' },
  ];

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
      {palettes.map((p) => (
        <button
          key={p.id}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPaletteType(p.id);
          }}
          className={cn(
            "relative w-6 h-6 rounded-lg transition-all duration-500 flex items-center justify-center group overflow-hidden",
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
          
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold uppercase tracking-widest z-50">
            {p.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
