import { Edit2, Trash2, ArrowRight, X } from 'lucide-react';

import { Task } from '../../types/trello/task';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

interface MoveTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onMove: (taskId: string, newColumnId: 'todo' | 'inProgress' | 'done') => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function MoveTaskModal({ isOpen, onClose, task, onMove, onEdit, onDelete }: MoveTaskModalProps) {
  if (!isOpen || !task) return null;

  const handleMoveClick = (newColumnId: 'todo' | 'inProgress' | 'done') => {
    onMove(task.id, newColumnId);
    onClose();
  };

  const handleEditClick = () => {
    onEdit(task);
    onClose();
  };

  const handleDeleteClick = () => {
    onDelete(task.id);
    onClose();
  };

  const columns = [
    { id: 'todo', title: 'A Fazer', color: 'bg-blue-500' },
    { id: 'inProgress', title: 'Em Andamento', color: 'bg-amber-500' },
    { id: 'done', title: 'Concluído', color: 'bg-green-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
            Opções
          </h3>
          <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-muted/50 border border-border rounded-2xl p-4">
            <p className="text-sm font-black text-foreground uppercase tracking-tight truncate">
              "{task.title}"
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2">Mover para</p>
            {columns.map((column) => (
              <Button
                key={column.id}
                onClick={() => handleMoveClick(column.id as 'todo' | 'inProgress' | 'done')}
                disabled={task.columnId === column.id}
                variant={task.columnId === column.id ? 'secondary' : 'outline'}
                className="w-full justify-start gap-3 h-12"
              >
                <div className={cn("w-2 h-2 rounded-full", column.color, task.columnId === column.id && "opacity-20")} />
                <span className="text-xs">{column.title}</span>
                {task.columnId !== column.id && <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-20" />}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleEditClick}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              <span>Editar</span>
            </Button>
            <Button
              onClick={handleDeleteClick}
              variant="danger"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}