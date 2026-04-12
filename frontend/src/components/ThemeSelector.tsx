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
    <div className="flex items-center gap-2 bg-black/10 backdrop-blur-md p-1.5 rounded-full border border-white/10">
      {palettes.map((p) => (
        <button
          key={p.id}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPaletteType(p.id);
          }}
          className={cn(
            "relative w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center group",
            paletteType === p.id ? "scale-110 shadow-lg" : "hover:scale-105 opacity-70 hover:opacity-100"
          )}
          style={{ backgroundColor: p.primary }}
          title={p.name}
        >
          {paletteType === p.id && (
            <Check className="w-4 h-4 text-white animate-in zoom-in duration-300" />
          )}
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold uppercase tracking-widest">
            {p.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
