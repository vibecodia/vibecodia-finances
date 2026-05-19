import { Calendar, ChevronRight, ChevronLeft, Trash2, CheckSquare, ListTodo, Archive, Ban, AlertCircle, PauseCircle, Maximize2, X, Link2, Clock, History, Pin } from 'lucide-react';
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';

import { Task, TaskFlag } from '../../types/trello/task';
import { getPriorityLabel, formatDate, formatTimeElapsed } from '../../utils/trello/taskUtils';
import { parseLocalDate, getCurrentBrazilDate } from '../../utils/helpers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Highlight } from './Highlight';

const FlagIcon = ({ flag, searchTerm }: { flag?: TaskFlag, searchTerm: string }) => {
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
      <Highlight 
        text={label} 
        searchTerm={searchTerm} 
        className="text-[8px] font-black uppercase tracking-tighter"
        highlightClassName="bg-current/10"
      />
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  allTasks?: Task[];
  index?: number;
  isFocusMode?: boolean;
  isMinimalOverride?: boolean;
  searchTerm?: string;
  onCardClick?: (task: Task) => void;
  onMoveForward?: (taskId: string) => void;
  onMoveBackward?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  onFocus?: (task: Task) => void;
  onCloseFocus?: () => void;
  onToggleChecklistItem?: (taskId: string, itemId: string) => void;
  onTogglePin?: (taskId: string) => void;
}

export const TaskCard = React.memo(({ 
  task, 
  allTasks = [],
  index = 0,
  isFocusMode = false,
  isMinimalOverride,
  searchTerm = '',
  onCardClick = () => {}, 
  onMoveForward = () => {}, 
  onMoveBackward = () => {},
  onDelete = () => {},
  onArchive = () => {},
  onFocus = () => {},
  onCloseFocus = () => {},
  onToggleChecklistItem = () => {},
  onTogglePin = () => {}
}: TaskCardProps) => {
  const completedItems = task.checklist?.filter(i => i.completed).length || 0;
  const totalItems = task.checklist?.length || 0;
  const isDone = task.columnId.includes('done');
  
  const totalLoggedHours = React.useMemo(() => 
    task.timeLogs?.reduce((acc, log) => acc + log.hours, 0) || 0
  , [task.timeLogs]);

  const timeInColumn = React.useMemo(() => 
    formatTimeElapsed(task.columnEnteredAt)
  , [task.columnEnteredAt]);

  const timeSinceCreation = React.useMemo(() => 
    formatTimeElapsed(task.createdAt)
  , [task.createdAt]);

  // Se houver busca e o item estiver em um dos campos pesquisados, forçamos a exibição expandida
  const hasSearchMatch = React.useMemo(() => {
    if (!searchTerm) return false;
    const lowerSearch = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(lowerSearch) ||
      (task.description?.toLowerCase() || '').includes(lowerSearch) ||
      task.checklist?.some(item => item.text.toLowerCase().includes(lowerSearch)) ||
      task.labels?.some(l => l.text.toLowerCase().includes(lowerSearch)) ||
      task.flag?.toLowerCase().includes(lowerSearch)
    );
  }, [task, searchTerm]);

  const isMinimal = !isFocusMode && (isMinimalOverride ?? isDone) && !hasSearchMatch;

  const pendingDependencies = task.dependsOn?.filter(depId => {
    const depTask = allTasks.find(t => t.id === depId);
    return depTask && !depTask.columnId.includes('done');
  }) || [];

  const isBlocked = pendingDependencies.length > 0 && !isDone;

  const CardContent = (
    <Card
      noPadding
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        isFocusMode ? "p-8 shadow-2xl border-2 border-primary/20 bg-card max-w-3xl w-full mx-auto" : 
        isMinimal ? "p-3 bg-muted/30 hover:bg-muted/50" : "p-5",
        !isFocusMode && "hover:scale-[1.01] hover:shadow-md",
        isDone && "opacity-60 grayscale-[0.2]",
        isBlocked && "opacity-50 grayscale bg-muted/20 cursor-not-allowed",
        task.isPinned && "border-primary/40 shadow-lg shadow-primary/5",
        task.flag === 'blocked' && "bg-red-500/5",
        task.flag === 'impediment' && "bg-amber-500/5",
        task.flag === 'paused' && "bg-blue-500/5"
      )}
    >
      {isFocusMode && (
        <Button
          onClick={onCloseFocus}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-10 w-10 rounded-full hover:bg-muted"
        >
          <X className="w-5 h-5" />
        </Button>
      )}

      {task.labels && task.labels.length > 0 && !isMinimal && (
        <div className={cn("flex flex-wrap gap-1.5", isFocusMode ? "mb-6" : "mb-2.5")}>
          {task.labels.map(label => (
            <div
              key={label.id}
              className={cn(
                "rounded font-black uppercase tracking-wider text-white shadow-sm flex items-center justify-center min-w-[20px]",
                isFocusMode ? "px-3 py-1 text-[10px]" : "px-2 py-0.5 text-[8px]"
              )}
              style={{ backgroundColor: label.color }}
            >
              {label.text}
            </div>
          ))}
        </div>
      )}

      {/* Top Row: Action Buttons and Flags */}
      {!isFocusMode && (
        <div className={cn(
          "flex items-center justify-between mb-2 gap-2 transition-opacity",
          isMinimal ? "opacity-0 group-hover:opacity-100" : ""
        )}>
          <div className="flex flex-wrap gap-2 items-center">
            {!isMinimal && <FlagIcon flag={task.flag} searchTerm={searchTerm} />}
            {isBlocked && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500" title={`Depende de ${pendingDependencies.length} tarefa(s) pendente(s)`}>
                <Link2 className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Bloqueada</span>
              </div>
            )}
            {task.isPinned && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                <Pin className="w-2.5 h-2.5 fill-current" />
                <span className="text-[8px] font-black uppercase tracking-tighter">Fixada</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(task.id);
              }}
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 p-0 transition-all",
                task.isPinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
              title={task.isPinned ? "Desafixar do Topo" : "Fixar no Topo"}
            >
              <Pin className={cn("w-3.5 h-3.5", task.isPinned && "fill-current")} />
            </Button>
            {!isMinimal && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus(task);
                }}
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 text-primary hover:bg-primary/10"
                title="Modo Foco"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            )}
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
            {!isMinimal && (
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
            )}
          </div>
        </div>
      )}

      {/* Title Row */}
      <div className={cn(
        "w-full flex items-start gap-2",
        isFocusMode ? "mb-8" : isMinimal ? "mb-0" : "mb-3"
      )}>
        {isMinimal && <CheckSquare className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />}
        {isMinimal && isBlocked && <Link2 className="w-3 h-3 text-red-500 shrink-0 mt-1" />}
        <h3 
          className={cn(
            "font-black text-foreground uppercase tracking-tight leading-tight w-full",
            isFocusMode ? "text-3xl" : "text-sm",
            isMinimal ? "truncate" : "whitespace-normal break-words",
            isDone && "line-through decoration-1 opacity-60"
          )}
          translate="no"
        >
          <span><Highlight text={task.title} searchTerm={searchTerm} /></span>
        </h3>
      </div>
      
      {task.description && !isMinimal && (
        <div className={cn(
          "text-muted-foreground font-medium",
          isFocusMode ? "text-base mb-10 leading-relaxed" : "text-xs mb-4 line-clamp-2"
        )}>
          <Highlight text={task.description} searchTerm={searchTerm} />
        </div>
      )}

      {totalItems > 0 && !isMinimal && (
        <div className={cn(isFocusMode ? "space-y-8 mb-10" : "space-y-3 mb-4")}>
          <div className="flex items-center gap-2">
            <CheckSquare className={cn("text-primary", isFocusMode ? "w-6 h-6" : "w-3.5 h-3.5")} />
            <div className={cn("flex-1 bg-foreground/5 rounded-full overflow-hidden", isFocusMode ? "h-3" : "h-1.5")}>
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(completedItems / totalItems) * 100}%` }}
              />
            </div>
            <span className={cn("font-black text-muted-foreground", isFocusMode ? "text-base" : "text-[10px]")}>
              {completedItems}/{totalItems}
            </span>
          </div>
          
          <div className={cn("space-y-1.5", isFocusMode && "grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 space-y-0")}>
            {task.checklist?.slice(0, isFocusMode ? 100 : 20).map((item) => {
              const itemMatches = searchTerm && item.text.toLowerCase().includes(searchTerm.toLowerCase());
              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex items-center gap-3 group/item cursor-pointer p-1 rounded transition-colors",
                    itemMatches ? "bg-primary/5 ring-1 ring-primary/20" : ""
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleChecklistItem(task.id, item.id);
                  }}
                >
                  {item.completed ? (
                    <CheckSquare className={cn("text-primary group-hover/item:scale-110 transition-transform", isFocusMode ? "w-5 h-5" : "w-3 h-3")} />
                  ) : (
                    <div className={cn(
                      "rounded-sm border-2 border-muted-foreground/30 group-hover/item:border-primary transition-colors",
                      isFocusMode ? "w-5 h-5" : "w-3 h-3"
                    )} />
                  )}
                  <Highlight 
                    text={item.text} 
                    searchTerm={searchTerm} 
                    className={cn(
                      "font-bold transition-colors",
                      isFocusMode ? "text-sm" : "text-[10px]",
                      item.completed ? "line-through opacity-50" : "group-hover/item:text-primary"
                    )}
                  />
                </div>
              );
            })}
            {!isFocusMode && totalItems > 20 && (
              <div className="flex items-center gap-1.5 pl-4 text-[9px] font-black uppercase text-muted-foreground/50">
                <ListTodo className="w-2.5 h-2.5" />
                Mais {totalItems - 20} itens...
              </div>
            )}
          </div>
        </div>
      )}
      
      {!isMinimal && (
        <div className={cn("flex items-center justify-between border-t border-border", isFocusMode ? "pt-8" : "pt-3")}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn("rounded-full", 
                isFocusMode ? "w-4 h-4" : "w-2 h-2",
                task.priority === 'high' ? 'bg-destructive' : 
                task.priority === 'medium' ? 'bg-amber-500' : 'bg-primary'
              )} />
              <span className={cn("font-black uppercase tracking-widest text-muted-foreground", isFocusMode ? "text-sm" : "text-[10px]")}>
                {getPriorityLabel(task.priority)}
              </span>
            </div>

            {totalLoggedHours > 0 && (
              <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 text-primary border border-primary/10", 
                isFocusMode ? "text-sm" : "text-[10px]"
              )}>
                <Clock className={cn(isFocusMode ? "w-4 h-4" : "w-3 h-3")} />
                <span className="font-black tracking-tighter">{totalLoggedHours}h</span>
              </div>
            )}

            <div className={cn("flex flex-wrap items-center gap-3 text-muted-foreground opacity-60", 
              isFocusMode ? "text-xs" : "text-[9px]"
            )}>
              <div className="flex items-center gap-1" title="Tempo nesta coluna">
                <History className="w-2.5 h-2.5" />
                <span className="font-bold uppercase">{timeInColumn}</span>
              </div>
              <div className="flex items-center gap-1 border-l border-border pl-3" title="Tempo total desde a criação">
                <Clock className="w-2.5 h-2.5 opacity-50" />
                <span className="font-bold uppercase">{timeSinceCreation}</span>
              </div>
            </div>
          </div>
          
          {task.date && (
            <div className={cn(
              "flex items-center gap-1.5",
              parseLocalDate(task.date.toString()) < getCurrentBrazilDate() && task.columnId !== 'done' ? "text-destructive" : "text-muted-foreground"
            )}>
              <Calendar className={cn(isFocusMode ? "w-5 h-5" : "w-3 h-3")} />
              <span className={cn("font-black", isFocusMode ? "text-sm" : "text-[10px]")}>{formatDate(task.date.toString())}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );

  if (isFocusMode) return CardContent;

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
          {CardContent}
        </div>
      )}
    </Draggable>
  );
});
