import { Task } from '../../types/trello/task';
import { formatBrazilDate, getBrazilDateString } from '../helpers';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function createTask(
  title: string,
  description: string,
  priority: 'low' | 'medium' | 'high',
  themeId: string,
  date?: string
): Task {
  return {
    id: generateId(),
    title,
    description,
    priority,
    themeId,
    date: date || getBrazilDateString(),
    columnId: 'todo',
    createdAt: new Date().toISOString(),
  };
}

export function getPriorityColor(priority: 'low' | 'medium' | 'high'): string {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
  }
}

export function getPriorityLabel(priority: 'low' | 'medium' | 'high'): string {
  switch (priority) {
    case 'high':
      return 'Alta';
    case 'medium':
      return 'Média';
    case 'low':
      return 'Baixa';
  }
}

export function formatDate(dateString: string): string {
  return formatBrazilDate(dateString);
}