import { AlertTriangle, CheckCircle } from 'lucide-react';

import { Task } from '../../types/trello/task';

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

const getColumnColor = (columnId: string) => {
  switch (columnId) {
    case 'todo': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'inProgress': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'done': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md transform transition-all duration-200 scale-100">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            {isMovingToDone ? (
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-blue-600" />
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">
            {isMovingToDone ? 'Tarefa Concluída! 🎉' : 'Mover Tarefa'}
          </h3>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="font-handwriting text-gray-800 dark:text-gray-200 font-semibold text-center mb-2">
              "{task.title}"
            </p>
            {task.description && (
              <p className="font-handwriting text-gray-600 dark:text-gray-400 text-sm text-center">
                {task.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center space-x-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getColumnColor(fromColumn)}`}>
              {getColumnTitle(fromColumn)}
            </span>
            <div className="text-gray-400">→</div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getColumnColor(toColumn)}`}>
              {getColumnTitle(toColumn)}
            </span>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            {isMovingToDone 
              ? 'Parabéns! Você quer marcar esta tarefa como concluída?'
              : `Deseja mover esta tarefa para "${getColumnTitle(toColumn)}"?`
            }
          </p>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors duration-200 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors duration-200 font-medium ${
                isMovingToDone 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isMovingToDone ? 'Concluir! ✨' : 'Mover'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}