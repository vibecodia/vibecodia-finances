import { X, Target, Flag, Trash2, Plus, CheckCircle2, Circle, GripVertical, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { Task, ChecklistItem } from '../../types/trello/task';
import { createTask } from '../../utils/trello/taskUtils';
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
  onDelete?: (taskId: string) => void;
  task?: Task;
  mode: 'create' | 'edit';
}

export function TaskModal({ isOpen, onClose, onSave, onDelete, task, mode }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [date, setDate] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempItemText, setTempItemText] = useState('');

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id);
      onClose();
    }
  };

  useEffect(() => {
    if (task && mode === 'edit') {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setDate(task.date ? (typeof task.date === 'string' ? task.date : getBrazilDateString(task.date)) : '');
      setChecklist(task.checklist || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDate(getBrazilDateString());
      setChecklist([]);
    }
  }, [task, mode, isOpen]);

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newChecklistItem.trim(),
      completed: false
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistItem('');
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(checklist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setChecklist(items);
  };

  const startEditing = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setTempItemText(item.text);
  };

  const saveEditing = () => {
    if (editingItemId && tempItemText.trim()) {
      setChecklist(checklist.map(item => 
        item.id === editingItemId ? { ...item, text: tempItemText.trim() } : item
      ));
    }
    setEditingItemId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (mode === 'edit' && task) {
      onSave({
        ...task,
        title: title.trim(),
        description: description.trim(),
        priority,
        date: date || undefined,
        checklist,
        updatedAt: new Date().toISOString()
      });
    } else {
      const newTask = createTask(title.trim(), description.trim(), priority, date || undefined);
      onSave({
        ...newTask,
        checklist,
        updatedAt: new Date().toISOString()
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
              {mode === 'edit' ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Input
                label="Título *"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="O que precisa ser feito?"
                autoFocus
                onFocus={(e) => e.target.select()}
                required
              />

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

              <Input
                label="Data de Entrega"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Checklist
                </label>
                
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
                        className="space-y-2 mt-4 max-h-[350px] overflow-y-auto pr-2"
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
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-border mt-auto">
            {mode === 'edit' && onDelete ? (
              <Button
                type="button"
                onClick={handleDelete}
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 w-full sm:w-auto font-black uppercase tracking-widest flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Tarefa
              </Button>
            ) : <div className="hidden sm:block" />}
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!title.trim()}
                className="flex-1 sm:flex-none"
              >
                {mode === 'edit' ? 'Salvar Alterações' : 'Criar Tarefa'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}