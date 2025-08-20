import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { Task } from '../../types/trello/task';
import { createTask } from '../../utils/trello/taskUtils';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-handwriting text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'edit' ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block font-handwriting text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 font-handwriting"
                placeholder="Digite o título da tarefa"
                autoFocus
              />
            </div>

            <div>
              <label className="block font-handwriting text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none transition-colors duration-200 font-handwriting"
                placeholder="Adicione uma descrição (opcional)"
              />
            </div>

            <div>
              <label className="block font-handwriting text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prioridade
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'low', label: 'Baixa', color: 'bg-green-500' },
                  { value: 'medium', label: 'Média', color: 'bg-yellow-500' },
                  { value: 'high', label: 'Alta', color: 'bg-red-500' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(option.value as any)}
                    className={`p-2 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                      priority === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${option.color}`} />
                    <span className="font-handwriting text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-handwriting text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data (opcional)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 font-handwriting"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 font-handwriting"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 font-medium font-handwriting"
            >
              {mode === 'edit' ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}