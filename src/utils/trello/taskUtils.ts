import { Task } from '../../types/trello/task';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function createTask(
  title: string,
  description: string,
  priority: 'low' | 'medium' | 'high',
  date?: string
): Task {
  return {
    id: generateId(),
    title,
    description,
    priority,
    date,
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
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
}