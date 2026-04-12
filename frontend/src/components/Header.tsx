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
      // Adiciona o parâmetro nosplash=true para recarregar sem mostrar o splash screen
      const url = new URL(window.location.href);
      url.searchParams.set('nosplash', 'true');
      window.location.href = url.toString();
    }, 300); // Duração da animação
  };

  return (
    <header
      className={cn(
        "bg-primary text-white p-4 shadow-lg sticky top-0 z-50 transition-all duration-300 ease-in-out border-b border-white/10",
        isPulsing ? "scale-105" : "scale-100"
      )}
    >
      <div className="w-full relative h-16 flex items-center justify-center">
        <Link to="/" className="block cursor-pointer text-center" onClick={handleHeaderClick}>
          <h1 className="text-xl font-bold">💰 Controle Financeiro</h1>
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
            Beta Version | v{appVersion} 🚀
          </p>
        </Link>
        
        <div className="absolute top-1/2 -translate-y-1/2 right-16 flex items-center gap-4">
          <ThemeSelector />
        </div>

        <Link 
          to="/" 
          className="absolute top-1/2 -translate-y-1/2 right-0 bg-accent text-2xl text-white w-12 h-12 flex items-center justify-center rounded-full shadow-md hover:scale-110 transition-transform"
          aria-label="Ir para a página inicial"
        >
          🏠
        </Link>
      </div>
    </header>
  );
};

export default Header;