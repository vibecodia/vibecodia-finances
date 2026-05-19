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

export interface BoardTheme {
  id: string;
  name: string;
  color?: string;
  backgroundImage?: string;
}

export interface TimeLog {
  id: string;
  date: string;
  hours: number;
  description?: string;
}

export interface HistoryEntry {
  id: string;
  action: 'create' | 'update' | 'move' | 'archive' | 'unarchive' | 'pin' | 'unpin' | 'checklist_toggle' | 'timelog_add';
  details: string;
  date: string; // ISO String
  previousValue?: any;
  newValue?: any;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  date?: Date | string;
  columnId: string;
  createdAt: string;
  checklist?: ChecklistItem[];
  updatedAt?: string;
  flag?: TaskFlag;
  labels?: TaskLabel[];
  dependsOn?: string[];
  themeId: string;
  timeLogs?: TimeLog[];
  columnEnteredAt?: string;
  isPinned?: boolean;
  pinnedAt?: string;
  history?: HistoryEntry[];
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
  themeId: string;
}
