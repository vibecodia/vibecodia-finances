import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

import { Task } from '../../types/trello/task';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  task: Task | null;
  fromColumn: string;
  toColumn: string;
}

const getColumnTitle = (columnId: string) => {
  switch (columnId) {
    case 'todo': return 'A Fazer';
    case 'inProgress': return 'Em Andamento';
    case 'done': return 'Concluído';
    default: return columnId;
  }
};

const getColumnStyles = (columnId: string) => {
  switch (columnId) {
    case 'todo': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'inProgress': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'done': return 'text-green-500 bg-green-500/10 border-green-500/20';
    default: return 'text-text/40 bg-text/5 border-cardBorder';
  }
};

export function TrelloConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  task, 
  fromColumn, 
  toColumn 
}: ConfirmationModalProps) {
  if (!isOpen || !task) return null;

  const isMovingToDone = toColumn === 'done';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 p-8 text-center">
        <div className="flex flex-col items-center mb-6">
          <div className={cn(
            "p-4 rounded-full mb-6 shadow-xl",
            isMovingToDone ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'
          )}>
            {isMovingToDone ? (
              <CheckCircle className="w-12 h-12" />
            ) : (
              <AlertTriangle className="w-12 h-12" />
            )}
          </div>

          <h3 className="text-2xl font-black text-text uppercase tracking-tight mb-2">
            {isMovingToDone ? 'Tarefa Concluída! 🎉' : 'Mover Tarefa'}
          </h3>
          
          <p className="text-sm text-text opacity-70 font-medium">
            {isMovingToDone 
              ? 'Parabéns! Você quer marcar esta tarefa como concluída?'
              : `Deseja mover esta tarefa para "${getColumnTitle(toColumn)}"?`
            }
          </p>
        </div>

        <div className="bg-cardBackground/50 border border-cardBorder rounded-2xl p-5 mb-6">
          <p className="text-sm font-black text-text uppercase tracking-tight mb-1">
            "{task.title}"
          </p>
          {task.description && (
            <p className="text-xs text-text opacity-60 font-medium line-clamp-1">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", getColumnStyles(fromColumn))}>
            {getColumnTitle(fromColumn)}
          </span>
          <ArrowRight className="w-4 h-4 text-text/20" />
          <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", getColumnStyles(toColumn))}>
            {getColumnTitle(toColumn)}
          </span>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1"
          >
            Confirmar
          </Button>
        </div>
      </Card>
    </div>
  );
}