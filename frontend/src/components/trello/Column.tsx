import React from 'react';

import { Task } from '../../types/trello/task';

import { TaskCard } from './TaskCard';
import { cn } from '../../lib/utils';

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
  onMoveForward: (taskId: string) => void;
  onMoveBackward: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export function Column({ id, title, tasks, onDragStart, onDragOver, onDrop, onDragLeaveColumn, dragOver, onCardClick, onDragEnd, onMoveForward, onMoveBackward, onDeleteTask }: ColumnProps) {
  const getColumnColor = () => {
    switch (id) {
      case 'todo':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'inProgress':
        return 'border-amber-500/20 bg-amber-500/5';
      case 'done':
        return 'border-green-500/20 bg-green-500/5';
    }
  };

  const getAccentColor = () => {
    switch (id) {
      case 'todo': return 'bg-blue-500';
      case 'inProgress': return 'bg-amber-500';
      case 'done': return 'bg-green-500';
    }
  };

  return (
    <div
      data-column-id={id}
      className={cn(
        "w-full rounded-[2rem] border-2 p-6 transition-all duration-300 min-h-[500px] bg-card",
        getColumnColor(),
        dragOver ? 'border-dashed border-primary scale-[1.02] shadow-2xl' : 'border-transparent'
      )}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, id)}
      onDragLeave={onDragLeaveColumn}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">{title}</h2>
          <div className={cn("w-12 h-1.5 mt-1 rounded-full", getAccentColor())}></div>
        </div>
        <div className="px-3 py-1 rounded-full bg-foreground/5 text-muted-foreground text-xs font-black">
          {tasks.length}
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onCardClick={onCardClick}
              onDragEnd={onDragEnd}
              onMoveForward={onMoveForward}
              onMoveBackward={onMoveBackward}
              onDelete={onDeleteTask}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/20 border-2 border-dashed border-border rounded-3xl">
            <span className="text-xs font-black uppercase tracking-widest">Vazio</span>
          </div>
        )}
      </div>
    </div>
  );
}