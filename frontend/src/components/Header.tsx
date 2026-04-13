import { Home, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeSelector from './ThemeSelector';
import { cn } from '../lib/utils';

const Header: React.FC = () => {
  const [isPulsing, setIsPulsing] = useState(false);
  const location = useLocation();
  const appVersion = (import.meta as any).env.APP_VERSION;

  const isRoot = location.pathname === '/';

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
        
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 relative">
          <div className="flex items-center justify-end min-w-[40px]">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
              <ThemeSelector />
            </div>
          </div>
          {!isRoot && (
            <button 
              onClick={handleHeaderClick}
              className={cn(
                "relative overflow-hidden group animate-in fade-in zoom-in duration-500",
                "bg-white/10 backdrop-blur-md text-white",
                "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl",
                "border border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.1)]",
                "transition-all duration-500 hover:bg-white/20 active:scale-90"
              )}
              aria-label="Recarregar e ir para o início"
            >
              {/* Background animated shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              {isPulsing ? (
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin opacity-80" />
              ) : (
                <Home className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;