
import { Task } from '../../types/trello/task';
import { Edit2, Trash2, ArrowRight } from 'lucide-react';

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
    { id: 'todo', title: 'A Fazer' },
    { id: 'inProgress', title: 'Em Andamento' },
    { id: 'done', title: 'Concluído' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl w-80 max-w-md">
        <h3 className="font-handwriting text-xl font-bold text-gray-900 dark:text-white mb-4">
          Opções da Tarefa: {task.title}
        </h3>

        <div className="space-y-3 mb-4">
          {columns.map((column) => (
            <button
              key={column.id}
              onClick={() => handleMoveClick(column.id as 'todo' | 'inProgress' | 'done')}
              disabled={task.columnId === column.id}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 font-medium font-handwriting
                ${task.columnId === column.id
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
            >
              <ArrowRight className="w-4 h-4" />
              <span>Mover para {column.title}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-between space-x-2">
          <button
            onClick={handleEditClick}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors duration-200 font-medium font-handwriting"
          >
            <Edit2 className="w-4 h-4" />
            <span>Editar</span>
          </button>
          <button
            onClick={handleDeleteClick}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 font-medium font-handwriting"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors duration-200 font-medium font-handwriting"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}