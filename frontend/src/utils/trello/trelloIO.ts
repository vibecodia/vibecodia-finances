import { Task, BoardTheme } from "../../types/trello/task";

export interface TrelloExportData {
  version: string;
  timestamp: string;
  tasks: Task[];
  themes?: BoardTheme[];
  currentThemeId?: string;
  settings?: Record<string, unknown>;
  metadata: {
    device?: string;
    taskCount: number;
    themeCount?: number;
  };
}

export function exportTrelloData(
  tasks: Task[],
  themes?: BoardTheme[],
  currentThemeId?: string,
  settings?: Record<string, unknown>,
): string {
  const version = `v${Date.now()}`;
  const exportData: TrelloExportData = {
    version,
    timestamp: new Date().toISOString(),
    tasks,
    themes,
    currentThemeId,
    settings,
    metadata: {
      taskCount: tasks.length,
      themeCount: themes?.length,
      device: navigator.userAgent.substring(0, 50),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

export function validateTrelloImport(
  jsonString: string,
): TrelloExportData | null {
  try {
    const data = JSON.parse(jsonString);

    // Validação básica de estrutura
    if (!data.version || !Array.isArray(data.tasks)) {
      return null;
    }

    return data as TrelloExportData;
  } catch {
    return null;
  }
}
