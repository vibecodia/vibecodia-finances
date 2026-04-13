import { Plus, Layout, Archive, Calendar as CalendarIcon, Kanban, Download, Upload, History } from 'lucide-react';
import { useState, useMemo, useCallback, useRef } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

import { useTrello } from '../../hooks/trello/useTrello';
import { Task, Column as ColumnType } from '../../types/trello/task';
import { exportTrelloData, validateTrelloImport, TrelloExportData } from '../../utils/trello/trelloIO';
import { formatBrazilDate, getCurrentBrazilDate } from '../../utils/helpers';

import { Column } from './Column';
import { Timeline } from './Timeline';
import { SearchBar } from './SearchBar';
import { TaskModal } from './TaskModal';
import ConfirmationModal from '../ConfirmationModal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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
    reorderTasks,
    importTasks
  } = useTrello();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline'>('kanban');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
  }>({
    isOpen: false,
    taskId: null
  });

  const [importData, setImportData] = useState<TrelloExportData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = () => {
    const json = exportTrelloData(tasks);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = formatBrazilDate(getCurrentBrazilDate(), 'yyyy-MM-dd');
    link.download = `trello-board-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const validated = validateTrelloImport(result);
      if (validated) {
        setImportData(validated);
      } else {
        alert('Arquivo inválido ou corrompido.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Limpa para permitir re-importar o mesmo arquivo
  };

  const confirmImport = () => {
    if (importData) {
      importTasks(importData.tasks);
      setImportData(null);
    }
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

    const newTasks = Array.from(tasks);
    
    // 1. Encontrar e remover a tarefa movida
    const movedTaskIndex = newTasks.findIndex(t => t.id === draggableId);
    if (movedTaskIndex === -1) return;
    const [movedTask] = newTasks.splice(movedTaskIndex, 1);

    // 2. Atualizar a coluna
    movedTask.columnId = destination.droppableId as Task['columnId'];
    movedTask.updatedAt = new Date().toISOString();

    // 3. Encontrar a posição correta de inserção
    // Pegamos as tarefas que seriam visíveis na coluna de destino (excluindo a própria se já estava lá)
    const visibleDestTasks = filteredTasks.filter(
      t => t.columnId === destination.droppableId && t.id !== draggableId
    );

    if (destination.index >= visibleDestTasks.length) {
      // Se for para o final da lista visível, inserimos após a última tarefa daquela coluna no array principal
      let lastActualIndex = -1;
      for (let i = newTasks.length - 1; i >= 0; i--) {
        if (newTasks[i].columnId === destination.droppableId) {
          lastActualIndex = i;
          break;
        }
      }
      
      if (lastActualIndex === -1) {
        newTasks.push(movedTask);
      } else {
        newTasks.splice(lastActualIndex + 1, 0, movedTask);
      }
    } else {
      // Inserir antes da tarefa que está atualmente na posição de destino na lista visível
      const targetTask = visibleDestTasks[destination.index];
      const actualTargetIndex = newTasks.findIndex(t => t.id === targetTask.id);
      newTasks.splice(actualTargetIndex, 0, movedTask);
    }

    reorderTasks(newTasks);
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

  const handleArchiveTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newColumn = task.columnId === 'archived' ? 'todo' : 'archived';
    moveTask(taskId, newColumn);
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
          
          <div className="flex items-center bg-foreground/5 p-1 rounded-xl border border-border">
            <Button
              variant={viewMode === 'kanban' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className={cn(
                "flex items-center gap-2 h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest",
                viewMode === 'kanban' ? "shadow-lg" : "text-muted-foreground"
              )}
            >
              <Kanban className="w-3.5 h-3.5" />
              Quadro
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className={cn(
                "flex items-center gap-2 h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest",
                viewMode === 'timeline' ? "shadow-lg" : "text-muted-foreground"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Timeline
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "flex items-center gap-2 h-10",
              showArchived && "bg-primary/10 border-primary text-primary"
            )}
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">{showArchived ? 'Ocultar Arquivados' : 'Ver Arquivados'}</span>
          </Button>

          <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleImportClick}
              className="h-10 w-10 text-muted-foreground hover:text-primary"
              title="Importar Versão"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExport}
              className="h-10 w-10 text-muted-foreground hover:text-primary"
              title="Gerar Versão e Exportar"
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

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
      {viewMode === 'kanban' ? (
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
                  onDeleteTask={(id) => setDeleteConfirmation({ isOpen: true, taskId: id })}
                  onArchiveTask={handleArchiveTask}
                  onToggleChecklistItem={handleToggleChecklistItem}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      ) : (
        <div className="flex-1 min-h-[600px]">
          <Timeline 
            tasks={filteredTasks} 
            onTaskClick={handleEditTask} 
          />
        </div>
      )}

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
        onArchive={handleArchiveTask}
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

      <ConfirmationModal
        isOpen={!!importData}
        onClose={() => setImportData(null)}
        onConfirm={confirmImport}
        title="Importar Versão do Quadro"
        message={
          importData ? (
            <div className="space-y-4 py-2">
              <p>Você está prestes a importar uma nova versão do seu quadro de tarefas.</p>
              <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase opacity-50">Versão</span>
                  <span className="text-xs font-bold text-primary">{importData.version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase opacity-50">Data de Geração</span>
                  <span className="text-xs font-bold">{new Date(importData.timestamp).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase opacity-50">Total de Tarefas</span>
                  <span className="text-xs font-bold">{importData.metadata.taskCount}</span>
                </div>
              </div>
              <p className="text-destructive font-bold text-xs uppercase tracking-tight">
                Atenção: Isso substituirá todas as tarefas atuais do seu quadro.
              </p>
            </div>
          ) : ""
        }
        confirmText="Confirmar Importação"
      />
    </div>
  );
}
