import { useState, useCallback, useMemo, useEffect } from "react";

/**
 * Hook to manage Brazilian currency inputs.
 * Handles formatting as R$ 0,00 while storing values as floats.
 */
export const useCurrencyInput = (initialValue: number = 0) => {
  const [centavos, setCentavos] = useState<number>(
    Math.round(Number(initialValue || 0) * 100),
  );

  // Sync when initialValue genuinely changes from outside (e.g. opening edit modal)
  useEffect(() => {
    const newCentavos = Math.round(Number(initialValue || 0) * 100);
    setCentavos(newCentavos);
  }, [initialValue]);

  const numericValue = useMemo(() => centavos / 100, [centavos]);

  const displayValue = useMemo(() => {
    if (centavos === 0) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numericValue);
  }, [centavos, numericValue]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const newCentavos = parseInt(digits || "0", 10);
    setCentavos(newCentavos);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && centavos === 0) {
        // placeholder já aparece quando centavos === 0
      }
    },
    [centavos],
  );

  const setNumericValue = useCallback((value: number) => {
    setCentavos(Math.round(Number(value || 0) * 100));
  }, []);

  return {
    inputProps: {
      value: displayValue,
      onChange,
      onKeyDown,
      inputMode: "numeric" as const,
      type: "text",
    },
    numericValue,
    setNumericValue,
  };
};
