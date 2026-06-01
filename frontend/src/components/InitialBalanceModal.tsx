import React, { useState } from "react";
import { useCurrencyInput } from "../hooks/useCurrencyInput";
import { Sparkles, Wallet, X } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { cn } from "../lib/utils";

interface InitialBalanceModalProps {
  isOpen: boolean;
  onConfirm: (amount: number, type: "income" | "expense") => void;
  onClose: () => void;
}

const InitialBalanceModal: React.FC<InitialBalanceModalProps> = ({
  isOpen,
  onConfirm,
  onClose,
}) => {
  const appVersion = (import.meta as any).env.APP_VERSION;
  const [type, setType] = useState<"income" | "expense">("income");

  const {
    inputProps: amountInputProps,
    numericValue: amountValue,
    setNumericValue,
  } = useCurrencyInput(0);

  // Reset value when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setNumericValue(0);
      setType("income");
    }
  }, [isOpen, setNumericValue]);

  const handleConfirm = () => {
    if (amountValue > 0) {
      onConfirm(amountValue, type);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-xl animate-in fade-in duration-500">
      <Card className="w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300 text-center border-white/10 bg-card/80 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="p-6 rounded-full bg-primary/10 text-primary mb-6 shadow-[0_0_30px_rgba(var(--primary),0.2)] animate-pulse border border-primary/20">
            <Sparkles className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-3">
            <span className="text-primary italic">Vibecodia</span>
          </h2>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest leading-relaxed opacity-70">
            Vamos começar sua jornada financeira?
          </p>
        </div>

        <div className="space-y-8">
          <div className="text-left space-y-2">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">
              Saldo Inicial em Carteira
            </label>
            <div className="relative">
              <input
                {...amountInputProps}
                placeholder="0,00"
                className={cn(
                  "w-full h-20 text-4xl font-black text-center border-2 rounded-[2rem] transition-all focus:ring-8 focus:ring-primary/10 outline-none bg-background border-border text-foreground shadow-inner",
                  "focus:border-primary focus:scale-[1.02]",
                )}
                autoFocus
              />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-xl">
                R$
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType("income")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group",
                type === "income"
                  ? "bg-primary/10 border-primary shadow-lg scale-105"
                  : "bg-background border-border opacity-60 hover:opacity-100",
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-xl transition-colors",
                  type === "income"
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/20",
                )}
              >
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Saldo Positivo
              </span>
            </button>

            <button
              onClick={() => setType("expense")}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group",
                type === "expense"
                  ? "bg-red-500/10 border-red-500 shadow-lg scale-105"
                  : "bg-background border-border opacity-60 hover:opacity-100",
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-xl transition-colors",
                  type === "expense"
                    ? "bg-red-500 text-white"
                    : "bg-muted text-muted-foreground group-hover:bg-red-500/20",
                )}
              >
                <Wallet className="w-6 h-6 rotate-180" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">
                Saldo Devedor
              </span>
            </button>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleConfirm}
              disabled={amountValue === 0}
              className="w-full h-16 text-sm font-black uppercase tracking-[0.3em] rounded-2xl shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
            >
              Começar Agora
            </Button>

            <button
              onClick={onClose}
              className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-60 hover:opacity-100 hover:text-primary transition-all active:scale-95 py-2 px-4 rounded-xl hover:bg-primary/5"
            >
              Pular por enquanto
            </button>

            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-30 pt-2">
              Vibecodia Ecosystem v{appVersion} 🚀
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InitialBalanceModal;
