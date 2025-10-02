export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  date?: Date | string;
  columnId: 'todo' | 'inProgress' | 'done';
  createdAt: string;
}

export interface Column {
  id: 'todo' | 'inProgress' | 'done';
  title: string;
  tasks: Task[];
}