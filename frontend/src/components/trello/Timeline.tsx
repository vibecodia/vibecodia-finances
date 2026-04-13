import React, { useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addDays, 
  subDays,
  isToday,
  isWeekend,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

import { Task } from '../../types/trello/task';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface TimelineProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export const Timeline = ({ tasks, onTaskClick }: TimelineProps) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Gerar o intervalo de 14 dias (uma semana antes e uma depois da data atual)
  const days = useMemo(() => {
    const start = subDays(startOfWeek(currentDate, { weekStartsOn: 0 }), 7);
    const end = addDays(endOfWeek(currentDate, { weekStartsOn: 0 }), 14);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const tasksWithDates = useMemo(() => {
    return tasks
      .filter(task => task.date)
      .map(task => ({
        ...task,
        parsedDate: startOfDay(new Date(task.date!))
      }))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  }, [tasks]);

  const handlePrev = () => setCurrentDate(prev => subDays(prev, 7));
  const handleNext = () => setCurrentDate(prev => addDays(prev, 7));
  const handleToday = () => setCurrentDate(new Date());

  return (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-sm rounded-[2rem] border-2 border-border overflow-hidden">
      {/* Header da Timeline */}
      <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Linha do Tempo</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              {format(days[0], "dd 'de' MMMM", { locale: ptBR })} - {format(days[days.length - 1], "dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday} className="font-bold uppercase text-[10px]">
            Hoje
          </Button>
          <div className="flex items-center bg-foreground/5 rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid da Timeline */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative">
        <div className="min-w-[1200px]">
          {/* Cabeçalho de Dias */}
          <div className="flex border-b border-border sticky top-0 z-20 bg-card">
            <div className="w-48 flex-shrink-0 border-r border-border p-4 bg-muted/30">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tarefa</span>
            </div>
            {days.map((day) => (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "flex-1 min-w-[60px] p-3 flex flex-col items-center justify-center gap-1 border-r border-border/50",
                  isToday(day) && "bg-primary/5",
                  isWeekend(day) && "bg-muted/20"
                )}
              >
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={cn(
                  "text-sm font-black w-8 h-8 flex items-center justify-center rounded-full",
                  isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                )}>
                  {format(day, 'dd')}
                </span>
              </div>
            ))}
          </div>

          {/* Linhas de Tarefas */}
          <div className="relative">
            {tasksWithDates.length > 0 ? (
              tasksWithDates.map((task) => (
                <div key={task.id} className="flex border-b border-border/50 hover:bg-primary/5 transition-colors group">
                  <div 
                    className="w-48 flex-shrink-0 border-r border-border p-4 flex items-center gap-2 cursor-pointer"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      task.priority === 'high' ? 'bg-destructive' : 
                      task.priority === 'medium' ? 'bg-amber-500' : 'bg-primary'
                    )} />
                    <span className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                      {task.title}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex relative h-14">
                    {/* Linhas de grade verticais */}
                    {days.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "flex-1 border-r border-border/30",
                          isToday(day) && "bg-primary/5",
                          isWeekend(day) && "bg-muted/10"
                        )}
                      />
                    ))}

                    {/* Barra da Tarefa */}
                    {days.some(day => isSameDay(day, task.parsedDate)) && (
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 h-8 px-3 flex items-center rounded-lg shadow-lg cursor-pointer hover:scale-[1.02] transition-all z-10 overflow-hidden"
                        style={{
                          left: `${(days.findIndex(d => isSameDay(d, task.parsedDate)) / days.length) * 100}%`,
                          width: `${(1 / days.length) * 100}%`,
                          backgroundColor: task.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : 
                                           task.priority === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 
                                           'rgba(59, 130, 246, 0.15)',
                          borderLeft: `4px solid ${
                            task.priority === 'high' ? '#ef4444' : 
                            task.priority === 'medium' ? '#f59e0b' : '#3b82f6'
                          }`,
                        }}
                        onClick={() => onTaskClick(task)}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className={cn(
                            "w-3 h-3 flex-shrink-0",
                            task.priority === 'high' ? 'text-destructive' : 
                            task.priority === 'medium' ? 'text-amber-500' : 'text-primary'
                          )} />
                          <span className="text-[10px] font-black uppercase truncate">
                            {task.columnId === 'done' ? 'Fim' : 'Prazo'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
                <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                <span className="text-sm font-black uppercase tracking-widest">Nenhuma tarefa com data</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
