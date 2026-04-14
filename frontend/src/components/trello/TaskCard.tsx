import { Calendar, ChevronRight, ChevronLeft, Trash2, CheckSquare, ListTodo, Archive, Ban, AlertCircle, PauseCircle } from 'lucide-react';
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

import { Task, TaskFlag } from '../../types/trello/task';
import { getPriorityLabel, formatDate } from '../../utils/trello/taskUtils';
import { parseLocalDate, getCurrentBrazilDate } from '../../utils/helpers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const FlagIcon = ({ flag }: { flag?: TaskFlag }) => {
  if (!flag || flag === 'none') return null;

  const config = {
    blocked: { icon: Ban, color: 'text-red-500', label: 'Bloqueado' },
    impediment: { icon: AlertCircle, color: 'text-amber-500', label: 'Impedimento' },
    paused: { icon: PauseCircle, color: 'text-blue-500', label: 'Pausa' },
  };

  const { icon: Icon, color, label } = config[flag];

  return (
    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/5", color)} title={label}>
      <Icon className="w-3 h-3" />
      <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  index: number;
  onCardClick: (task: Task) => void;
  onMoveForward: (taskId: string) => void;
  onMoveBackward: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  onToggleChecklistItem?: (taskId: string, itemId: string) => void;
}

export const TaskCard = React.memo(({ 
  task, 
  index,
  onCardClick, 
  onMoveForward = () => {}, 
  onMoveBackward = () => {},
  onDelete = () => {},
  onArchive = () => {},
  onToggleChecklistItem = () => {}
}: TaskCardProps) => {
  const completedItems = task.checklist?.filter(i => i.completed).length || 0;
  const totalItems = task.checklist?.length || 0;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          id={`task-${task.id}`}
          onClick={() => onCardClick(task)}
          className={cn(
            "group cursor-grab active:cursor-grabbing relative",
            snapshot.isDragging && "z-[9999]"
          )}
        >
          <Card
            noPadding
            className={cn(
              "p-5 relative overflow-hidden transition-all duration-200",
              !snapshot.isDragging && "hover:scale-[1.02] hover:shadow-md",
              snapshot.isDragging && "shadow-2xl ring-2 ring-primary ring-offset-2 rotate-2 scale-105 pointer-events-none",
              task.columnId === 'done' && "opacity-80",
              task.flag === 'blocked' && "bg-red-500/5",
              task.flag === 'impediment' && "bg-amber-500/5",
              task.flag === 'paused' && "bg-blue-500/5"
            )}
          >
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {task.labels.map(label => (
                  <div
                    key={label.id}
                    className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white shadow-sm flex items-center justify-center min-w-[20px]"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.text}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 flex flex-col gap-1">
                <FlagIcon flag={task.flag} />
                <h3 className={cn(
                  "text-sm font-black text-foreground uppercase tracking-tight leading-tight",
                  task.columnId === 'done' && "line-through decoration-2"
                )}>
                  {task.title}
                </h3>
              </div>
              <div className="flex gap-1 transition-opacity">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(task.id);
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  title={task.columnId === 'archived' ? "Desarquivar" : "Arquivar"}
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveBackward(task.id);
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  title="Mover para trás"
                  disabled={task.columnId === 'todo'}
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
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  title="Mover para frente"
                  disabled={task.columnId === 'done'}
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

            {totalItems > 0 && (
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  <div className="flex-1 h-1.5 bg-foreground/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(completedItems / totalItems) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground">
                    {completedItems}/{totalItems}
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  {task.checklist?.slice(0, 20).map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-2 group/item cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleChecklistItem(task.id, item.id);
                      }}
                    >
                      {item.completed ? (
                        <CheckSquare className="w-3 h-3 text-primary group-hover/item:scale-110 transition-transform" />
                      ) : (
                        <div className="w-3 h-3 rounded-sm border-2 border-muted-foreground/30 group-hover/item:border-primary transition-colors" />
                      )}
                      <span className={cn(
                        "text-[10px] font-bold truncate transition-colors",
                        item.completed ? "line-through opacity-50" : "group-hover/item:text-primary"
                      )}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                  {totalItems > 20 && (
                    <div className="flex items-center gap-1.5 pl-4 text-[9px] font-black uppercase text-muted-foreground/50">
                      <ListTodo className="w-2.5 h-2.5" />
                      Mais {totalItems - 20} itens...
                    </div>
                  )}
                </div>
              </div>
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
                <div className={cn(
                  "flex items-center gap-1.5",
                  parseLocalDate(task.date.toString()) < getCurrentBrazilDate() && task.columnId !== 'done' ? "text-destructive" : "text-muted-foreground"
                )}>
                  <Calendar className="w-3 h-3" />
                  <span className="text-[10px] font-black">{formatDate(task.date.toString())}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );
});