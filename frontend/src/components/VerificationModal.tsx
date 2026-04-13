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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-xl animate-in fade-in duration-500">
      <Card className="w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 duration-300 text-center border-white/10 bg-card/80">
        <div className="flex flex-col items-center mb-8">
          <div className="p-6 rounded-full bg-primary/10 text-primary mb-6 shadow-[0_0_30px_rgba(var(--primary),0.2)] animate-pulse border border-primary/20">
            {isLoading ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : (
              <ShieldCheck className="w-12 h-12" />
            )}
          </div>
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-3">
            Verificação <span className="text-primary italic">Vibecodia</span>
          </h2>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest leading-relaxed opacity-70">
            Acesso Restrito • Digite o PIN
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-center gap-4">
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
                  "w-20 h-24 text-5xl font-black text-center border-2 rounded-[2rem] transition-all focus:ring-8 focus:ring-primary/10 outline-none bg-background border-border text-foreground shadow-inner",
                  error && "border-red-500 text-red-500 ring-4 ring-red-500/10",
                  isLoading && "opacity-50 cursor-not-allowed",
                  !error && !isLoading && "focus:border-primary focus:scale-105"
                )}
                autoFocus={index === 0}
                ref={inputRefs[index]}
                disabled={isLoading}
              />
            ))}
          </div>
          
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isButtonDisabled}
              className="w-full h-16 text-sm font-black uppercase tracking-[0.3em] rounded-2xl shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
            >
              {isLoading ? 'Verificando...' : 'Desbloquear'}
            </Button>
            
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.4em] opacity-30">
              Segurança Criptografada Vibecodia
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default VerificationModal;