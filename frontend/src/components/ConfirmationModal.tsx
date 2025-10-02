import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  const { theme } = useTheme();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-md transform transition-all" style={{ backgroundColor: theme.cardBackground }}>
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full mb-4" style={{ backgroundColor: theme.primary, opacity: 0.2 }}>
              <AlertTriangle className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
            <h3 className="text-xl font-semibold" style={{ color: theme.text }} id="modal-title">
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm" style={{ color: theme.text, opacity: 0.9 }}>
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex flex-col sm:flex-row-reverse gap-3 rounded-b-2xl" style={{ backgroundColor: theme.cardBackground }}>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:w-auto sm:text-sm transition-colors"
            style={{ backgroundColor: theme.primary }}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Confirmar Exclusão
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-xl shadow-sm px-4 py-2 text-base font-medium hover:bg-cardBorder focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:w-auto sm:text-sm transition-colors"
            style={{ backgroundColor: theme.cardBackground, color: theme.text, border: `1px solid ${theme.cardBorder}` }}
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;