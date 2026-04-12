import { AlertTriangle } from 'lucide-react';
import React from 'react';

import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar Exclusão',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="p-4 rounded-full mb-6 bg-primary/10 text-primary">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-3">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="px-8 py-6 flex flex-col sm:flex-row-reverse gap-4 bg-muted/50 border-t border-border">
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1"
          >
            {confirmText}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmationModal;