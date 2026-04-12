import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import React from 'react';

import { Task } from '../../types/trello/task';
import { getPriorityLabel, formatDate } from '../../utils/trello/taskUtils';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface TaskCardProps {
  task: Task;
  onDragStart: (task: Task) => void;
  onCardClick: (task: Task) => void;
  onMoveForward: (taskId: string) => void;
  onMoveBackward: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onDragEnd?: () => void;
}

export function TaskCard({ task, onDragStart, onCardClick, onMoveForward = () => {}, onMoveBackward = () => {}, onDelete = () => {} }: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(task);
  };

  return (
    <Card
      id={`task-${task.id}`}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onCardClick(task)}
      className="group cursor-grab active:cursor-grabbing p-5 hover:scale-[1.02] transition-all relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-black text-foreground uppercase tracking-tight leading-tight flex-1">
          {task.title}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onMoveBackward(task.id);
            }}
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            title="Mover para trás"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onMoveForward(task.id);
            }}
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-0"
            title="Mover para frente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground font-medium mb-4 line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", 
            task.priority === 'high' ? 'bg-destructive' : 
            task.priority === 'medium' ? 'bg-amber-500' : 'bg-primary'
          )} />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {getPriorityLabel(task.priority)}
          </span>
        </div>
        
        {task.date && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-black">{task.date ? formatDate(task.date.toString()) : ''}</span>
          </div>
        )}
      </div>
    </Card>
  );
}