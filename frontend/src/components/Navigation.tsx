import {
  Home,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Target,
  Calendar,
  Settings,
  Menu,
  X,
  CheckSquare,
  PieChart,
  LogOut,
  HelpCircle,
  Construction,
  MessageSquareCode,
  MessageCircle,
  Lock,
  RefreshCw,
} from "lucide-react";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useVerification } from "../contexts/VerificationContext";
import { useTour } from "../hooks/useTour";
import { cn } from "../lib/utils";

import { Button } from "./ui/Button";

const Navigation: React.FC = () => {
  const appVersion = import.meta.env.APP_VERSION;
  const location = useLocation();
  const activeTab = location.pathname;
  const { logout, isGuest, setShowVerificationModal } = useVerification();
  const { startTour } = useTour();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const handleComingSoon = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2000);
  };

  const handleCheckUpdates = () => {
    setIsCheckingUpdates(true);
    setTimeout(() => {
      setIsCheckingUpdates(false);
      // Aqui poderíamos mostrar um aviso de que está na última versão
    }, 2000);
  };

  // Rotas onde o menu começa fechado no desktop
  const routesWithoutDesktopMenu = ["/playground", "/tasks"];
  const hideOnDesktop = routesWithoutDesktopMenu.includes(location.pathname);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    if (path === "/settings" && isGuest) {
      e.preventDefault();
      setShowVerificationModal(true);
      return;
    }
    setIsMenuOpen(false);
  };

  const handleSimpleLinkClick = () => {
    setIsMenuOpen(false);
  };

  const tabs = [
    { id: "/", label: "Resumo", icon: Home },
    { id: "/expenses", label: "Gastos", icon: TrendingDown },
    { id: "/income", label: "Receitas", icon: TrendingUp },
    { id: "/calendar", label: "Agenda", icon: Calendar },
    { id: "/reports", label: "Relatórios", icon: BarChart3 },
    { id: "/playground", label: "Playground", icon: PieChart },
    { id: "/goals", label: "Metas", icon: Target },
    { id: "/tasks", label: "Tarefas", icon: CheckSquare },
    { id: "/settings", label: "Config", icon: Settings },
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
          "fixed top-4 left-4 z-[150] shadow-xl",
          !isMenuOpen && "animate-pulse",
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
          "transition-all duration-300 ease-in-out z-[145] lg:shadow-xl bg-card border-r-2 border-border",
          "overflow-y-auto custom-scrollbar",
          {
            // Desktop behavior for normal routes: always visible (z-40)
            "lg:z-40 lg:translate-x-0 lg:opacity-100": !hideOnDesktop,
            // Desktop behavior for special routes (playground): hidden by default (z-[145] when open)
            "lg:z-[145]": hideOnDesktop,

            // General state behavior
            "translate-x-0 opacity-100": isMenuOpen,
            "-translate-x-full opacity-0":
              !isMenuOpen && (hideOnDesktop || true), // true forces mobile hide
          },
        )}
      >
        <div className="flex flex-col items-start gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isSettingsLocked = tab.id === "/settings" && isGuest;
            const isPlaygroundLocked = tab.id === "/playground" && isGuest;
            const isLocked = isSettingsLocked || isPlaygroundLocked;

            const content = (
              <>
                <div className="relative">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform",
                      isActive ? "scale-110" : "",
                    )}
                  />
                  {isLocked && (
                    <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full p-0.5 border border-border shadow-sm">
                      <Lock className="w-2.5 h-2.5 text-primary animate-pulse" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold flex items-center justify-between w-full">
                  {tab.label}
                  {tab.id === "/tasks" && (
                    <span
                      className={cn(
                        "ml-2 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-tighter uppercase transition-all",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground opacity-90"
                          : "bg-foreground/10 text-muted-foreground opacity-60 group-hover:opacity-100",
                      )}
                    >
                      v{appVersion}
                    </span>
                  )}
                  {isPlaygroundLocked && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest animate-pulse">
                      Em breve
                    </span>
                  )}
                </span>
              </>
            );

            const commonClasses = cn(
              "flex flex-row items-center gap-3 py-2 px-4 rounded-lg w-full text-left transition-all",
              {
                "bg-primary text-primary-foreground": isActive,
                "text-foreground/90 hover:bg-accent hover:text-accent-foreground":
                  !isActive,
                "text-muted-foreground/40 opacity-50 cursor-not-allowed grayscale-[0.5]":
                  isLocked && !isActive,
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

        {/* Botões de Rodapé do Menu */}
        <div className="mt-auto pb-4 pt-4 border-t border-border w-full space-y-1">
          {isGuest && (
            <>
              {/* Seção Receber PIN - Visual Estilo Industrial/Painel */}
              <div
                onClick={handleComingSoon}
                className="px-4 py-3 mb-2 mx-2 rounded-2xl bg-slate-900/50 border border-white/5 shadow-inner cursor-pointer group/pin relative overflow-hidden active:scale-[0.98] transition-all"
              >
                {/* Overlay "Em breve" sutil */}
                <div
                  className={cn(
                    "absolute inset-0 bg-primary/10 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 z-20",
                    showComingSoon
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none",
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]">
                    Em breve
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <MessageSquareCode className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-foreground">
                    Receber PIN
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Selector Estilo Industrial - WhatsApp XOR SMS */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-white/5">
                    <div className="flex flex-col items-center gap-1 flex-1 opacity-40">
                      <MessageCircle className="w-4 h-4 text-green-500" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">
                        Whats
                      </span>
                    </div>

                    {/* Toggle Motor Style (XOR) - Default no Whats */}
                    <div className="w-12 h-6 bg-slate-900 rounded-full border border-white/10 p-1 relative cursor-not-allowed mx-2 shadow-inner">
                      {/* Knob posicionado no Whats (esquerda) */}
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500/50 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)] border border-white/10" />
                    </div>

                    <div className="flex flex-col items-center gap-1 flex-1 opacity-40">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <div className="w-3 h-3 border-2 border-primary rounded-[2px]" />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-tighter">
                        SMS
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Construction className="w-3 h-3 text-amber-400" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-400">
                      Em Manutenção
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  handleSimpleLinkClick();
                  startTour(true);
                }}
                className="flex flex-row items-center gap-3 py-2 px-4 rounded-lg w-full text-left transition-all text-primary hover:bg-primary/10 font-bold"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="text-sm">Fazer Tour</span>
              </button>
            </>
          )}

          <button
            onClick={handleCheckUpdates}
            disabled={isCheckingUpdates}
            className={cn(
              "flex flex-row items-center gap-3 py-2 px-4 rounded-lg w-full text-left transition-all font-bold",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              isCheckingUpdates && "opacity-70 cursor-not-allowed",
            )}
          >
            <RefreshCw
              className={cn("w-5 h-5", isCheckingUpdates && "animate-spin")}
            />
            <span className="text-sm">
              {isCheckingUpdates ? "Verificando..." : "Verificar Atualizações"}
            </span>
          </button>

          <button
            onClick={() => {
              handleSimpleLinkClick();
              logout();
            }}
            className="flex flex-row items-center gap-3 py-2 px-4 rounded-lg w-full text-left transition-all text-red-500 hover:bg-red-500/10 font-bold"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">
              {isGuest ? "Sair do Modo Convidado" : "Sair"}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
