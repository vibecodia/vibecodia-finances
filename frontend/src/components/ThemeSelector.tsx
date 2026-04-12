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
    <div className="flex items-center gap-1.5 p-1 rounded-full">
      {palettes.map((p) => (
        <button
          key={p.id}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPaletteType(p.id);
          }}
          className={cn(
            "relative w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center group border border-white/20",
            paletteType === p.id ? "scale-110 ring-2 ring-white/50" : "hover:scale-110 opacity-60 hover:opacity-100"
          )}
          style={{ backgroundColor: p.primary }}
          title={p.name}
        >
          {paletteType === p.id && (
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in duration-300" />
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
