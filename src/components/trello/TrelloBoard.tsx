import React, { useState, useEffect } from 'react';
import { Column } from './Column';
import { Task } from '../../types/trello/task';
import { CheckSquare, Plus } from 'lucide-react';
import { TaskModal } from './TaskModal';

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
  };



  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <CheckSquare className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-text">Quadro de Tarefas</h1>
        </div>
      
      {showTaskModal && currentTask && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          task={currentTask}
          mode={currentTask.id ? 'edit' : 'create'}
        />
      )}
        <button 
          onClick={handleCreateTask}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>
      
      <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
        <div className="w-full">
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

          />
        </div>
        
        <div className="col-span-1">
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

          />
        </div>
        
        <div className="col-span-1">
          <Column 
            id="done" 
            title="Concluído" 
            tasks={tasks.done} 
            onDragStart={handleDragStart} 
            onDragOver={handleDragOver} 
            onDrop={handleDrop} 
            dragOver={dragOver === 'done'} 
            onCardClick={handleCardClick}
            onDragEnd={handleDragEnd}

          />
        </div>
      </div>
    </div>
  );
}