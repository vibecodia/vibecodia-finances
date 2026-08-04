import { NotebookPen, Undo2 } from "lucide-react";
import React from "react";

import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../lib/utils";

/** Alterna entre o visual antigo (pré-caderno) e o "Caderno de contas".
 *  Auto-estiliza conforme o modo atual: chip de papel no caderno,
 *  glass branco sobre o header colorido no visual antigo. */
const DesignVariantToggle: React.FC = () => {
  const { designVariant, setDesignVariant } = useTheme();
  const isCaderno = designVariant === "caderno";

  return (
    <button
      onClick={() => setDesignVariant(isCaderno ? "legado" : "caderno")}
      title={
        isCaderno ? "Voltar ao visual antigo" : "Testar a versão caderno"
      }
      aria-label={
        isCaderno ? "Voltar ao visual antigo" : "Testar a versão caderno"
      }
      className={cn(
        "h-10 sm:h-12 px-3 sm:px-4 flex items-center gap-2 rounded-md text-xs font-medium whitespace-nowrap",
        "transition-all duration-300 active:scale-90",
        isCaderno
          ? "border border-rule bg-paperAlt text-pencil hover:text-ink hover:border-ruleStrong"
          : "border border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.1)]",
      )}
    >
      {isCaderno ? (
        <Undo2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
      ) : (
        <NotebookPen className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
      )}
      <span className="hidden md:inline leading-none">
        {isCaderno ? "visual antigo" : "testar versão caderno"}
      </span>
    </button>
  );
};

export default DesignVariantToggle;
