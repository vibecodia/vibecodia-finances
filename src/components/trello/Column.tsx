import React from 'react';
import { TaskCard } from './TaskCard';
import { Task } from '../../types/trello/task';

interface ColumnProps {
  id: 'todo' | 'inProgress' | 'done';
  title: string;
  tasks: Task[];
  onDragStart: (task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: 'todo' | 'inProgress' | 'done') => void;
  dragOver: boolean;
  onCardClick: (task: Task) => void;
  onDragEnd: () => void;
  onDragLeaveColumn?: (e: React.DragEvent) => void;
}

export function Column({ id, title, tasks, onDragStart, onDragOver, onDrop, onDragLeaveColumn, dragOver, onCardClick, onDragEnd }: ColumnProps) {
  const getColumnColor = () => {
    switch (id) {
      case 'todo':
        return 'border-blue-200 dark:border-blue-300 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-100 dark:to-blue-200';
      case 'inProgress':
        return 'border-yellow-200 dark:border-yellow-300 bg-gradient-to-b from-yellow-50 to-yellow-100 dark:from-yellow-100 dark:to-yellow-200';
      case 'done':
        return 'border-green-200 dark:border-green-300 bg-gradient-to-b from-green-50 to-green-100 dark:from-green-100 dark:to-green-200';
    }
  };

  return (
    <div
      data-column-id={id}
      className={`w-full rounded-xl border-2 ${getColumnColor()} p-4 transition-all duration-200 ${dragOver ? 'border-dashed border-blue-500 scale-105' : ''}`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, id)}
      onDragLeave={onDragLeaveColumn}
    >
      <div className="mb-4">
        <h2 className="font-handwriting font-bold text-gray-800 dark:text-gray-900 text-xl mb-1">{title}</h2>
        <div className="w-12 h-1 bg-current opacity-30 rounded-full"></div>
      </div>
      
      <div className="flex flex-col gap-3 min-h-[300px]">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onCardClick={onCardClick}
              onDragEnd={onDragEnd}

            />
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 font-handwriting">
            Sem tarefas
          </div>
        )}
      </div>
    </div>
  );
}