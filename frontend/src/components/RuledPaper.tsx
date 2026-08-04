import React, { CSSProperties } from "react";

import { cn } from "../lib/utils";

interface RuledPaperProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Furos de fichário à esquerda */
  holes?: boolean;
  /** Margem vermelha interna (a global atravessa a página; esta é extra na folha) */
  margin?: boolean;
  /** Graus de rotação da folha (entra com animate-sheet-in) */
  rot?: number;
}

/**
 * Folha de papel do caderno: pauta, canto arredondado, sombra leve.
 * Base reutilizável para o Saldo, Entradas/saídas, Vales e Metas.
 */
export const RuledPaper: React.FC<RuledPaperProps> = ({
  holes = false,
  margin = false,
  rot = 0,
  className,
  children,
  ...props
}) => {
  return (
    <div
      {...props}
      className={cn(
        "ruled relative bg-paperAlt border border-ruleStrong rounded-md shadow-paper animate-sheet-in",
        className,
      )}
      style={{ "--sheet-rot": `${rot}deg` } as CSSProperties}
    >
      {margin && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-3 w-px bg-pen/70 animate-margin-draw"
        />
      )}
      {holes && (
        <div
          aria-hidden
          className="absolute left-2 inset-y-6 flex flex-col justify-between"
        >
          <span className="w-2.5 h-2.5 rounded-full border border-rule bg-background/80" />
          <span className="w-2.5 h-2.5 rounded-full border border-rule bg-background/80" />
          <span className="w-2.5 h-2.5 rounded-full border border-rule bg-background/80" />
        </div>
      )}
      {children}
    </div>
  );
};

export default RuledPaper;
