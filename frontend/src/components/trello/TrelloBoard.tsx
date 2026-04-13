import { CheckSquare, Plus } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Task } from '../../types/trello/task';

import { Column } from './Column';
import { TaskModal } from './TaskModal';
import { Button } from '../ui/Button';
import ConfirmationModal from '../ConfirmationModal';

const initialTasks: Record<string, Task[]> = {
  todo: [],
  inProgress: [],
  done: []
};

export function TrelloBoard() {
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('trelloTasks');
    return savedTasks ? JSON.parse(savedTasks) : initialTasks;
  });

  useEffect(() => {
    localStorage.setItem('trelloTasks', JSON.stringify(tasks));
  }, [tasks]);
  const [dragOver, setDragOver] = useState<false | 'todo' | 'inProgress' | 'done'>(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
  }>({
    isOpen: false,
    taskId: null
  });

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, columnId: 'todo' | 'inProgress' | 'done') => {
    e.preventDefault();
    if (!draggedTask) return;

    // Remove da coluna original
    const updatedTasks = { ...tasks };
    for (const key in updatedTasks) {
      updatedTasks[key] = updatedTasks[key].filter((task: Task) => task.id !== draggedTask.id);
    }

    // Adiciona na nova coluna
    updatedTasks[columnId] = [...updatedTasks[columnId], draggedTask];
    setTasks(updatedTasks);
    setDragOver(false);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleCardClick = (task: Task) => {
    setCurrentTask(task);
    setShowTaskModal(true);
  };

  const handleCreateTask = () => {
    setCurrentTask({
      id: '',
      title: '',
      description: '',
      priority: 'medium',
      date: new Date().toISOString(),
      columnId: 'todo',
      createdAt: new Date().toISOString()
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = (task: Task) => {
    if (task.id) {
      // Update existing task
      const updatedTasks = { ...tasks };
      for (const key in updatedTasks) {
        updatedTasks[key] = updatedTasks[key].filter((t: Task) => t.id !== task.id);
      }
      updatedTasks[task.columnId] = [...updatedTasks[task.columnId], task];
      setTasks(updatedTasks);
    } else {
      // Create new task
      const newTask = {
        ...task,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      setTasks({
        ...tasks,
        [newTask.columnId]: [...tasks[newTask.columnId], newTask]
      });
    }
    setShowTaskModal(false);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = { ...tasks };
    for (const key in updatedTasks) {
      updatedTasks[key] = updatedTasks[key].filter((t: Task) => t.id !== taskId);
    }
    setTasks(updatedTasks);
    setShowTaskModal(false);
    setDeleteConfirmation({ isOpen: false, taskId: null });
  };

  const openDeleteModal = (taskId: string) => {
    setDeleteConfirmation({ isOpen: true, taskId });
  };

  return (
    <div className="p-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Tarefas</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase">Organize seu dia a dia</p>
          </div>
        </div>
      
      {showTaskModal && currentTask && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          onSave={handleSaveTask}
          onDelete={openDeleteModal}
          task={currentTask}
          mode={currentTask.id ? 'edit' : 'create'}
        />
      )}
        <Button 
          onClick={handleCreateTask}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        <Column 
          id="todo" 
          title="A Fazer" 
          tasks={tasks.todo} 
          onDragStart={handleDragStart} 
          onDragOver={handleDragOver} 
          onDrop={handleDrop} 
          dragOver={dragOver === 'todo'} 
          onCardClick={handleCardClick}
          onDragEnd={handleDragEnd}
          onMoveForward={(taskId) => {
            const updatedTasks = {...tasks};
            const task = updatedTasks.todo.find((t: Task) => t.id === taskId);
            if (task) {
              updatedTasks.todo = updatedTasks.todo.filter((t: Task) => t.id !== taskId);
              updatedTasks.inProgress = [...updatedTasks.inProgress, {...task, columnId: 'inProgress'}];
              setTasks(updatedTasks);
            }
          }}
          onMoveBackward={() => {}}
          onDeleteTask={openDeleteModal}
        />
        
        <Column 
          id="inProgress" 
          title="Em Progresso" 
          tasks={tasks.inProgress} 
          onDragStart={handleDragStart} 
          onDragOver={handleDragOver} 
          onDrop={handleDrop} 
          dragOver={dragOver === 'inProgress'} 
          onCardClick={handleCardClick}
          onDragEnd={handleDragEnd}
          onMoveForward={(taskId) => {
            const updatedTasks = {...tasks};
            const task = updatedTasks.inProgress.find((t: Task) => t.id === taskId);
            if (task) {
              updatedTasks.inProgress = updatedTasks.inProgress.filter((t: Task) => t.id !== taskId);
              updatedTasks.done = [...updatedTasks.done, {...task, columnId: 'done'}];
              setTasks(updatedTasks);
            }
          }}
          onMoveBackward={(taskId) => {
            const updatedTasks = {...tasks};
            const task = updatedTasks.inProgress.find((t: Task) => t.id === taskId);
            if (task) {
              updatedTasks.inProgress = updatedTasks.inProgress.filter((t: Task) => t.id !== taskId);
              updatedTasks.todo = [...updatedTasks.todo, {...task, columnId: 'todo'}];
              setTasks(updatedTasks);
            }
          }}
          onDeleteTask={openDeleteModal}
        />
        
        <Column 
          id="done" 
          title="Concluído" 
          tasks={tasks.done} 
          onDragStart={handleDragStart} 
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver('done');
          }} 
          onDrop={handleDrop} 
          dragOver={dragOver === 'done'} 
          onCardClick={handleCardClick} 
          onDragEnd={handleDragEnd} 
          onMoveForward={() => {}}
          onMoveBackward={(taskId) => {
            const updatedTasks = {...tasks};
            const task = updatedTasks.done.find((t: Task) => t.id === taskId);
            if (task) {
              updatedTasks.done = updatedTasks.done.filter((t: Task) => t.id !== taskId);
              updatedTasks.inProgress = [...updatedTasks.inProgress, {...task, columnId: 'inProgress'}];
              setTasks(updatedTasks);
            }
          }}
          onDeleteTask={openDeleteModal}
        />
      </div>

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, taskId: null })}
        onConfirm={() => deleteConfirmation.taskId && handleDeleteTask(deleteConfirmation.taskId)}
        title="Excluir Tarefa"
        message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
        confirmText="Confirmar Exclusão"
      />
    </div>
  );
}