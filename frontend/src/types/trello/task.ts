export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  date?: Date | string;
  columnId: 'todo' | 'inProgress' | 'done' | 'archived';
  createdAt: string;
  checklist?: ChecklistItem[];
  updatedAt?: string;
}

export interface Column {
  id: 'todo' | 'inProgress' | 'done' | 'archived';
  title: string;
  tasks: Task[];
}