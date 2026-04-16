import React from 'react';
import { Droppable } from '@hello-pangea/dnd';

import { Maximize2, Minimize2 } from 'lucide-react';
import { Task } from '../../types/trello/task';

import { TaskCard } from './TaskCard';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface ColumnProps {
  id: 'todo' | 'inProgress' | 'done' | 'archived';
  title: string;
  tasks: Task[];
  isMinimal: boolean;
  searchTerm?: string;
  onToggleMinimal: () => void;
  onCardClick: (task: Task) => void;
  onMoveForward: (taskId: string) => void;
  onMoveBackward: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (taskId: string) => void;
  onFocusTask: (task: Task) => void;
  onToggleChecklistItem: (taskId: string, itemId: string) => void;
  allTasks: Task[];
}

export const Column = React.memo(({ 
  id, 
  title, 
  tasks, 
  isMinimal,
  searchTerm = '',
  onToggleMinimal,
  onCardClick, 
  onMoveForward, 
  onMoveBackward, 
  onDeleteTask, 
  onArchiveTask, 
  onFocusTask, 
  onToggleChecklistItem,
  allTasks
}: ColumnProps) => {
  const getColumnColor = () => {
    switch (id) {
      case 'todo':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'inProgress':
        return 'border-amber-500/20 bg-amber-500/5';
      case 'done':
        return 'border-green-500/20 bg-green-500/5';
      case 'archived':
        return 'border-gray-500/20 bg-gray-500/5';
    }
  };

  const getAccentColor = () => {
    switch (id) {
      case 'todo': return 'bg-blue-500';
      case 'inProgress': return 'bg-amber-500';
      case 'done': return 'bg-green-500';
      case 'archived': return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col min-w-[320px] max-w-[320px] h-full">
      <div className="mb-6 flex items-center justify-between px-2">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">{title}</h2>
            <Button
              onClick={onToggleMinimal}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted dark:hover:bg-muted/50 transition-all duration-200"
              title={isMinimal ? "Expandir todos" : "Minimizar todos"}
            >
              {isMinimal ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
            </Button>
          </div>
          <div className={cn("w-12 h-1.5 mt-1 rounded-full", getAccentColor())}></div>
        </div>
        <div className="px-3 py-1 rounded-full bg-foreground/5 text-muted-foreground text-xs font-black">
          {tasks.length}
        </div>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 rounded-[2rem] border-2 p-6 transition-all duration-300 min-h-[500px] bg-card/50 backdrop-blur-sm flex flex-col gap-4",
              getColumnColor(),
              snapshot.isDraggingOver ? 'border-dashed border-primary shadow-xl bg-card' : 'border-transparent'
            )}
          >
            {tasks.length > 0 ? (
              tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  allTasks={allTasks}
                  index={index}
                  isMinimalOverride={isMinimal}
                  searchTerm={searchTerm}
                  onCardClick={onCardClick}
                  onMoveForward={onMoveForward}
                    onMoveBackward={onMoveBackward}
                    onDelete={onDeleteTask}
                    onArchive={onArchiveTask}
                    onFocus={onFocusTask}
                    onToggleChecklistItem={onToggleChecklistItem}
                    />              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/20 border-2 border-dashed border-border rounded-3xl">
                <span className="text-xs font-black uppercase tracking-widest">Vazio</span>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
});