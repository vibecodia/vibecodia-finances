import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Task, BoardTheme } from '../../types/trello/task';

const DEFAULT_THEME: BoardTheme = { id: 'default', name: 'Geral' };

export function useTrello() {
  const [themes, setThemes] = useLocalStorage<BoardTheme[]>('trello_themes', [DEFAULT_THEME]);
  const [currentThemeId, setCurrentThemeId] = useLocalStorage<string>('trello_current_theme_id', DEFAULT_THEME.id);
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [searchTerm, setSearchTerm] = useState('');

  // Migração automática de tasks sem themeId
  useEffect(() => {
    const tasksWithoutTheme = tasks.some(t => !t.themeId);
    if (tasksWithoutTheme) {
      setTasks(prev => prev.map(t => t.themeId ? t : { ...t, themeId: DEFAULT_THEME.id }));
    }
  }, [tasks, setTasks]);

  const currentTheme = useMemo(() => 
    themes.find(t => t.id === currentThemeId) || themes[0] || DEFAULT_THEME
  , [themes, currentThemeId]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => t.themeId === currentThemeId)
      .filter(task => {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesText = task.title.toLowerCase().includes(lowerSearch) ||
          task.description.toLowerCase().includes(lowerSearch);
        
        const matchesLabels = task.labels?.some(label => 
          label.text.toLowerCase().includes(lowerSearch)
        ) || false;

        const matchesFlag = task.flag?.toLowerCase().includes(lowerSearch) || false;

        return matchesText || matchesLabels || matchesFlag;
      });
  }, [tasks, currentThemeId, searchTerm]);

  const addTheme = useCallback((name: string, color?: string) => {
    const newTheme: BoardTheme = {
      id: Date.now().toString(36),
      name,
      color
    };
    setThemes(prev => [...prev, newTheme]);
    return newTheme;
  }, [setThemes]);

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [...prev, { 
      ...task, 
      themeId: currentThemeId, 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    }]);
  }, [setTasks, currentThemeId]);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...updatedTask, updatedAt: new Date().toISOString() } : t));
  }, [setTasks]);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, [setTasks]);

  const moveTask = useCallback((taskId: string, toColumnId: Task['columnId']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, columnId: toColumnId, updatedAt: new Date().toISOString() } : t));
  }, [setTasks]);

  const reorderTasks = useCallback((reorderedTasks: Task[]) => {
    // Reordenar apenas tasks do tema atual mantendo as outras
    setTasks(prev => {
      const otherThemeTasks = prev.filter(t => t.themeId !== currentThemeId);
      return [...otherThemeTasks, ...reorderedTasks];
    });
  }, [setTasks, currentThemeId]);

  const importTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, [setTasks]);

  const importFullData = useCallback((newTasks: Task[], newThemes?: BoardTheme[], newCurrentThemeId?: string) => {
    if (newThemes && newThemes.length > 0) {
      setThemes(newThemes);
    }
    
    // Garantir que todas as tasks tenham themeId, mesmo que legado
    const migratedTasks = newTasks.map(t => ({
      ...t,
      themeId: t.themeId || (newThemes?.[0]?.id || DEFAULT_THEME.id)
    }));
    
    setTasks(migratedTasks);
    
    if (newCurrentThemeId) {
      setCurrentThemeId(newCurrentThemeId);
    } else if (newThemes && newThemes.length > 0) {
      setCurrentThemeId(newThemes[0].id);
    }
  }, [setTasks, setThemes, setCurrentThemeId]);

  const updateTheme = useCallback((themeId: string, updates: Partial<BoardTheme>) => {
    setThemes(prev => prev.map(t => t.id === themeId ? { ...t, ...updates } : t));
  }, [setThemes]);

  return {
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
  };
}
