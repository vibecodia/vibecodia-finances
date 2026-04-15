export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type TaskFlag = 'blocked' | 'impediment' | 'paused' | 'none';

export interface TaskLabel {
  id: string;
  text: string;
  color: string;
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
  flag?: TaskFlag;
  labels?: TaskLabel[];
  dependsOn?: string[];
}

export interface Column {
  id: 'todo' | 'inProgress' | 'done' | 'archived';
  title: string;
  tasks: Task[];
}