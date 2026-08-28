import { Pencil } from "lucide-react";
import React, { useState, useEffect } from "react";

import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  title: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
}

export const InputModal: React.FC<InputModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  label,
  placeholder,
  initialValue = "",
  confirmText = "Salvar",
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSave(value.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full mb-6 bg-primary/10 text-primary">
                <Pencil className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-6">
                {title}
              </h3>
              <Input
                label={label}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                onFocus={(e) => e.target.select()}
                className="text-center"
              />
            </div>
          </div>
          <div className="px-8 py-6 flex flex-col sm:flex-row-reverse gap-4 bg-muted/50 border-t border-border">
            <Button type="submit" disabled={!value.trim()} className="flex-1">
              {confirmText}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
