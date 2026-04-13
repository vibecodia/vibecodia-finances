import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeSelector from './ThemeSelector';
import { cn } from '../lib/utils';

const Header: React.FC = () => {
  const [isPulsing, setIsPulsing] = useState(false);
  const appVersion = import.meta.env.APP_VERSION;

  const handleHeaderClick = () => {
    if (isPulsing) return;
    setIsPulsing(true);
    setTimeout(() => {
      setIsPulsing(false);
      // Adiciona o parâmetro nosplash=true e força a navegação para a raiz
      const url = new URL(window.location.origin);
      url.searchParams.set('nosplash', 'true');
      window.location.href = url.toString();
    }, 300); // Duração da animação
  };

  return (
    <header
      className={cn(
        "bg-primary text-white shadow-lg sticky top-0 z-50 transition-all duration-300 ease-in-out border-b border-white/10",
        isPulsing ? "scale-105" : "scale-100"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Espaço para o menu hambúrguer no mobile */}
        <div className="w-10 lg:hidden" />

        <Link to="/" className="flex-1 flex flex-col items-center justify-center cursor-pointer min-w-0 group">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black tracking-tighter uppercase italic leading-none">
              Vibecodia <span className="text-white/30 not-italic font-bold text-[9px] tracking-widest ml-1">v{appVersion}</span>
            </h1>
          </div>
          <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.5em] opacity-40 mt-1 leading-none">
            Financial Control
          </p>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <ThemeSelector />
          <button 
            onClick={handleHeaderClick}
            className="bg-white/10 backdrop-blur-md text-xl text-white w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl border border-white/10 shadow-sm hover:bg-white/20 transition-all active:scale-95"
            aria-label="Recarregar e ir para o início"
          >
            🏠
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;