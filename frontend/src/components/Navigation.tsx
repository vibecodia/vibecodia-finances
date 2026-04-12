import { Home, TrendingDown, TrendingUp, BarChart3, Target, Calendar, Settings, Menu, X, CheckSquare, PieChart } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '../lib/utils';
import { Button } from './ui/Button';

const Navigation: React.FC = () => {
  const location = useLocation();
  const activeTab = location.pathname;

  // Rotas onde o menu começa fechado no desktop
  const routesWithoutDesktopMenu = ['/playground'];
  const hideOnDesktop = routesWithoutDesktopMenu.includes(location.pathname);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  const tabs = [
    { id: '/', label: 'Resumo', icon: Home },
    { id: '/expenses', label: 'Gastos', icon: TrendingDown },
    { id: '/income', label: 'Receitas', icon: TrendingUp },
    { id: '/calendar', label: 'Agenda', icon: Calendar },
    { id: '/reports', label: 'Relatórios', icon: BarChart3 },
    { id: '/playground', label: 'Playground', icon: PieChart },
    { id: '/goals', label: 'Metas', icon: Target },
    { id: '/settings', label: 'Config', icon: Settings },
    { id: '/tasks', label: 'Tarefas', icon: CheckSquare },
  ];

  return (
    <>
      {/* Botão hamburguer:
          - Mobile: sempre visível
          - Desktop: visível apenas nas rotas bloqueadas (ex: /playground) */}
      <Button
        onClick={toggleMenu}
        size="icon"
        className={cn(
          'fixed top-4 left-4 z-[70] shadow-xl',
          !isMenuOpen && 'animate-pulse',
          hideOnDesktop ? 'flex' : 'lg:hidden',
        )}
        aria-label="Abrir menu"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>

      {/* Overlay escuro ao abrir o menu */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          className={cn(
            'fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ease-in-out',
            hideOnDesktop ? 'block' : 'lg:hidden',
          )}
        />
      )}

      <nav
        className={cn(
          'fixed top-0 lg:top-24 left-0 h-full lg:h-[calc(100vh-6rem)] p-2 flex flex-col justify-start pt-24 lg:pt-4 w-64',
          'transition-all duration-300 ease-in-out z-[65] lg:z-40 lg:shadow-xl bg-card border-r-2 border-border',
          {
            // Aberto manualmente (funciona em qualquer rota, mobile e desktop)
            'translate-x-0 opacity-100': isMenuOpen,
            // Fechado em rota normal: desktop expande automaticamente
            '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100': !isMenuOpen && !hideOnDesktop,
            // Fechado em rota bloqueada: fica escondido no desktop também
            '-translate-x-full opacity-0': !isMenuOpen && hideOnDesktop,
          }
        )}
      >
        <div className="flex flex-col items-start gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                to={tab.id}
                onClick={handleLinkClick}
                className={cn(
                  'flex flex-row items-center gap-3 py-2 px-4 rounded-lg w-full text-left transition-all',
                  {
                    'bg-primary text-primary-foreground': isActive,
                    'text-foreground/90 hover:bg-accent hover:text-accent-foreground': !isActive,
                  }
                )}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-sm font-semibold">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navigation;