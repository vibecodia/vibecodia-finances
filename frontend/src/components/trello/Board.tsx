import { Plus, Layout, Archive } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

import { useTrello } from '../../hooks/trello/useTrello';
import { Task, Column as ColumnType } from '../../types/trello/task';

import { Column } from './Column';
import { SearchBar } from './SearchBar';
import { TaskModal } from './TaskModal';
import ConfirmationModal from '../ConfirmationModal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const initialColumns: Omit<ColumnType, 'tasks'>[] = [
  { id: 'todo', title: 'A Fazer' },
  { id: 'inProgress', title: 'Em Andamento' },
  { id: 'done', title: 'Concluído' },
];

export function Board() {
  const { 
    tasks, 
    filteredTasks, 
    searchTerm, 
    setSearchTerm, 
    addTask, 
    updateTask, 
    deleteTask, 
    moveTask,
    reorderTasks
  } = useTrello();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
  }>({
    isOpen: false,
    taskId: null
  });

  const columns = useMemo(() => {
    const cols = initialColumns.map(column => ({
      ...column,
      tasks: filteredTasks.filter(task => task.columnId === column.id)
    })) as ColumnType[];

    if (showArchived) {
      cols.push({
        id: 'archived',
        title: 'Arquivados',
        tasks: filteredTasks.filter(task => task.columnId === 'archived')
      });
    }

    return cols;
  }, [filteredTasks, showArchived]);

  const handleAddTask = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Se mudou de coluna
    if (destination.droppableId !== source.droppableId) {
      moveTask(draggableId, destination.droppableId as Task['columnId']);
    } else {
      // Reordenação dentro da mesma coluna
      const columnTasks = tasks.filter(t => t.columnId === source.droppableId);
      const otherTasks = tasks.filter(t => t.columnId !== source.droppableId);
      
      const newColumnTasks = Array.from(columnTasks);
      const [removed] = newColumnTasks.splice(source.index, 1);
      newColumnTasks.splice(destination.index, 0, removed);

      reorderTasks([...otherTasks, ...newColumnTasks]);
    }
  };

  const handleMoveForward = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    let nextColumn: Task['columnId'] = task.columnId;
    if (task.columnId === 'todo') nextColumn = 'inProgress';
    else if (task.columnId === 'inProgress') nextColumn = 'done';
    
    if (nextColumn !== task.columnId) {
      moveTask(taskId, nextColumn);
    }
  }, [tasks, moveTask]);

  const handleMoveBackward = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    let prevColumn: Task['columnId'] = task.columnId;
    if (task.columnId === 'done') prevColumn = 'inProgress';
    else if (task.columnId === 'inProgress') prevColumn = 'todo';
    
    if (prevColumn !== task.columnId) {
      moveTask(taskId, prevColumn);
    }
  }, [tasks, moveTask]);

  const handleToggleChecklistItem = useCallback((taskId: string, itemId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.checklist) return;

    const updatedChecklist = task.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    updateTask({ ...task, checklist: updatedChecklist });
  }, [tasks, updateTask]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Layout className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Quadro de Tarefas</h1>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Gerencie seu fluxo de trabalho</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "flex items-center gap-2",
              showArchived && "bg-primary/10 border-primary text-primary"
            )}
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">{showArchived ? 'Ocultar Arquivados' : 'Ver Arquivados'}</span>
          </Button>

          <Button 
            onClick={handleAddTask}
            className="flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: tasks.length, color: 'bg-foreground/5' },
          { label: 'A Fazer', value: tasks.filter(t => t.columnId === 'todo').length, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Em Andamento', value: tasks.filter(t => t.columnId === 'inProgress').length, color: 'bg-amber-500/10 text-amber-500' },
          { label: 'Concluídas', value: tasks.filter(t => t.columnId === 'done').length, color: 'bg-green-500/10 text-green-500' },
        ].map((stat) => (
          <div key={stat.label} className={cn("p-4 rounded-2xl border border-border flex flex-col gap-1", stat.color)}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{stat.label}</span>
            <span className="text-2xl font-black">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Board Content */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-8 h-full min-h-[600px]">
            {columns.map((column) => (
              <Column
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={column.tasks}
                onCardClick={handleEditTask}
                onMoveForward={handleMoveForward}
                onMoveBackward={handleMoveBackward}
                onDeleteTask={(taskId) => setDeleteConfirmation({ isOpen: true, taskId })}
                onToggleChecklistItem={handleToggleChecklistItem}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Modals */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(task) => {
          if (editingTask) updateTask(task);
          else addTask(task);
          setIsModalOpen(false);
        }}
        onDelete={(taskId) => {
          setDeleteConfirmation({ isOpen: true, taskId });
          setIsModalOpen(false);
        }}
        task={editingTask}
        mode={editingTask ? 'edit' : 'create'}
      />

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, taskId: null })}
        onConfirm={() => {
          if (deleteConfirmation.taskId) {
            deleteTask(deleteConfirmation.taskId);
            setDeleteConfirmation({ isOpen: false, taskId: null });
          }
        }}
        title="Excluir Tarefa"
        message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
        confirmText="Confirmar Exclusão"
      />
    </div>
  );
}
