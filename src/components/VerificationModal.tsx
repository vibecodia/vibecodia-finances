import React, { useState, useRef, useEffect } from 'react';
import { useVerification } from '../contexts/VerificationContext';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Verificação Necessária</h2>
        <p className="mb-4">Por favor, insira o código de 3 dígitos para continuar.</p>
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center space-x-2 mb-4">
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
                className="w-12 h-12 text-3xl text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus={index === 0}
                ref={inputRefs[index]}
                disabled={isLoading} // Disable inputs during loading
              />
            ))}
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            type="submit"
            className={`w-full p-2 rounded-md text-white font-bold transition-colors duration-300
              ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}
            `}
            disabled={isButtonDisabled}
          >
            {isLoading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerificationModal;