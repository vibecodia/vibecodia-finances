import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingDown, TrendingUp, BarChart3, Target, Calendar, Settings, Menu, X, CheckSquare } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const activeTab = location.pathname;
  const { theme } = useTheme();

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
    { id: '/goals', label: 'Metas', icon: Target },
    { id: '/settings', label: 'Config', icon: Settings },
    { id: '/tasks', label: 'Tarefas', icon: CheckSquare },
  ];

  return (
    <>
      <button
        onClick={toggleMenu}
        className={cn(
          'fixed top-4 left-4 text-white rounded-full p-3 shadow-lg transition-all duration-300 ease-in-out z-50',
          'bg-primary hover:bg-secondary',
          { 'animate-pulse': !isMenuOpen }
        )}
        aria-label="Abrir menu"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-25 z-30 transition-opacity duration-300 ease-in-out"
        />
      )}

      <nav
        className={cn(
          'fixed top-0 left-0 h-full p-2 flex flex-col justify-start pt-20',
          'transition-all duration-300 ease-in-out z-40',
          {
            'translate-x-0 opacity-100': isMenuOpen,
            '-translate-x-full opacity-0': !isMenuOpen,
          }
        )}
        style={{ backgroundColor: theme.cardBackground, borderRight: `1px solid ${theme.cardBorder}` }}
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
                    'bg-primary text-white': isActive,
                    'text-text opacity-90 hover:bg-cardBorder hover:text-text': !isActive,
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