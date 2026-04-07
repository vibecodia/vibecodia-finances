import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Hook to manage Brazilian currency inputs.
 * Handles formatting as R$ 0,00 while storing values as floats.
 */
export const useCurrencyInput = (initialValue: number = 0) => {
  // Store value internally as centavos (integer)
  const [centavos, setCentavos] = useState<number>(Math.round(initialValue * 100));

  // Sync internal value if initialValue changes externally
  useEffect(() => {
    const newCentavos = Math.round(initialValue * 100);
    if (newCentavos !== centavos) {
      setCentavos(newCentavos);
    }
  }, [initialValue]);

  // The float value to be used in form state
  const numericValue = useMemo(() => centavos / 100, [centavos]);

  // Formatted string for the input display
  const displayValue = useMemo(() => {
    if (centavos === 0) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numericValue);
  }, [centavos, numericValue]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip all non-digits
    const digits = e.target.value.replace(/\D/g, '');
    
    // Convert to integer
    const newCentavos = parseInt(digits || '0', 10);
    
    setCentavos(newCentavos);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Standard input behavior usually suffices when stripping non-digits in onChange,
    // but we can add specific handling if needed.
    if (e.key === 'Backspace' && centavos === 0) {
      // Allow placeholder to show if we backspace on an empty-looking field
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
