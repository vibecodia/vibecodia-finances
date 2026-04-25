import { X, Target, Flag, Trash2, Plus, CheckCircle2, Circle, GripVertical, Check, Archive, AlertCircle, PauseCircle, Ban, Tag, Link2, ArrowDownAz, Columns, Clock, History, Calendar as CalendarIcon, Pin, Maximize2, Minimize2 } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { Task, ChecklistItem, TaskFlag, TaskLabel, Column, TimeLog } from '../../types/trello/task';
import { createTask, generateId, formatTimeElapsed } from '../../utils/trello/taskUtils';
import { getBrazilDateString } from '../../utils/helpers';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { cn } from '../../lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onAutoSave?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
  task?: Task;
  allTasks?: Task[];
  columns?: Omit<Column, 'tasks'>[];
  mode: 'create' | 'edit';
}

export function TaskModal({ isOpen, onClose, onSave, onAutoSave, onDelete, onArchive, task, allTasks = [], columns = [], mode }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [date, setDate] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempItemText, setTempItemText] = useState('');
  const [flag, setFlag] = useState<TaskFlag>('none');
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6'); // Default blue
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [columnId, setColumnId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Time Logging State
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [newLogHours, setNewLogHours] = useState('');
  const [newLogDate, setNewLogDate] = useState(getBrazilDateString());
  const [newLogDescription, setNewLogDescription] = useState('');

  const labelColors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
  ];

  const availableTasks = useMemo(() => {
    return allTasks.filter(t => 
      t.id !== task?.id && 
      t.columnId !== 'archived'
    );
  }, [allTasks, task]);

  const hasCycle = (taskId: string, targetDependencyId: string, currentTasks: Task[]): boolean => {
    const visited = new Set<string>();
    const stack = [targetDependencyId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (currentId === taskId) return true;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentTask = currentTasks.find(t => t.id === currentId);
      if (currentTask?.dependsOn) {
        stack.push(...currentTask.dependsOn);
      }
    }
    return false;
  };

  const toggleDependency = (depId: string) => {
    if (dependsOn.includes(depId)) {
      setDependsOn(dependsOn.filter(id => id !== depId));
    } else {
      if (task?.id && hasCycle(task.id, depId, allTasks)) {
        alert('Esta dependência criaria um ciclo (A depende de B e B depende de A).');
        return;
      }
      setDependsOn([...dependsOn, depId]);
    }
  };

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id);
      onClose();
    }
  };

  const handleArchive = () => {
    if (task && onArchive) {
      onArchive(task.id);
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (task && mode === 'edit') {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setDate(task.date ? (typeof task.date === 'string' ? task.date : getBrazilDateString(task.date)) : '');
      setChecklist(task.checklist || []);
      setFlag(task.flag || 'none');
      setLabels(task.labels || []);
      setDependsOn(task.dependsOn || []);
      setColumnId(task.columnId);
      setIsPinned(task.isPinned || false);
      setTimeLogs(task.timeLogs || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDate(getBrazilDateString());
      setChecklist([]);
      setFlag('none');
      setLabels([]);
      setDependsOn([]);
      setColumnId(columns[0]?.id || '');
      setIsPinned(false);
      setTimeLogs([]);
    }

    // Reset temporary input fields when task changes or modal opens
    setNewChecklistItem('');
    setNewLabelText('');
    setNewLogHours('');
    setNewLogDescription('');
    setEditingItemId(null);
    setTempItemText('');
    setNewLogDate(getBrazilDateString());
  }, [task, mode, isOpen, columns]);

  const addLabel = () => {
    if (!newLabelText.trim()) return;
    const newLabel: TaskLabel = {
      id: generateId(),
      text: newLabelText.trim(),
      color: newLabelColor
    };
    setLabels([...labels, newLabel]);
    setNewLabelText('');
  };

  const removeLabel = (id: string) => {
    setLabels(labels.filter(label => label.id !== id));
  };

  const triggerAutoSave = (updatedChecklist: ChecklistItem[]) => {
    if (mode === 'edit' && task && onAutoSave && title.trim()) {
      onAutoSave({
        ...task,
        title: title.trim(),
        description: description.trim(),
        priority,
        date: date || undefined,
        columnId,
        checklist: updatedChecklist,
        flag,
        labels,
        dependsOn,
        timeLogs,
        isPinned,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: generateId(),
      text: newChecklistItem.trim(),
      completed: false
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewChecklistItem('');
    triggerAutoSave(updated);
  };

  const toggleChecklistItem = (id: string) => {
    const updated = checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    triggerAutoSave(updated);
  };

  const removeChecklistItem = (id: string) => {
    const updated = checklist.filter(item => item.id !== id);
    setChecklist(updated);
    triggerAutoSave(updated);
  };

  const addTimeLog = () => {
    const hours = parseFloat(newLogHours);
    if (isNaN(hours) || hours <= 0) return;

    const newLog: TimeLog = {
      id: generateId(),
      hours,
      date: newLogDate,
      description: newLogDescription.trim() || undefined
    };

    setTimeLogs([newLog, ...timeLogs]);
    setNewLogHours('');
    setNewLogDescription('');
  };

  const removeTimeLog = (id: string) => {
    setTimeLogs(timeLogs.filter(log => log.id !== id));
  };

  const totalLoggedHours = useMemo(() => 
    timeLogs.reduce((acc, log) => acc + log.hours, 0)
  , [timeLogs]);

  const reorganizeChecklist = () => {
    const uncompleted = checklist.filter(item => !item.completed);
    const completed = checklist.filter(item => item.completed);
    const updated = [...uncompleted, ...completed];
    setChecklist(updated);
    triggerAutoSave(updated);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(checklist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setChecklist(items);
    triggerAutoSave(items);
  };

  const startEditing = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setTempItemText(item.text);
  };

  const saveEditing = () => {
    if (editingItemId && tempItemText.trim()) {
      const updated = checklist.map(item => 
        item.id === editingItemId ? { ...item, text: tempItemText.trim() } : item
      );
      setChecklist(updated);
      triggerAutoSave(updated);
    }
    setEditingItemId(null);
  };

  const handleSubmit = (e: React.FormEvent, shouldClose: boolean = true) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);

    const taskData: Task = {
      ...(mode === 'edit' && task ? task : createTask(title.trim(), description.trim(), priority, task?.themeId || '', date || undefined, columnId)),
      title: title.trim(),
      description: description.trim(),
      priority,
      date: date || undefined,
      columnId,
      checklist,
      flag,
      labels,
      dependsOn,
      isPinned,
      timeLogs,
      updatedAt: new Date().toISOString()
    };

    onSave(taskData);

    if (shouldClose) {
      onClose();
    } else {
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    }
    
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-black/60 flex items-center justify-center z-[200] backdrop-blur-sm animate-in fade-in duration-300",
      isFullscreen ? "p-0" : "p-4"
    )}>
      <Card className={cn(
        "w-full shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden flex flex-col transition-all duration-300",
        isFullscreen 
          ? "max-w-none h-screen rounded-none" 
          : "max-w-2xl max-h-[90vh] rounded-[2rem]"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                {mode === 'edit' ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h2>
              {showSaveSuccess && (
                <span className="text-[10px] font-black uppercase text-green-500 animate-in fade-in slide-in-from-top-1 duration-300">
                  Alterações salvas com sucesso!
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botão de Fullscreen apenas para Desktop */}
            <Button
              onClick={() => setIsFullscreen(!isFullscreen)}
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-10 w-10 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
              title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className={cn(
            "grid grid-cols-1 gap-8",
            isFullscreen ? "md:grid-cols-12" : "md:grid-cols-2"
          )}>
            <div className={cn(
              "space-y-6",
              isFullscreen ? "md:col-span-8" : ""
            )}>
              <Input
                label="Título *"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="O que precisa ser feito?"
                autoFocus
                onFocus={(e) => e.target.select()}
                required
                className={isFullscreen ? "text-2xl font-black" : ""}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Columns className="w-4 h-4" />
                    Coluna
                  </label>
                  {mode === 'edit' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {task?.columnEnteredAt && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-foreground/5 text-muted-foreground text-[10px] font-bold" title="Tempo nesta coluna">
                          <History className="w-3 h-3 opacity-50" />
                          <span className="uppercase tracking-tighter">
                            {formatTimeElapsed(task.columnEnteredAt)} na coluna
                          </span>
                        </div>
                      )}
                      {task?.createdAt && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/5 text-primary text-[10px] font-bold" title="Tempo total desde a criação">
                          <Clock className="w-3 h-3 opacity-50" />
                          <span className="uppercase tracking-tighter">
                            Criada há {formatTimeElapsed(task.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <select
                  value={columnId}
                  onChange={(e) => setColumnId(e.target.value)}
                  className="w-full bg-foreground/5 border-2 border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  {columns.map(col => (
                    <option key={col.id} value={col.id}>{col.title}</option>
                  ))}
                  {task?.columnId === 'archived' && (
                    <option value="archived">Arquivados</option>
                  )}
                </select>
              </div>

              <Textarea
                label="Descrição"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione mais detalhes aqui..."
                className="min-h-[120px]"
              />

              <div className="space-y-3">
                <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Prioridade
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'low', label: 'Baixa', color: 'bg-green-500' },
                    { value: 'medium', label: 'Média', color: 'bg-amber-500' },
                    { value: 'high', label: 'Alta', color: 'bg-red-500' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriority(option.value as any)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                        priority === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border opacity-40 hover:opacity-100'
                      )}
                    >
                      <div className={cn("w-3 h-3 rounded-full shadow-sm", option.color)} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Status / Flag
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'none', label: 'Nenhum', icon: X, color: 'text-muted-foreground' },
                    { value: 'blocked', label: 'Bloqueado', icon: Ban, color: 'text-red-500' },
                    { value: 'impediment', label: 'Impedimento', icon: AlertCircle, color: 'text-amber-500' },
                    { value: 'paused', label: 'Pausa', icon: PauseCircle, color: 'text-blue-500' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFlag(option.value as TaskFlag)}
                      className={cn(
                        "p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                        flag === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border opacity-40 hover:opacity-100'
                      )}
                    >
                      <option.icon className={cn("w-4 h-4", option.color)} />
                      <span className="text-[9px] font-black uppercase tracking-tight text-center leading-none">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Pin className="w-4 h-4" />
                  Fixar no Topo
                </label>
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group",
                    isPinned
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      isPinned ? "bg-primary text-white" : "bg-foreground/5 text-muted-foreground group-hover:text-primary"
                    )}>
                      <Pin className={cn("w-4 h-4", isPinned && "fill-current")} />
                    </div>
                    <span className={cn("text-xs font-black uppercase tracking-widest", isPinned ? "text-primary" : "text-muted-foreground")}>
                      {isPinned ? 'Tarefa Fixada no Topo' : 'Manter no Topo da Coluna'}
                    </span>
                  </div>
                  <div className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    isPinned ? "bg-primary" : "bg-foreground/10"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                      isPinned ? "right-1" : "left-1"
                    )} />
                  </div>
                </button>
              </div>

              <Input
                label="Data de Entrega"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <div className="space-y-3">
                <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Depende de (Apenas Tarefas Ativas)
                </label>
                <div className="max-h-[150px] overflow-y-auto border-2 border-border rounded-xl p-3 space-y-2 bg-card/50">
                  {availableTasks.length > 0 ? (
                    availableTasks.map(t => (
                      <label 
                        key={t.id} 
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-foreground/5",
                          dependsOn.includes(t.id) && "bg-primary/5 text-primary"
                        )}
                      >
                        <div 
                          onClick={(e) => {
                            e.preventDefault();
                            toggleDependency(t.id);
                          }}
                          className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            dependsOn.includes(t.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                          )}
                        >
                          {dependsOn.includes(t.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-tight truncate">{t.title}</p>
                          <span className="text-[9px] opacity-60 uppercase font-bold">{columns.find(c => c.id === t.columnId)?.title || 'Status Desconhecido'}</span>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic">
                      Nenhuma tarefa disponível para dependência
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={cn(
              "space-y-6",
              isFullscreen ? "md:col-span-4" : ""
            )}>
              <div className="space-y-3">
                <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Labels Customizáveis
                </label>
                
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        value={newLabelText}
                        onChange={(e) => setNewLabelText(e.target.value)}
                        placeholder="Nome da label..."
                        className="pr-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addLabel();
                          }
                        }}
                      />
                      <div 
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: newLabelColor }}
                      />
                    </div>
                    <Button type="button" onClick={addLabel} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {labelColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelColor(color)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                          newLabelColor === color ? "border-primary scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {labels.map(label => (
                    <div
                      key={label.id}
                      className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm transition-all hover:scale-105"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.text}
                      <button
                        type="button"
                        onClick={() => removeLabel(label.id)}
                        className="hover:text-black/50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {labels.length === 0 && (
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic">
                      Nenhuma label adicionada
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Checklist
                  </label>
                  {checklist.length > 1 && (
                    <Button
                      type="button"
                      onClick={reorganizeChecklist}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 flex items-center gap-1.5"
                      title="Reorganizar: Não concluídos para cima"
                    >
                      <ArrowDownAz className="w-3.5 h-3.5" />
                      Reorganizar
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Adicionar item..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                  />
                  <Button type="button" onClick={addChecklistItem} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="checklist">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 mt-4 max-h-[250px] overflow-y-auto pr-2"
                      >
                        {checklist.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-all group border-2 border-transparent",
                                  snapshot.isDragging && "shadow-xl bg-card border-primary/20 scale-[1.02] z-50"
                                )}
                              >
                                <div {...provided.dragHandleProps} className="text-muted-foreground/30 hover:text-muted-foreground">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleChecklistItem(item.id)}
                                  className="text-primary hover:scale-110 transition-transform"
                                >
                                  {item.completed ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                  ) : (
                                    <Circle className="w-5 h-5" />
                                  )}
                                </button>
                                
                                {editingItemId === item.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={tempItemText}
                                      onChange={(e) => setTempItemText(e.target.value)}
                                      className="flex-1 bg-white/10 border border-primary/30 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:border-primary"
                                      autoFocus
                                      onFocus={(e) => e.target.select()}
                                      onBlur={saveEditing}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          saveEditing();
                                        } else if (e.key === 'Escape') {
                                          setEditingItemId(null);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        saveEditing();
                                      }}
                                      className="text-green-500 hover:scale-110 transition-transform"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span 
                                    onClick={() => startEditing(item)}
                                    className={cn(
                                      "flex-1 text-sm font-medium cursor-pointer hover:text-primary transition-colors",
                                      item.completed && "line-through text-muted-foreground"
                                    )}
                                  >
                                    {item.text}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => removeChecklistItem(item.id)}
                                  className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {checklist.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground/40 border-2 border-dashed border-border rounded-xl">
                            <span className="text-[10px] font-black uppercase tracking-widest">Nenhum item adicionado</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Lançamento de Horas
                  </label>
                  {totalLoggedHours > 0 && (
                    <div className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter">
                      Total: {totalLoggedHours}h
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newLogHours}
                    onChange={(e) => setNewLogHours(e.target.value)}
                    placeholder="Horas (Ex: 1.5)"
                    className="h-10"
                  />
                  <Input
                    type="date"
                    value={newLogDate}
                    onChange={(e) => setNewLogDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newLogDescription}
                    onChange={(e) => setNewLogDescription(e.target.value)}
                    placeholder="Opcional: O que foi feito?"
                    className="flex-1 h-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTimeLog();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTimeLog} size="icon" className="h-10 w-10 shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {timeLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-foreground/5 group hover:bg-foreground/10 transition-all border border-transparent hover:border-primary/10">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-primary">{log.hours}h</span>
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="w-2.5 h-2.5" />
                            {new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        {log.description && (
                          <p className="text-[10px] text-muted-foreground italic font-medium">{log.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTimeLog(log.id)}
                        className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {timeLogs.length === 0 && (
                    <div className="text-center py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic border-2 border-dashed border-border rounded-xl">
                      Nenhum lançamento
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-border mt-auto">
            <div className="flex gap-2 w-full sm:w-auto">
              {mode === 'edit' && onDelete && (
                <Button
                  type="button"
                  onClick={handleDelete}
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 px-3 h-10 font-black uppercase tracking-widest flex items-center gap-2"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {mode === 'edit' && onArchive && (
                <Button
                  type="button"
                  onClick={handleArchive}
                  variant="ghost"
                  className="text-muted-foreground hover:bg-primary/10 hover:text-primary px-3 h-10 font-black uppercase tracking-widest flex items-center gap-2"
                  title={task?.columnId === 'archived' ? "Desarquivar" : "Arquivar"}
                >
                  <Archive className="w-4 h-4" />
                  <span className="text-[10px]">{task?.columnId === 'archived' ? 'Desarquivar' : 'Arquivar'}</span>
                </Button>
              )}
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 sm:flex-none h-11"
              >
                Cancelar
              </Button>
              
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={!title.trim() || isSaving}
                  variant="outline"
                  className={cn(
                    "flex-1 sm:flex-none h-11 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[10px]",
                    showSaveSuccess && "border-green-500 text-green-500 bg-green-500/5"
                  )}
                >
                  {isSaving ? 'Salvando...' : showSaveSuccess ? 'Salvo!' : 'Salvar e Ficar'}
                </Button>
                
                <Button
                  type="submit"
                  disabled={!title.trim() || isSaving}
                  className="flex-1 sm:flex-none h-11 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]"
                >
                  {mode === 'edit' ? 'Salvar e Sair' : 'Criar e Sair'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}