import { useState, useCallback, useMemo, useRef } from 'react';

/**
 * Hook to manage Brazilian currency inputs.
 * Handles formatting as R$ 0,00 while storing values as floats.
 */
export const useCurrencyInput = (initialValue: number = 0) => {
  const prevInitialRef = useRef<number>(initialValue);

  const [centavos, setCentavos] = useState<number>(Math.round(initialValue * 100));

  // Sync only when initialValue genuinely changes from outside (e.g. opening edit modal)
  // Using ref avoids the infinite loop caused by useEffect + setState
  if (prevInitialRef.current !== initialValue) {
    prevInitialRef.current = initialValue;
    const newCentavos = Math.round(initialValue * 100);
    if (newCentavos !== centavos) {
      setCentavos(newCentavos);
    }
  }

  const numericValue = useMemo(() => centavos / 100, [centavos]);

  const displayValue = useMemo(() => {
    if (centavos === 0) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numericValue);
  }, [centavos, numericValue]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const newCentavos = parseInt(digits || '0', 10);
    setCentavos(newCentavos);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && centavos === 0) {
      // placeholder já aparece quando centavos === 0
    }
  }, [centavos]);

  return {
    inputProps: {
      value: displayValue,
      onChange,
      onKeyDown,
      inputMode: 'numeric' as const,
      type: 'text',
    },
    numericValue,
  };
};