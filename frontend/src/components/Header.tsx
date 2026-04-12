import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
      className={`bg-primary text-white p-4 shadow-lg sticky top-0 z-50 transition-transform duration-300 ease-in-out ${isPulsing ? 'scale-105' : 'scale-100'}`}
      onClick={handleHeaderClick}
    >
      <Link to="/" className="block cursor-pointer">
        <div className="w-full relative h-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold">💰 Controle Financeiro</h1>
            <p className="text-blue-100 text-xs opacity-80 mt-1">
              Beta Version | v{appVersion} 🚀
            </p>
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 right-0 bg-accent text-2xl text-white w-12 h-12 flex items-center justify-center rounded-full shadow-md"
            aria-label="Ir para a página inicial"
          >
            🏠
          </div>
        </div>
      </Link>
    </header>
  );
};

export default Header;