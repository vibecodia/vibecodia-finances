import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { useVerification } from "../contexts/VerificationContext";
import { Card } from "./ui/Card";
import { cn } from "../lib/utils";
import {
  ShieldCheck,
  Loader2,
  Delete,
  X,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui/Button";

const VerificationModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const appVersion = (import.meta as any).env.APP_VERSION;
  const [digits, setDigits] = useState<string[]>(["", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    verify,
    showVerificationModal,
    setShowVerificationModal,
    isVerified,
  } = useVerification();

  const handleExit = () => {
    if (isLoading) return;

    // Se estiver tentando acessar settings e não for verificado, volta para home
    if (location.pathname === "/settings") {
      navigate("/");
    }

    setShowVerificationModal(false);
  };

  useEffect(() => {
    if (showVerificationModal) {
      setDigits(["", "", ""]);
      setError("");
      setIsLoading(false);
    }
  }, [showVerificationModal]);

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showVerificationModal || isLoading) return;

      if (/^[0-9]$/.test(e.key)) {
        handleDigitClick(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showVerificationModal, isLoading, digits]);

  const handleVerificationAttempt = async (fullCode: string) => {
    setIsLoading(true);
    setError("");

    // Simulate a delay for the loading animation
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (await verify(fullCode)) {
      setCodeAndErrorOnSuccess();
    } else {
      setError("Código incorreto. Tente novamente.");
      setIsLoading(false);
      setDigits(["", "", ""]);

      // Se errar o PIN e não estiver verificado, volta para a tela de boas-vindas
      if (!isVerified) {
        setTimeout(() => {
          setShowVerificationModal(false);
          navigate("/guest");
        }, 1500); // Dá um tempo para o usuário ler o erro antes de fechar
      }
    }
  };

  const handleDigitClick = (digit: string) => {
    if (isLoading) return;

    const nextEmptyIndex = digits.findIndex((d) => d === "");
    if (nextEmptyIndex !== -1) {
      const newDigits = [...digits];
      newDigits[nextEmptyIndex] = digit;
      setDigits(newDigits);

      if (newDigits.every((d) => d !== "")) {
        handleVerificationAttempt(newDigits.join(""));
      }
    }
  };

  const handleDelete = () => {
    if (isLoading) return;

    const lastFilledIndex = [...digits].reverse().findIndex((d) => d !== "");
    if (lastFilledIndex !== -1) {
      const actualIndex = digits.length - 1 - lastFilledIndex;
      const newDigits = [...digits];
      newDigits[actualIndex] = "";
      setDigits(newDigits);
    }
  };

  const setCodeAndErrorOnSuccess = () => {
    setDigits(["", "", ""]);
    setError("");
    setIsLoading(false);
  };

  if (!showVerificationModal) {
    return null;
  }

  const PinButton: React.FC<{
    value: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }> = ({ value, onClick, icon }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-2xl font-black rounded-full transition-all active:scale-90",
        "bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 hover:text-primary text-foreground/80",
        "disabled:opacity-20 disabled:cursor-not-allowed shadow-lg",
        "backdrop-blur-sm",
      )}
    >
      {icon || value}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-2xl animate-in fade-in duration-500">
      <Card className="w-full max-w-sm p-8 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300 text-center border-white/10 bg-card/40">
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={() => window.location.reload()}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/20 transition-all active:scale-90"
            title="Recarregar página"
          >
            <RefreshCw size={16} />
          </button>
          <div className="p-5 rounded-full bg-primary/10 text-primary mb-4 shadow-[0_0_30px_rgba(var(--primary),0.2)] border border-primary/20">
            {isLoading ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <ShieldCheck className="w-10 h-10" />
            )}
          </div>
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-2">
            Segurança <span className="text-primary italic">Vibecodia</span>
          </h2>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
            Acesso Restrito • Digite o PIN
          </p>
          {!isVerified && (
            <div className="mt-4 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em]">
                Premium: Temas Ilimitados e Backup em Nuvem
              </p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {/* Display area */}
          <div className="flex justify-center gap-4 mb-4">
            {digits.map((digit, index) => (
              <div
                key={index}
                className={cn(
                  "w-14 h-18 sm:w-16 sm:h-20 flex items-center justify-center text-4xl font-black border-2 rounded-2xl transition-all",
                  digit
                    ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                    : "bg-background/20 border-border text-muted-foreground/10",
                  error &&
                    "border-red-500 text-red-500 animate-shake bg-red-500/5",
                  isLoading && "opacity-50",
                )}
              >
                {digit ? (
                  <div className="w-3 h-3 rounded-full bg-primary animate-in zoom-in-0 duration-200" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="py-2 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest animate-shake">
              {error}
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <PinButton
                key={num}
                value={num.toString()}
                onClick={() => handleDigitClick(num.toString())}
              />
            ))}
            <PinButton
              value="C"
              onClick={() => setDigits(["", "", ""])}
              icon={<X className="w-5 h-5 opacity-50" />}
            />
            <PinButton value="0" onClick={() => handleDigitClick("0")} />
            <PinButton
              value="DEL"
              onClick={handleDelete}
              icon={<Delete className="w-5 h-5 opacity-50" />}
            />
          </div>

          <div className="flex flex-col items-center gap-6">
            {isVerified || location.pathname === "/settings" ? (
              <Button
                variant="ghost"
                onClick={handleExit}
                disabled={isLoading}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Desistir e Voltar
              </Button>
            ) : (
              location.pathname !== "/guest" && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowVerificationModal(false);
                    navigate("/guest");
                  }}
                  disabled={isLoading}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all flex items-center gap-2"
                >
                  Explorar Outras Opções
                </Button>
              )
            )}

            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-30">
              Criptografado Vibecodia v{appVersion}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VerificationModal;
