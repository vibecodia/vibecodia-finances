import { Plus, Layout, Archive, Calendar as CalendarIcon, Kanban, Download, Upload, Filter, X as XIcon, ChevronDown, Tag, FolderKanban, Check, Pencil } from 'lucide-react';
import { useState, useMemo, useCallback, useRef } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

import { useTrello } from '../../hooks/trello/useTrello';
import { useLocalStorage } from '../../hooks/trello/useLocalStorage';
import { Task, Column as ColumnType, TaskFlag } from '../../types/trello/task';
import { exportTrelloData, validateTrelloImport, TrelloExportData } from '../../utils/trello/trelloIO';
import { formatBrazilDate, getCurrentBrazilDate } from '../../utils/helpers';

import { Column } from './Column';
import { Timeline } from './Timeline';
import { SearchBar } from './SearchBar';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { ThemeSelector } from './ThemeSelector';
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
    themes,
    currentTheme,
    setCurrentThemeId,
    addTheme,
    updateTheme,
    filteredTasks, 
    searchTerm, 
    setSearchTerm, 
    addTask, 
    updateTask, 
    deleteTask, 
    moveTask,
    reorderTasks,
    importTasks,
    importFullData
  } = useTrello();

  const [showThemeSelector, setShowThemeSelector] = useState(true);
  const [isNewThemeModalOpen, setIsNewThemeModalOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  
  const [isEditingThemeName, setIsEditingThemeName] = useState(false);
  const [tempThemeName, setTempThemeName] = useState(currentTheme.name);

  // Configurações por tema
  const [columnViewModesByTheme, setColumnViewModesByTheme] = useLocalStorage<Record<string, Record<string, boolean>>>('trello_column_view_modes_by_theme', {});

  const currentThemeViewModes = useMemo(() => {
    return columnViewModesByTheme[currentTheme.id] || {
      todo: false,
      inProgress: false,
      done: true,
      archived: true
    };
  }, [columnViewModesByTheme, currentTheme.id]);

  const toggleColumnMinimal = useCallback((columnId: string) => {
    setColumnViewModesByTheme((prev) => ({
      ...prev,
      [currentTheme.id]: {
        ...currentThemeViewModes,
        [columnId]: !currentThemeViewModes[columnId]
      }
    }));
  }, [setColumnViewModesByTheme, currentTheme.id, currentThemeViewModes]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [focusedTask, setFocusedTask] = useState<Task | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline'>('kanban');
  const [selectedFlagFilter, setSelectedFlagFilter] = useState<TaskFlag | 'all'>('all');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string | 'all'>('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
  }>({
    isOpen: false,
    taskId: null
  });
  const [archiveConfirmation, setArchiveConfirmation] = useState<{
    isOpen: boolean;
    taskId: string | null;
  }>({
    isOpen: false,
    taskId: null
  });

  const [importData, setImportData] = useState<TrelloExportData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allLabels = useMemo(() => {
    const labelsMap = new Map<string, { text: string, color: string }>();
    tasks
      .filter(t => t.themeId === currentTheme.id)
      .forEach(task => {
        task.labels?.forEach(label => {
          if (!labelsMap.has(label.text)) {
            labelsMap.set(label.text, { text: label.text, color: label.color });
          }
        });
      });
    return Array.from(labelsMap.values());
  }, [tasks, currentTheme.id]);

  const finalFilteredTasks = useMemo(() => {
    return filteredTasks.filter(task => {
      const flagMatch = selectedFlagFilter === 'all' || task.flag === selectedFlagFilter;
      const labelMatch = selectedLabelFilter === 'all' || 
        task.labels?.some(l => l.text === selectedLabelFilter);
      
      return flagMatch && labelMatch;
    });
  }, [filteredTasks, selectedFlagFilter, selectedLabelFilter]);

  const columns = useMemo(() => {
    const cols = initialColumns.map(column => ({
      ...column,
      tasks: finalFilteredTasks.filter(task => task.columnId === column.id)
    })) as ColumnType[];

    if (showArchived) {
      cols.push({
        id: 'archived',
        title: 'Arquivados',
        tasks: finalFilteredTasks.filter(task => task.columnId === 'archived')
      });
    }

    return cols;
  }, [finalFilteredTasks, showArchived]);

  const handleAddTask = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleFocusTask = useCallback((task: Task) => {
    setFocusedTask(task);
  }, []);

  const handleExport = () => {
    const json = exportTrelloData(tasks, themes, currentTheme.id, {
      columnViewModesByTheme
    });
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
      importFullData(importData.tasks, importData.themes, importData.currentThemeId);
      
      // Restaurar configurações se presentes
      if (importData.settings?.columnViewModesByTheme) {
        setColumnViewModesByTheme(importData.settings.columnViewModesByTheme);
      }
      
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
    const movedTask = newTasks[movedTaskIndex];

    // Validação de dependências ao mover para "done" via drag and drop
    if (destination.droppableId === 'done' && movedTask.columnId !== 'done') {
      const pendingDependencies = movedTask.dependsOn?.filter(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask && depTask.columnId !== 'done';
      });

      if (pendingDependencies && pendingDependencies.length > 0) {
        alert('Esta tarefa não pode ser concluída pois possui dependências pendentes.');
        return;
      }
    }

    newTasks.splice(movedTaskIndex, 1);

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

    if (nextColumn === 'done') {
      const pendingDependencies = task.dependsOn?.filter(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask && depTask.columnId !== 'done';
      });

      if (pendingDependencies && pendingDependencies.length > 0) {
        alert('Esta tarefa não pode ser concluída pois possui dependências pendentes.');
        return;
      }
    }

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

    if (task.columnId === 'archived') {
      // Unarchive directly back to 'todo'
      moveTask(taskId, 'todo');
    } else {
      // Ask for confirmation before archiving
      setArchiveConfirmation({ isOpen: true, taskId });
    }
  }, [tasks, moveTask]);

  const handleToggleChecklistItem = useCallback((taskId: string, itemId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.checklist) return;

    const updatedChecklist = task.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    const updatedTask = { ...task, checklist: updatedChecklist };
    updateTask(updatedTask);
    
    // Se esta tarefa estiver sendo exibida no modo foco, atualize o estado local
    if (focusedTask?.id === taskId) {
      setFocusedTask(updatedTask);
    }
  }, [tasks, updateTask, focusedTask]);

  if (showThemeSelector) {
    return (
      <ThemeSelector 
        themes={themes}
        tasks={tasks}
        onSelectTheme={(id) => {
          setCurrentThemeId(id);
          setShowThemeSelector(false);
        }}
        onAddTheme={(name) => {
          const theme = addTheme(name);
          setCurrentThemeId(theme.id);
          setShowThemeSelector(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowThemeSelector(true)}
            className="p-3 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all group relative"
            title="Mudar de Tema"
          >
            <FolderKanban className="w-8 h-8" />
            <div className="absolute -bottom-1 -right-1 bg-background border-2 border-primary rounded-full p-0.5">
              <ChevronDown className="w-3 h-3 text-primary" />
            </div>
          </button>
          <div>
            <div className="flex items-center gap-2 group/theme-name">
              {isEditingThemeName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempThemeName}
                    onChange={(e) => setTempThemeName(e.target.value)}
                    className="bg-foreground/5 border-2 border-primary/30 rounded-lg px-2 py-1 text-2xl font-black uppercase tracking-tight focus:outline-none focus:border-primary w-full max-w-[300px]"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tempThemeName.trim()) {
                        updateTheme(currentTheme.id, { name: tempThemeName.trim() });
                        setIsEditingThemeName(false);
                      } else if (e.key === 'Escape') {
                        setIsEditingThemeName(false);
                        setTempThemeName(currentTheme.name);
                      }
                    }}
                    onBlur={() => {
                      if (tempThemeName.trim() && tempThemeName !== currentTheme.name) {
                        updateTheme(currentTheme.id, { name: tempThemeName.trim() });
                      }
                      setIsEditingThemeName(false);
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 
                    className="text-3xl font-black text-foreground uppercase tracking-tight cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                      setIsEditingThemeName(true);
                      setTempThemeName(currentTheme.name);
                    }}
                  >
                    {currentTheme.name}
                  </h1>
                  <button
                     onClick={() => {
                       setIsEditingThemeName(true);
                       setTempThemeName(currentTheme.name);
                     }}
                     className="p-1 hover:bg-foreground/10 rounded-full transition-all"
                   >
                     <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                   </button>
                </div>
              )}
              <div className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Tema Ativo</div>
            </div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Gerencie seu fluxo de trabalho</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 rounded-xl border border-border transition-all group/filter relative">
              <Filter className="w-3 h-3 text-muted-foreground group-hover/filter:text-primary transition-colors" />
              <div className="relative flex items-center">
                <select
                  value={selectedFlagFilter}
                  onChange={(e) => setSelectedFlagFilter(e.target.value as any)}
                  className="appearance-none bg-transparent text-[11px] font-black uppercase tracking-widest focus:outline-none cursor-pointer pr-5 z-10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <option value="all" className="bg-background text-foreground">Todas as Flags</option>
                  <option value="none" className="bg-background text-foreground">Sem Flag</option>
                  <option value="blocked" className="bg-background text-red-500">Bloqueado</option>
                  <option value="impediment" className="bg-background text-amber-500">Impedimento</option>
                  <option value="paused" className="bg-background text-blue-500">Pausa</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-0 text-muted-foreground pointer-events-none group-hover/filter:text-primary transition-colors" />
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 hover:bg-foreground/10 rounded-xl border border-border transition-all group/label relative">
              <Tag className="w-3 h-3 text-muted-foreground group-hover/label:text-primary transition-colors" />
              <div className="relative flex items-center">
                <select
                  value={selectedLabelFilter}
                  onChange={(e) => setSelectedLabelFilter(e.target.value)}
                  className="appearance-none bg-transparent text-[11px] font-black uppercase tracking-widest focus:outline-none cursor-pointer pr-5 z-10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <option value="all" className="bg-background text-foreground">Todas as Labels</option>
                  {allLabels.map(label => (
                    <option key={label.text} value={label.text} className="bg-background text-foreground">
                      {label.text}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-0 text-muted-foreground pointer-events-none group-hover/label:text-primary transition-colors" />
              </div>
            </div>

            {(selectedFlagFilter !== 'all' || selectedLabelFilter !== 'all') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedFlagFilter('all');
                  setSelectedLabelFilter('all');
                }}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                title="Limpar Filtros"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
          
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
              onClick={handleExport}
              className="h-10 w-10 text-muted-foreground hover:text-primary"
              title="Gerar Versão e Exportar"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleImportClick}
              className="h-10 w-10 text-muted-foreground hover:text-primary"
              title="Importar Versão"
            >
              <Upload className="w-4 h-4" />
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: filteredTasks.length, color: 'bg-foreground/5' },
          { label: 'A Fazer', value: filteredTasks.filter(t => t.columnId === 'todo').length, color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Em Andamento', value: filteredTasks.filter(t => t.columnId === 'inProgress').length, color: 'bg-amber-500/10 text-amber-500' },
          { label: 'Concluídas', value: filteredTasks.filter(t => t.columnId === 'done').length, color: 'bg-green-500/10 text-green-500' },
          { label: 'Arquivadas', value: filteredTasks.filter(t => t.columnId === 'archived').length, color: 'bg-gray-500/10 text-gray-500' },
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
              allTasks={tasks}
              isMinimal={!!currentThemeViewModes[column.id]}
              onToggleMinimal={() => toggleColumnMinimal(column.id)}
                  onCardClick={handleEditTask}
                  onMoveForward={handleMoveForward}
                  onMoveBackward={handleMoveBackward}
                  onDeleteTask={(id) => setDeleteConfirmation({ isOpen: true, taskId: id })}
                  onArchiveTask={handleArchiveTask}
                  onFocusTask={handleFocusTask}
                  onToggleChecklistItem={handleToggleChecklistItem}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      ) : (
        <div className="flex-1 min-h-[600px]">
          <Timeline 
            tasks={finalFilteredTasks} 
            onTaskClick={handleFocusTask} 
            onTaskFocus={handleFocusTask}
          />
        </div>
      )}

      {/* Focus Modal */}
      {focusedTask && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setFocusedTask(null)}
        >
          <div 
            className="w-full max-w-3xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <TaskCard 
              task={focusedTask} 
              isFocusMode 
              onCloseFocus={() => setFocusedTask(null)}
              onToggleChecklistItem={handleToggleChecklistItem}
            />
          </div>
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
        allTasks={tasks}
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
        isOpen={archiveConfirmation.isOpen}
        onClose={() => setArchiveConfirmation({ isOpen: false, taskId: null })}
        onConfirm={() => {
          if (archiveConfirmation.taskId) {
            moveTask(archiveConfirmation.taskId, 'archived');
            setArchiveConfirmation({ isOpen: false, taskId: null });
          }
        }}
        title="Arquivar Tarefa"
        message="Deseja arquivar esta tarefa? Ela poderá ser visualizada na seção de arquivados."
        confirmText="Arquivar Tarefa"
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
                {importData.metadata.themeCount && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase opacity-50">Total de Temas</span>
                    <span className="text-xs font-bold">{importData.metadata.themeCount}</span>
                  </div>
                )}
              </div>
              <p className="text-destructive font-bold text-xs uppercase tracking-tight">
                Atenção: Isso substituirá todas as tarefas e temas atuais do seu quadro.
              </p>
            </div>
          ) : ""
        }
        confirmText="Confirmar Importação"
      />
    </div>
  );
}
