import React, { useState, useEffect } from 'react';
import { useCurrencyInput } from '../hooks/useCurrencyInput';

interface InitialBalanceModalProps {
  isOpen: boolean;
  onConfirm: (amount: number, type: 'income' | 'expense') => void;
  onClose: () => void; // For skipping
}

const InitialBalanceModal: React.FC<InitialBalanceModalProps> = ({ isOpen, onConfirm, onClose }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');

  const { inputProps: amountInputProps, numericValue: amountValue } = useCurrencyInput(parseFloat(amount || '0'));

  useEffect(() => {
    const stringAmount = amountValue === 0 ? '' : amountValue.toString();
    if (stringAmount !== amount) {
      setAmount(stringAmount);
    }
  }, [amountValue, amount]);

  const handleConfirm = () => {
    if (amountValue > 0) {
      onConfirm(amountValue, type);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose} // Allow closing by clicking the backdrop
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-11/12 max-w-sm relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">Bem-vindo!</h2>
        <p className="mb-6 text-center text-gray-600 dark:text-gray-300">
          Seu banco de dados parece estar vazio. Deseja adicionar um saldo inicial?
        </p>

        <div className="mb-4">
          <label htmlFor="initial-balance" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Valor do Saldo
          </label>
          <input
            id="initial-balance"
            {...amountInputProps}
            placeholder="Ex: 1.000,00"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="flex items-center justify-center mb-6">
          <span className={`px-4 py-2 cursor-pointer rounded-l-md ${type === 'income' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
            onClick={() => setType('income')}
          >
            Saldo Positivo
          </span>
          <span className={`px-4 py-2 cursor-pointer rounded-r-md ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
            onClick={() => setType('expense')}
          >
            Ou Saldo Negativo
          </span>
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={handleConfirm}
            disabled={!amount}
            className="w-full p-2 rounded-md text-white font-bold bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 transition-colors duration-300"
          >
            Adicionar Valor
          </button>
          <button
            onClick={onClose}
            className="w-full p-2 rounded-md text-gray-700 dark:text-gray-200 font-bold bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
          >
            Pular
          </button>
        </div>
      </div>
    </div>
  );
};

export default InitialBalanceModal;
