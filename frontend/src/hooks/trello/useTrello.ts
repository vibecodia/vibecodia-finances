import { useState, useCallback, useMemo, useEffect } from "react";

import {
  Task,
  BoardTheme,
  Column,
  HistoryEntry,
} from "../../types/trello/task";
import { generateId } from "../../utils/trello/taskUtils";

import { useLocalStorage } from "./useLocalStorage";

const DEFAULT_THEME: BoardTheme = { id: "default", name: "Geral" };

const INITIAL_COLUMNS: Omit<Column, "tasks">[] = [
  { id: "todo", title: "A Fazer", themeId: DEFAULT_THEME.id },
  { id: "inProgress", title: "Em Andamento", themeId: DEFAULT_THEME.id },
  { id: "done", title: "Concluído", themeId: DEFAULT_THEME.id },
];

function recordHistory(task: Task, entry: HistoryEntry): Task {
  return {
    ...task,
    history: [...(task.history || []), entry],
  };
}

function createHistoryEntry(
  action: HistoryEntry["action"],
  details: string,
  previousValue?: unknown,
  newValue?: unknown,
): HistoryEntry {
  return {
    id: generateId(),
    action,
    details,
    date: new Date().toISOString(),
    previousValue,
    newValue,
  };
}

function compareAndRecordUpdates(
  oldTask: Task,
  newTask: Task,
): { task: Task; entries: HistoryEntry[] } {
  const entries: HistoryEntry[] = [];
  const updated = {
    ...newTask,
    history: oldTask.history ? [...oldTask.history] : [],
  };

  if (oldTask.title !== newTask.title) {
    entries.push(
      createHistoryEntry(
        "update",
        `Título alterado de "${oldTask.title}" para "${newTask.title}"`,
        oldTask.title,
        newTask.title,
      ),
    );
  }
  if (oldTask.priority !== newTask.priority) {
    const priorityMap: Record<string, string> = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
    };
    entries.push(
      createHistoryEntry(
        "update",
        `Prioridade alterada de "${priorityMap[oldTask.priority]}" para "${priorityMap[newTask.priority]}"`,
        oldTask.priority,
        newTask.priority,
      ),
    );
  }
  if (oldTask.description !== newTask.description) {
    entries.push(
      createHistoryEntry(
        "update",
        "Descrição atualizada",
        oldTask.description,
        newTask.description,
      ),
    );
  }
  if (oldTask.flag !== newTask.flag) {
    const flagMap: Record<string, string> = {
      none: "Nenhuma",
      blocked: "Bloqueado",
      impediment: "Impedimento",
      paused: "Pausa",
    };
    entries.push(
      createHistoryEntry(
        "update",
        `Status alterado de "${flagMap[oldTask.flag || "none"]}" para "${flagMap[newTask.flag || "none"]}"`,
        oldTask.flag,
        newTask.flag,
      ),
    );
  }
  if (oldTask.date !== newTask.date) {
    entries.push(
      createHistoryEntry(
        "update",
        "Data de entrega alterada",
        oldTask.date,
        newTask.date,
      ),
    );
  }
  if (JSON.stringify(oldTask.labels) !== JSON.stringify(newTask.labels)) {
    entries.push(
      createHistoryEntry(
        "update",
        "Labels atualizadas",
        oldTask.labels,
        newTask.labels,
      ),
    );
  }

  updated.history = [...(updated.history || []), ...entries];
  return { task: updated, entries };
}

export function useTrello() {
  const [themes, setThemes] = useLocalStorage<BoardTheme[]>("trello_themes", [
    DEFAULT_THEME,
  ]);
  const [currentThemeId, setCurrentThemeId] = useLocalStorage<string>(
    "trello_current_theme_id",
    DEFAULT_THEME.id,
  );
  const [tasks, setTasks] = useLocalStorage<Task[]>("tasks", []);
  const [columns, setColumns] = useLocalStorage<Omit<Column, "tasks">[]>(
    "trello_columns",
    INITIAL_COLUMNS,
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Migração automática de tasks e colunas sem themeId
  useEffect(() => {
    let tasksChanged = false;
    let columnsChanged = false;
    let themesChanged = false;

    // 0. Desduplicação de temas
    const uniqueThemes = themes.filter(
      (theme, index, self) =>
        index === self.findIndex((t) => t.id === theme.id),
    );
    if (uniqueThemes.length !== themes.length) {
      themesChanged = true;
    }

    // 1. Migrar colunas sem themeId e desduplicar
    const migratedColumns = columns.map((c) => {
      if (!c.themeId) {
        columnsChanged = true;
        return { ...c, themeId: DEFAULT_THEME.id };
      }
      return c;
    });

    const uniqueColumns = migratedColumns.filter(
      (col, index, self) => index === self.findIndex((c) => c.id === col.id),
    );
    if (uniqueColumns.length !== columns.length) {
      columnsChanged = true;
    }

    // 2. Criar colunas iniciais para temas que não possuem nenhuma
    let nextColumns = [...uniqueColumns];
    uniqueThemes.forEach((theme) => {
      const hasColumns = nextColumns.some((c) => c.themeId === theme.id);
      if (!hasColumns) {
        columnsChanged = true;
        const themeColumns = INITIAL_COLUMNS.map((c) => ({
          ...c,
          id: theme.id === DEFAULT_THEME.id ? c.id : `${c.id}-${theme.id}`,
          themeId: theme.id,
        }));
        nextColumns = [...nextColumns, ...themeColumns];
      }
    });

    // 3. Migrar tarefas: themeId, columnId e desduplicar
    const uniqueTasks = tasks.filter(
      (task, index, self) => index === self.findIndex((t) => t.id === task.id),
    );
    if (uniqueTasks.length !== tasks.length) {
      tasksChanged = true;
    }

    const migratedTasks = uniqueTasks.map((t) => {
      let updated = false;
      const newThemeId = t.themeId || DEFAULT_THEME.id;
      let newColumnId = t.columnId;
      const now = new Date().toISOString();
      let createdAt = t.createdAt;
      let columnEnteredAt = t.columnEnteredAt;

      if (!t.themeId) {
        updated = true;
      }

      if (!t.createdAt) {
        createdAt = now;
        updated = true;
      }

      if (!t.columnEnteredAt) {
        columnEnteredAt = now;
        updated = true;
      }

      const legacyIds = ["todo", "inProgress", "done"];
      if (legacyIds.includes(t.columnId)) {
        const matchingColumn = nextColumns.find(
          (c) => c.themeId === newThemeId && c.id.startsWith(t.columnId),
        );
        if (matchingColumn && matchingColumn.id !== t.columnId) {
          newColumnId = matchingColumn.id;
          updated = true;
        }
      }

      if (updated) {
        tasksChanged = true;
        return {
          ...t,
          themeId: newThemeId,
          columnId: newColumnId,
          createdAt,
          columnEnteredAt,
        };
      }
      return t;
    });

    // Só atualizar se algo realmente mudou para evitar loops
    if (themesChanged) {
      setThemes(uniqueThemes);
    }

    if (columnsChanged) {
      setColumns(nextColumns);
    }

    if (tasksChanged) {
      setTasks(migratedTasks);
    }
  }, [tasks, columns, themes, setColumns, setTasks, setThemes]);

  const currentTheme = useMemo(
    () =>
      themes.find((t) => t.id === currentThemeId) || themes[0] || DEFAULT_THEME,
    [themes, currentThemeId],
  );

  const themeColumns = useMemo(
    () => columns.filter((c) => c.themeId === currentThemeId),
    [columns, currentThemeId],
  );

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => t.themeId === currentThemeId)
      .filter((task) => {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesText =
          (task.title?.toLowerCase() || "").includes(lowerSearch) ||
          (task.description?.toLowerCase() || "").includes(lowerSearch) ||
          task.checklist?.some((item) =>
            item.text.toLowerCase().includes(lowerSearch),
          );

        const matchesLabels =
          task.labels?.some((label) =>
            label.text.toLowerCase().includes(lowerSearch),
          ) || false;

        const matchesFlag =
          task.flag?.toLowerCase().includes(lowerSearch) || false;

        return matchesText || matchesLabels || matchesFlag;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isPinned && b.isPinned) {
          // Se ambas estão fixadas, a mais recente (pinnedAt) vai para o topo
          const dateA = new Date(a.pinnedAt || 0).getTime();
          const dateB = new Date(b.pinnedAt || 0).getTime();
          return dateB - dateA;
        }
        return 0;
      });
  }, [tasks, currentThemeId, searchTerm]);

  const matchCount = filteredTasks.length;

  const addTheme = useCallback(
    (name: string, subtitle?: string, color?: string) => {
      const newTheme: BoardTheme = {
        id: generateId(),
        name,
        subtitle,
        color,
      };
      setThemes((prev) => [...prev, newTheme]);

      // Criar colunas iniciais para o novo tema
      const themeColumns = INITIAL_COLUMNS.map((c) => ({
        ...c,
        id: `${c.id}-${newTheme.id}`,
        themeId: newTheme.id,
      }));
      setColumns((prev) => [...prev, ...themeColumns]);

      return newTheme;
    },
    [setThemes, setColumns],
  );

  const addTask = useCallback(
    (task: Task) => {
      const now = new Date().toISOString();
      const historyEntry = createHistoryEntry("create", "Tarefa criada");
      const taskWithHistory: Task = {
        ...task,
        themeId: currentThemeId,
        createdAt: now,
        updatedAt: now,
        columnEnteredAt: now,
        history: [historyEntry],
      };
      setTasks((prev) => [...prev, taskWithHistory]);
    },
    [setTasks, currentThemeId],
  );

  const updateTask = useCallback(
    (updatedTask: Task) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === updatedTask.id) {
            const hasColumnChanged = t.columnId !== updatedTask.columnId;
            const now = new Date().toISOString();
            const baseTask = {
              ...updatedTask,
              updatedAt: now,
              columnEnteredAt: hasColumnChanged ? now : t.columnEnteredAt,
            };

            // Record history for important changes
            const { task: taskWithHistory } = compareAndRecordUpdates(
              t,
              baseTask,
            );
            return taskWithHistory;
          }
          return t;
        }),
      );
    },
    [setTasks],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    },
    [setTasks],
  );

  const togglePinTask = useCallback(
    (taskId: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? recordHistory(
                {
                  ...t,
                  isPinned: !t.isPinned,
                  pinnedAt: !t.isPinned ? now : undefined,
                  updatedAt: now,
                },
                createHistoryEntry(
                  t.isPinned ? "unpin" : "pin",
                  t.isPinned ? "Tarefa desafixada" : "Tarefa fixada no topo",
                ),
              )
            : t,
        ),
      );
    },
    [setTasks],
  );

  const moveTask = useCallback(
    (taskId: string, toColumnId: string) => {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const fromColumn = themeColumns.find((c) => c.id === t.columnId);
            const toColumn = themeColumns.find((c) => c.id === toColumnId);
            const details =
              fromColumn && toColumn
                ? `Movido de "${fromColumn.title}" para "${toColumn.title}"`
                : `Movido para nova coluna`;
            return recordHistory(
              {
                ...t,
                columnId: toColumnId,
                updatedAt: now,
                columnEnteredAt: now,
              },
              createHistoryEntry("move", details, t.columnId, toColumnId),
            );
          }
          return t;
        }),
      );
    },
    [setTasks, themeColumns],
  );

  const reorderTasks = useCallback(
    (reorderedTasks: Task[]) => {
      // Reordenar apenas tasks do tema atual mantendo as outras
      setTasks((prev) => {
        const otherThemeTasks = prev.filter(
          (t) => t.themeId !== currentThemeId,
        );
        return [...otherThemeTasks, ...reorderedTasks];
      });
    },
    [setTasks, currentThemeId],
  );

  const importTasks = useCallback(
    (newTasks: Task[]) => {
      setTasks(newTasks);
    },
    [setTasks],
  );

  const importFullData = useCallback(
    (
      newTasks: Task[],
      newThemes?: BoardTheme[],
      newCurrentThemeId?: string,
    ) => {
      if (newThemes && newThemes.length > 0) {
        setThemes(newThemes);

        // Criar colunas iniciais para os temas importados se elas não existirem
        setColumns((prev) => {
          let updatedColumns = [...prev];
          newThemes.forEach((theme) => {
            const hasColumns = updatedColumns.some(
              (c) => c.themeId === theme.id,
            );
            if (!hasColumns) {
              const themeColumns = INITIAL_COLUMNS.map((c) => ({
                ...c,
                id:
                  theme.id === DEFAULT_THEME.id ? c.id : `${c.id}-${theme.id}`,
                themeId: theme.id,
              }));
              updatedColumns = [...updatedColumns, ...themeColumns];
            }
          });
          return updatedColumns;
        });
      }

      // O useEffect de migração cuidará de mapear os columnIds legados das tarefas importadas
      setTasks(newTasks);

      if (newCurrentThemeId) {
        setCurrentThemeId(newCurrentThemeId);
      } else if (newThemes && newThemes.length > 0) {
        setCurrentThemeId(newThemes[0].id);
      }
    },
    [setTasks, setThemes, setColumns, setCurrentThemeId],
  );

  const updateTheme = useCallback(
    (themeId: string, updates: Partial<BoardTheme>) => {
      setThemes((prev) =>
        prev.map((t) => (t.id === themeId ? { ...t, ...updates } : t)),
      );
    },
    [setThemes],
  );

  const deleteTheme = useCallback(
    (themeId: string) => {
      if (themes.length <= 1) {
        alert("Não é possível excluir o único tema restante.");
        return;
      }

      // Remover o tema
      setThemes((prev) => prev.filter((t) => t.id !== themeId));

      // Remover todas as colunas do tema
      setColumns((prev) => prev.filter((c) => c.themeId !== themeId));

      // Remover todas as tarefas do tema
      setTasks((prev) => prev.filter((t) => t.themeId !== themeId));

      // Se o tema excluído era o atual, mudar para o primeiro disponível
      if (currentThemeId === themeId) {
        const remainingThemes = themes.filter((t) => t.id !== themeId);
        if (remainingThemes.length > 0) {
          setCurrentThemeId(remainingThemes[0].id);
        }
      }
    },
    [
      themes,
      currentThemeId,
      setCurrentThemeId,
      setThemes,
      setColumns,
      setTasks,
    ],
  );

  const addColumn = useCallback(
    (title: string) => {
      const newColumn: Omit<Column, "tasks"> = {
        id: `col-${generateId()}`,
        title,
        themeId: currentThemeId,
      };
      setColumns((prev) => [...prev, newColumn]);
      return newColumn;
    },
    [setColumns, currentThemeId],
  );

  const updateColumn = useCallback(
    (columnId: string, updates: Partial<Omit<Column, "tasks">>) => {
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
      );
    },
    [setColumns],
  );

  const deleteColumn = useCallback(
    (columnId: string) => {
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
    },
    [setColumns],
  );

  return {
    tasks,
    themes,
    currentTheme,
    setCurrentThemeId,
    addTheme,
    updateTheme,
    deleteTheme,
    columns: themeColumns,
    addColumn,
    updateColumn,
    deleteColumn,
    filteredTasks,
    matchCount,
    searchTerm,
    setSearchTerm,
    addTask,
    updateTask,
    deleteTask,
    togglePinTask,
    moveTask,
    reorderTasks,
    importTasks,
    importFullData,
  };
}
