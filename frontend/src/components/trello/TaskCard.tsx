import { Calendar } from 'lucide-react';
import React from 'react';

import { Task } from '../../types/trello/task';
import { getPriorityColor, getPriorityLabel, formatDate } from '../../utils/trello/taskUtils';

interface TaskCardProps {
  task: Task;
  onDragStart: (task: Task) => void;
  onCardClick: (task: Task) => void;
  onMoveForward: (taskId: string) => void;
  onMoveBackward: (taskId: string) => void;
  onDragEnd?: () => void;
}

export function TaskCard({ task, onDragStart, onCardClick, onMoveForward = () => {}, onMoveBackward = () => {} }: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(task);
  };

  return (
    <div className="relative">
      <div className="absolute -top-2 right-0 flex space-x-1 z-20">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMoveForward(task.id);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-md shadow-md transition-colors"
          title="Mover para frente"
        >
          ➡️
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMoveBackward(task.id);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-md shadow-md transition-colors"
          title="Mover para trás"
        >
          ⬅️
        </button>
      </div>
      
      <div
        id={`task-${task.id}`}
        draggable
        onDragStart={handleDragStart}
        onClick={() => onCardClick(task)}
        
        onContextMenu={(e) => e.preventDefault()}
        className="bg-white dark:bg-gray-100 rounded-lg p-4 shadow-md hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing border-2 border-gray-300 dark:border-gray-400 group relative overflow-hidden transform transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
      >
      {/* Quadro branco texture */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="w-full h-full" style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px, 20px 20px, 20px 20px'
        }} />
      </div>
      
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-handwriting font-bold text-gray-800 dark:text-gray-900 text-base leading-tight flex-1 pr-2 relative z-10">
          {task.title}
        </h3>
        
      </div>
      
      {task.description && (
        <p className="hidden md:block font-handwriting text-gray-700 dark:text-gray-800 text-sm mb-3 leading-relaxed relative z-10">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
          <span className="font-handwriting text-sm text-gray-600 dark:text-gray-700 font-medium relative z-10">
            {getPriorityLabel(task.priority)}
          </span>
        </div>
        
        {task.date && (
          <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-700 relative z-10">
            <Calendar className="w-3 h-3" />
            <span className="font-handwriting text-sm">{task.date ? formatDate(task.date.toString()) : ''}</span>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}