import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Maximize2, Minimize2, Pencil, Trash2 } from "lucide-react";
import { Task } from "../../types/trello/task";

import { TaskCard } from "./TaskCard";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  isMinimal: boolean;
  searchTerm?: string;
  onToggleMinimal: () => void;
  onCardClick: (task: Task) => void;
  onMoveForward: (taskId: string) => void;
  onMoveBackward: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onArchiveTask: (taskId: string) => void;
  onFocusTask: (task: Task) => void;
  onToggleChecklistItem: (taskId: string, itemId: string) => void;
  onTogglePinTask: (taskId: string) => void;
  onUpdateTitle: (title: string) => void;
  onDeleteColumn: () => void;
  allTasks: Task[];
}

export const Column = React.memo(
  ({
    id,
    title,
    tasks,
    isMinimal,
    searchTerm = "",
    onToggleMinimal,
    onCardClick,
    onMoveForward,
    onMoveBackward,
    onDeleteTask,
    onArchiveTask,
    onFocusTask,
    onToggleChecklistItem,
    onTogglePinTask,
    onUpdateTitle,
    onDeleteColumn,
    allTasks,
  }: ColumnProps) => {
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [tempTitle, setTempTitle] = React.useState(title);

    const getColumnColor = () => {
      if (id.includes("todo")) return "border-blue-500/20 bg-blue-500/5";
      if (id.includes("inProgress"))
        return "border-amber-500/20 bg-amber-500/5";
      if (id.includes("done")) return "border-green-500/20 bg-green-500/5";
      if (id.includes("archived")) return "border-gray-500/20 bg-gray-500/5";
      return "border-primary/20 bg-primary/5";
    };

    const getAccentColor = () => {
      if (id.includes("todo")) return "bg-blue-500";
      if (id.includes("inProgress")) return "bg-amber-500";
      if (id.includes("done")) return "bg-green-500";
      if (id.includes("archived")) return "bg-gray-500";
      return "bg-primary";
    };

    const handleTitleSubmit = () => {
      if (tempTitle.trim() && tempTitle !== title) {
        onUpdateTitle(tempTitle.trim());
      }
      setIsEditingTitle(false);
    };

    const handleTitleClick = () => {
      setTempTitle(title);
      setIsEditingTitle(true);
    };

    return (
      <div className="flex flex-col min-w-[320px] max-w-[320px] h-full">
        <div className="mb-6 flex flex-col px-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="bg-foreground/5 border-2 border-primary/30 rounded-lg px-2 py-1 text-lg font-black uppercase tracking-tight focus:outline-none focus:border-primary w-full"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleSubmit();
                      if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setTempTitle(title);
                      }
                    }}
                    onBlur={handleTitleSubmit}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h2
                    className="text-xl font-black text-foreground uppercase tracking-tight truncate cursor-pointer hover:text-primary transition-colors"
                    onClick={handleTitleClick}
                    translate="no"
                  >
                    <span>{title}</span>
                  </h2>
                  <button
                    onClick={handleTitleClick}
                    className="p-1 hover:bg-foreground/10 rounded-full transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button
                onClick={onToggleMinimal}
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
                title={isMinimal ? "Expandir todos" : "Minimizar todos"}
              >
                {isMinimal ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </Button>
              {id !== "archived" && (
                <Button
                  onClick={onDeleteColumn}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Excluir Coluna"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <div className="ml-2 px-2.5 py-1 rounded-full bg-foreground/5 text-muted-foreground text-[10px] font-black">
                {tasks.length}
              </div>
            </div>
          </div>
          <div
            className={cn("w-12 h-1.5 rounded-full", getAccentColor())}
          ></div>
        </div>

        <Droppable droppableId={id}>
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={cn(
                "flex-1 rounded-[2.5rem] border-2 p-6 transition-all duration-300 min-h-[500px] max-h-[70vh] overflow-y-auto custom-scrollbar bg-card/40 backdrop-blur-md flex flex-col gap-5",
                getColumnColor(),
                snapshot.isDraggingOver
                  ? "border-dashed border-primary shadow-xl bg-card"
                  : "border-transparent",
              )}
            >
              {tasks.length > 0 ? (
                tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    allTasks={allTasks}
                    index={index}
                    isMinimalOverride={isMinimal}
                    searchTerm={searchTerm}
                    onCardClick={onCardClick}
                    onMoveForward={onMoveForward}
                    onMoveBackward={onMoveBackward}
                    onDelete={onDeleteTask}
                    onArchive={onArchiveTask}
                    onFocus={onFocusTask}
                    onToggleChecklistItem={onToggleChecklistItem}
                    onTogglePin={onTogglePinTask}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/20 border-2 border-dashed border-border rounded-3xl">
                  <span className="text-xs font-black uppercase tracking-widest">
                    Vazio
                  </span>
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  },
);
