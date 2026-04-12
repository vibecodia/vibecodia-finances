import { X, Target, Flag } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Task } from '../../types/trello/task';
import { createTask } from '../../utils/trello/taskUtils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { cn } from '../../lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  task?: Task;
  mode: 'create' | 'edit';
}

export function TaskModal({ isOpen, onClose, onSave, task, mode }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [date, setDate] = useState('');

  useEffect(() => {
    if (task && mode === 'edit') {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setDate(task.date ? (typeof task.date === 'string' ? task.date : task.date.toISOString()) : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDate('');
    }
  }, [task, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (mode === 'edit' && task) {
      onSave({
        ...task,
        title: title.trim(),
        description: description.trim(),
        priority,
        date: date || undefined,
      });
    } else {
      const newTask = createTask(title.trim(), description.trim(), priority, date || undefined);
      onSave(newTask);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
              {mode === 'edit' ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-6">
            <Input
              label="Título *"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que precisa ser feito?"
              autoFocus
              required
            />

            <Textarea
              label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione mais detalhes aqui..."
              className="min-h-[120px]"
            />

            <div className="space-y-3">
              <label className="text-sm font-black text-text opacity-60 uppercase tracking-widest flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Prioridade
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'low', label: 'Baixa', color: 'bg-green-500' },
                  { value: 'medium', label: 'Média', color: 'bg-amber-500' },
                  { value: 'high', label: 'Alta', color: 'bg-red-500' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(option.value as any)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                      priority === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-cardBorder opacity-40 hover:opacity-100'
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-full shadow-sm", option.color)} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Data de Entrega"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-cardBorder">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!title.trim()}
                className="flex-1 sm:flex-none"
              >
                {mode === 'edit' ? 'Salvar Alterações' : 'Criar Tarefa'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}