import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Task } from '../../types/trello/task';

export function useTrello() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesText = task.title.toLowerCase().includes(lowerSearch) ||
        task.description.toLowerCase().includes(lowerSearch);
      
      const matchesLabels = task.labels?.some(label => 
        label.text.toLowerCase().includes(lowerSearch)
      ) || false;

      const matchesFlag = task.flag?.toLowerCase().includes(lowerSearch) || false;

      return matchesText || matchesLabels || matchesFlag;
    });
  }, [tasks, searchTerm]);

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [...prev, { ...task, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
  }, [setTasks]);

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
    setTasks(reorderedTasks);
  }, [setTasks]);

  const importTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, [setTasks]);

  return {
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
  };
}
