import { Plus, Moon, Sun } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { useTheme } from '../../contexts/ThemeContext';
import { useLocalStorage } from '../../hooks/trello/useLocalStorage';
import { Task, Column as ColumnType } from '../../types/trello/task';

import { Column } from './Column';
import { MoveTaskModal } from './MoveTaskModal';
import { SearchBar } from './SearchBar';
import { TaskModal } from './TaskModal';
import { TrelloConfirmationModal } from './TrelloConfirmationModal';
import ConfirmationModal from '../ConfirmationModal';


const initialColumns: ColumnType[] = [
  { id: 'todo', title: 'A Fazer', tasks: [] },
  { id: 'inProgress', title: 'Em Andamento', tasks: [] },
  { id: 'done', title: 'Concluído', tasks: [] },
];

export function Board() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const { isDarkMode, toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    task: Task | null;
    fromColumn: string;
    toColumn: string;
  }>({ 
    isOpen: false, 
    task: null, 
    fromColumn: '', 
    toColumn: '' 
  });
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [taskToMove, setTaskToMove] = useState<Task | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
  }>({
    isOpen: false,
    taskId: null
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  const columns = useMemo(() => {
    return initialColumns.map(column => ({
      ...column,
      tasks: filteredTasks.filter(task => task.columnId === column.id)
    }));
  }, [filteredTasks]);

  const handleAddTask = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? task : t));
    } else {
      setTasks(prevTasks => [...prevTasks, task]);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    if (taskToMove && taskToMove.id === taskId) {
      setIsMoveModalOpen(false);
      setTaskToMove(null);
    }
    setDeleteConfirmation({ isOpen: false, taskId: null });
  };

  const openDeleteModal = (taskId: string) => {
    setDeleteConfirmation({ isOpen: true, taskId });
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const columnElement = target.closest('[data-column-id]');
    if (columnElement) {
      setDragOverColumn(columnElement.getAttribute('data-column-id'));
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: 'todo' | 'inProgress' | 'done') => {
    e.preventDefault();
    if (!draggedTask) return;
    if (draggedTask.columnId === columnId) {
      setDraggedTask(null);
      return;
    }

    setConfirmationModal({
      isOpen: true,
      task: draggedTask,
      fromColumn: draggedTask.columnId,
      toColumn: columnId
    });
    setDragOverColumn(null);
  };

  const handleConfirmMove = () => {
    if (!confirmationModal.task) return;

    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === confirmationModal.task!.id 
          ? { ...task, columnId: confirmationModal.toColumn as 'todo' | 'inProgress' | 'done' }
          : task
      )
    );
    
    setDraggedTask(null);
    setConfirmationModal({
      isOpen: false,
      task: null,
      fromColumn: '',
      toColumn: ''
    });
  };

  const handleCancelMove = () => {
    setDraggedTask(null);
    setConfirmationModal({
      isOpen: false,
      task: null,
      fromColumn: '',
      toColumn: ''
    });
  };

  

  const handleOpenMoveModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleMoveForward = (taskId: string) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          const currentColumn = task.columnId;
          let newColumn: 'todo' | 'inProgress' | 'done' = currentColumn;
          
          if (currentColumn === 'todo') newColumn = 'inProgress';
          else if (currentColumn === 'inProgress') newColumn = 'done';
          
          // Add animation class
          const taskElement = document.getElementById(`task-${taskId}`);
          if (taskElement) {
            taskElement.classList.add('animate-pulse');
            setTimeout(() => {
              taskElement.classList.remove('animate-pulse');
              // Show notification
              const columnNames = {
                todo: 'A Fazer',
                inProgress: 'Em Andamento',
                done: 'Concluído'
              };
              alert(`Card movido para ${columnNames[newColumn]}`);
            }, 500);
          }
          
          return { ...task, columnId: newColumn };
        }
        return task;
      });
    });
  };

  const handleMoveBackward = (taskId: string) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          const currentColumn = task.columnId;
          let newColumn: 'todo' | 'inProgress' | 'done' = currentColumn;
          
          if (currentColumn === 'inProgress') newColumn = 'todo';
          else if (currentColumn === 'done') newColumn = 'inProgress';
          
          // Add animation class
          const taskElement = document.getElementById(`task-${taskId}`);
          if (taskElement) {
            taskElement.classList.add('animate-pulse');
            setTimeout(() => {
              taskElement.classList.remove('animate-pulse');
              // Show notification
              const columnNames = {
                todo: 'A Fazer',
                inProgress: 'Em Andamento',
                done: 'Concluído'
              };
              alert(`Card movido para ${columnNames[newColumn]}`);
            }, 500);
          }
          
          return { ...task, columnId: newColumn };
        }
        return task;
      });
    });
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-handwriting text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Minhas Tarefas
            </h1>
            <p className="font-handwriting text-gray-600 dark:text-gray-400 text-lg">
              Organize seu trabalho e acompanhe seu progresso
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 transition-colors duration-200"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleAddTask}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-lg hover:shadow-xl font-handwriting"
            >
              <Plus className="w-5 h-5" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="flex flex-row overflow-x-auto gap-6 pb-4">
          {columns.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={column.tasks}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              dragOver={dragOverColumn === column.id}
              onCardClick={handleOpenMoveModal}
              onMoveForward={handleMoveForward}
              onMoveBackward={handleMoveBackward}
              onDeleteTask={openDeleteModal}
            />
          ))}
        </div>

        {/* Quick Add Button (Mobile) */}
        <button
          onClick={handleAddTask}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-center z-40"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Task Modal */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={openDeleteModal}
          task={editingTask}
          mode={editingTask ? 'edit' : 'create'}
        />

        {/* Confirmation Modal */}
        <TrelloConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={handleCancelMove}
          onConfirm={handleConfirmMove}
          task={confirmationModal.task}
          fromColumn={confirmationModal.fromColumn}
          toColumn={confirmationModal.toColumn}
        />

        {/* New Move Task Modal */}
         <MoveTaskModal
           isOpen={isMoveModalOpen}
           onClose={() => setIsMoveModalOpen(false)}
           task={taskToMove}
           onMove={handleMoveForward}
           onEdit={handleEditTask}
           onDelete={openDeleteModal}
         />

        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, taskId: null })}
          onConfirm={() => deleteConfirmation.taskId && handleDeleteTask(deleteConfirmation.taskId)}
          title="Excluir Tarefa"
          message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
          confirmText="Confirmar Exclusão"
        />
      </div>
    </div>
  );
}