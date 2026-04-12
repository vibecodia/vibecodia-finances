import React, { useState, useRef, useEffect } from 'react';

import { useVerification } from '../contexts/VerificationContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { cn } from '../lib/utils';
import { ShieldCheck, Loader2 } from 'lucide-react';

const VerificationModal: React.FC = () => {
  const [digits, setDigits] = useState<string[]>(['', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // New loading state
  const { verify, showVerificationModal } = useVerification();

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (showVerificationModal) {
      inputRefs[0].current?.focus();
      setDigits(['', '', '']);
      setError('');
      setIsLoading(false); // Reset loading state
    }
  }, [showVerificationModal]);

  useEffect(() => {
    // This effect handles focusing the first input when an error occurs
    if (error) {
      inputRefs[0].current?.focus();
    }
  }, [error]);

  const handleVerificationAttempt = async (fullCode: string) => {
    setIsLoading(true);
    setError(''); // Clear previous errors

    // Simulate a delay for the loading animation
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

    if (await verify(fullCode)) {
      // The verify function already handles closing the modal on success
      setCodeAndErrorOnSuccess();
    } else {
      setError('Código incorreto. Tente novamente.');
      setIsLoading(false); // Stop loading on error
      setDigits(['', '', '']); // Clear the digits
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]$/.test(value) && value !== '') {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value !== '' && index < inputRefs.length - 1) {
      inputRefs[index + 1].current?.focus();
    }

    if (newDigits.every(digit => digit !== '')) {
      const fullCode = newDigits.join('');
      handleVerificationAttempt(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && digits[index] === '' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const setCodeAndErrorOnSuccess = () => {
    setDigits(['', '', '']);
    setError('');
    setIsLoading(false); // Ensure loading is false on success
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = digits.join('');
    handleVerificationAttempt(fullCode);
  };

  if (!showVerificationModal) {
    return null;
  }

  const isButtonDisabled = digits.some(digit => digit === '') || isLoading;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 rounded-full bg-primary/10 text-primary mb-4 shadow-xl">
            {isLoading ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <ShieldCheck className="w-10 h-10" />
            )}
          </div>
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">
            Verificação Necessária
          </h2>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
            Por favor, insira o código de 3 dígitos para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={cn(
                  "w-16 h-20 text-4xl font-black text-center border-2 rounded-2xl transition-all focus:ring-4 focus:ring-primary/20 outline-none bg-card border-border text-foreground",
                  error && "border-red-500 text-red-500",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
                autoFocus={index === 0}
                ref={inputRefs[index]}
                disabled={isLoading}
              />
            ))}
          </div>
          
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-tight animate-shake">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isButtonDisabled}
            className="w-full h-14 text-base"
          >
            {isLoading ? 'Verificando...' : 'Verificar'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default VerificationModal;