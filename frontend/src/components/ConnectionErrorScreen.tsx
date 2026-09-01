import { WifiOff, RefreshCw, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useTheme } from "../contexts/ThemeContext";
import { useVerification } from "../contexts/VerificationContext";

import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface ConnectionErrorScreenProps {
  onRetry?: () => void | Promise<void>;
  errorMessage?: string | null;
}

export const ConnectionErrorScreen: React.FC<ConnectionErrorScreenProps> = ({
  onRetry,
  errorMessage,
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { enterGuestMode } = useVerification();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => {
        setIsRetrying(false);
      }, 600);
    }
  };

  const handleGuestFallback = () => {
    enterGuestMode();
    navigate("/");
  };

  return (
    <div
      className="min-h-[80vh] w-full flex items-center justify-center p-4 py-8 animate-in fade-in duration-500"
      style={{ backgroundColor: theme.background }}
    >
      <Card className="w-full max-w-lg p-8 sm:p-10 shadow-2xl text-center border-white/10 bg-card/60 backdrop-blur-2xl rounded-[2.5rem] relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Linha decorativa no topo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60" />

        {/* Ícone com pulso */}
        <div className="flex flex-col items-center mb-6 relative z-10">
          <div className="relative p-6 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-4 animate-pulse">
            <WifiOff className="w-12 h-12" />
            <div className="absolute top-1 right-1 p-1 rounded-full bg-amber-500 text-slate-950 shadow-md">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/90 mb-2">
            Status da Conexão
          </p>

          <h2 className="text-3xl sm:text-4xl font-black text-foreground uppercase tracking-tighter mb-3 leading-tight">
            OSCILAÇÃO NA <span className="text-primary italic">CONEXÃO</span>
          </h2>

          <p className="text-sm text-foreground/70 font-medium max-w-sm mx-auto leading-relaxed">
            Estamos enfrentando lentidão para sincronizar com o banco de dados online.
            Sua conexão com a internet pode ter oscilado.
          </p>

          {errorMessage && (
            <div className="mt-4 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-medium max-w-xs truncate">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Informações de tranquilidade */}
        <div className="p-4 rounded-2xl bg-foreground/5 border border-border/50 text-left flex items-center gap-3 mb-6 relative z-10">
          <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
          <div className="text-xs text-foreground/80">
            <span className="font-bold block">Seus dados continuam seguros</span>
            Nenhuma informação financeira foi perdida. Assim que a rede estabilizar, tudo voltará ao normal.
          </div>
        </div>

        {/* Ações */}
        <div className="space-y-3 relative z-10">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Reconectando..." : "Tentar Novamente"}
          </Button>

          <Button
            variant="ghost"
            onClick={handleGuestFallback}
            className="w-full text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 py-3"
          >
            Acessar Modo Local Temporário
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConnectionErrorScreen;
