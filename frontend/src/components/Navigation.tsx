import {
  BarChart3,
  Calendar,
  CheckSquare,
  HelpCircle,
  Home,
  Lock,
  LogOut,
  Menu,
  PieChart,
  RefreshCw,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { format } from "date-fns";

import { useVerification } from "../contexts/VerificationContext";
import { useTour } from "../hooks/useTour";
import { getCurrentBrazilDate } from "../utils/helpers";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";

interface NavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
}

interface NavGroup {
  title: string;
  tabs: NavTab[];
}

const Navigation: React.FC = () => {
  const appVersion = (import.meta as any).env.APP_VERSION;
  const location = useLocation();
  const activeTab = location.pathname;
  const { logout, isGuest, setShowVerificationModal } = useVerification();
  const { startTour } = useTour();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const handleCheckUpdates = () => {
    setIsCheckingUpdates(true);
    setTimeout(() => setIsCheckingUpdates(false), 2000);
  };

  // Rotas onde o menu começa fechado no desktop
  const routesWithoutDesktopMenu = ["/playground", "/tasks"];
  const hideOnDesktop = routesWithoutDesktopMenu.includes(location.pathname);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    if (path === "/settings" && isGuest) {
      e.preventDefault();
      setShowVerificationModal(true);
      return;
    }
    setIsMenuOpen(false);
  };

  const handleSimpleLinkClick = () => setIsMenuOpen(false);

  const groups: NavGroup[] = [
    {
      title: "conta",
      tabs: [
        { id: "/", label: "Resumo", icon: Home },
        { id: "/expenses", label: "Gastos", icon: TrendingDown },
        { id: "/income", label: "Receitas", icon: TrendingUp },
        { id: "/calendar", label: "Agenda", icon: Calendar },
        { id: "/reports", label: "Relatórios", icon: BarChart3 },
      ],
    },
    {
      title: "planos",
      tabs: [
        { id: "/goals", label: "Metas", icon: Target },
        { id: "/tasks", label: "Tarefas", icon: CheckSquare },
        { id: "/playground", label: "Playground", icon: PieChart, locked: isGuest },
      ],
    },
    {
      title: "sistema",
      tabs: [
        { id: "/settings", label: "Config", icon: Settings, locked: isGuest },
      ],
    },
  ];

  const todayLabel = format(getCurrentBrazilDate(), "dd 'de' MMMM");

  return (
    <>
      {/* Botão hamburguer:
          - Mobile: sempre visível
          - Desktop: visível apenas nas rotas bloqueadas (ex: /playground) */}
      <Button
        onClick={toggleMenu}
        size="icon"
        className={cn(
          "fixed top-4 left-4 z-[150] shadow-xl",
          hideOnDesktop ? "flex" : "lg:hidden",
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
            "fixed inset-0 bg-black/50 z-[140] transition-opacity duration-300 ease-in-out",
            hideOnDesktop ? "block" : "lg:hidden",
          )}
        />
      )}

      <nav
        id="tour-navigation"
        className={cn(
          "fixed top-0 lg:top-24 left-0 h-full lg:h-[calc(100vh-6rem)] p-2 flex flex-col justify-start pt-24 lg:pt-4 w-64",
          "transition-all duration-300 ease-in-out z-[145] bg-card border-r border-rule",
          "overflow-y-auto custom-scrollbar",
          {
            // Desktop behavior for normal routes: always visible
            "lg:z-40 lg:translate-x-0 lg:opacity-100": !hideOnDesktop,
            // Desktop behavior for special routes (playground): hidden by default
            "lg:z-[145]": hideOnDesktop,
            // General state behavior
            "translate-x-0 opacity-100": isMenuOpen,
            "-translate-x-full opacity-0":
              !isMenuOpen && (hideOnDesktop || true),
          },
        )}
      >
        <div className="flex flex-col items-start w-full">
          {/* Índice */}
          <div className="px-4 pt-2 pb-3 w-full">
            <p className="font-handwriting text-lg text-pencil">índice</p>
            <p className="font-mono text-[10px] text-pencil/70 tabular-nums">
              {todayLabel}
            </p>
          </div>

          {groups.map((group) => (
            <div key={group.title} className="w-full mb-1">
              <p className="px-4 pt-4 pb-1 font-mono text-[10px] tracking-[0.15em] text-pencil/70">
                {group.title}
              </p>
              {group.tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isLocked = tab.locked;

                const content = (
                  <>
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-transform",
                        isActive ? "scale-110" : "",
                      )}
                    />
                    <span className="text-sm font-medium flex items-center justify-between w-full">
                      {tab.label}
                      {isLocked && (
                        <Lock className="w-3.5 h-3.5 text-pencil/60" />
                      )}
                    </span>
                  </>
                );

                const commonClasses = cn(
                  "flex flex-row items-center gap-3 py-2 px-4 rounded-r-md w-full text-left transition-colors",
                  {
                    "border-l-2 border-pen bg-pen/5 text-ink": isActive,
                    "text-pencil hover:text-ink hover:bg-ink/5": !isActive,
                    "opacity-50": isLocked && !isActive,
                  },
                );

                if (isLocked) {
                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        commonClasses,
                        "pointer-events-none select-none",
                      )}
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={tab.id}
                    to={tab.id}
                    onClick={(e) => handleLinkClick(e, tab.id)}
                    className={commonClasses}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="mt-auto pb-4 pt-4 border-t border-rule w-full space-y-1">
          {isGuest && (
            <div className="flex items-center gap-3 px-4 py-2 w-full select-none opacity-70">
              <Lock className="w-4 h-4 text-pencil/60" />
              <span className="text-sm text-pencil">Receber PIN (em breve)</span>
            </div>
          )}

          <button
            onClick={() => {
              handleSimpleLinkClick();
              startTour(true);
            }}
            className="flex flex-row items-center gap-3 py-2 px-4 w-full text-left transition-colors text-pencil hover:text-ink hover:bg-ink/5 font-medium"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Fazer tour</span>
          </button>

          <button
            onClick={handleCheckUpdates}
            disabled={isCheckingUpdates}
            className={cn(
              "flex flex-row items-center gap-3 py-2 px-4 w-full text-left transition-colors font-medium",
              "text-pencil hover:text-ink hover:bg-ink/5",
              isCheckingUpdates && "opacity-70 cursor-not-allowed",
            )}
          >
            <RefreshCw
              className={cn("w-4 h-4", isCheckingUpdates && "animate-spin")}
            />
            <span className="text-sm">
              {isCheckingUpdates ? "Verificando..." : "Verificar atualizações"}
            </span>
          </button>

          <button
            onClick={() => {
              handleSimpleLinkClick();
              logout();
            }}
            className="flex flex-row items-center gap-3 py-2 px-4 w-full text-left transition-colors text-pencil hover:text-pen font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">
              {isGuest ? "Sair do modo convidado" : "Sair"}
            </span>
          </button>

          <p className="px-4 pt-3 font-mono text-[10px] text-pencil/70 tabular-nums">
            v{appVersion}
          </p>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
