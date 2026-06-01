import React from "react";
import { Check, Star, Zap } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

const PlansSection: React.FC = () => {
  const plans = [
    {
      name: "Gratuito",
      price: "R$ 0",
      description: "Ideal para começar sua jornada financeira.",
      features: [
        "Acesso básico ao dashboard",
        "Controle de gastos e receitas",
        "Relatórios mensais simples",
        "Dados salvos localmente",
      ],
      icon: Zap,
      buttonText: "Começar Agora",
      variant: "outline" as const,
    },
    {
      name: "Premium",
      price: "$ 1.00",
      period: "/ mês",
      description: "A experiência completa Vibecodia.",
      features: [
        "Backup seguro na nuvem",
        "Sincronização entre dispositivos",
        "Categorias personalizadas ilimitadas",
        "Suporte prioritário 24/7",
      ],
      icon: Star,
      buttonText: "Seja Premium",
      variant: "primary" as const,
      highlight: true,
    },
  ];

  return (
    <div className="w-full max-w-4xl space-y-10">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">
          Escolha seu <span className="text-primary italic">Plano</span>
        </h2>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest opacity-60">
          Desbloqueie o poder total da sua gestão
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.name}
              className={cn(
                "p-8 relative overflow-hidden flex flex-col transition-all duration-300 hover:translate-y-[-4px]",
                plan.highlight
                  ? "border-primary shadow-[0_20px_40px_-12px_rgba(var(--primary),0.2)] bg-primary/5"
                  : "border-white/5 bg-card/40",
              )}
            >
              {plan.highlight && (
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Recomendado
                </div>
              )}

              <div className="mb-8">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
                    plan.highlight
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-white/5 text-foreground",
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground font-bold">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-4 font-medium">
                  {plan.description}
                </p>
              </div>

              <div className="space-y-4 flex-1 mb-10">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                        plan.highlight
                          ? "bg-primary/20 text-primary"
                          : "bg-white/5 text-muted-foreground",
                      )}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold text-foreground/80 tracking-tight">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant={plan.variant}
                className={cn(
                  "w-full py-6 font-black uppercase tracking-widest text-xs",
                  !plan.highlight && "border-white/10 hover:bg-white/5",
                )}
              >
                {plan.buttonText}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PlansSection;
