import { CalendarDays, ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDue } from "@/lib/dates";
import { deleteTask, isOverdue, setTaskStatus, type Priority, type Task, type TaskStatus } from "@/lib/tasks";
import { Sparkle } from "lucide-react";

const PRIORITY_STYLE: Record<Priority, string> = {
  high: "bg-destructive-soft text-destructive",
  medium: "bg-warning-soft text-warning",
  low: "bg-muted text-muted-foreground",
};

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", PRIORITY_STYLE[priority])}>
      {priority}
    </span>
  );
}

export function DueLabel({ task }: { task: Task }) {
  if (!task.dueDate) return null;
  const overdue = isOverdue(task);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        overdue ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      <CalendarDays className="size-3" />
      {formatDue(task.dueDate)}
    </span>
  );
}

const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

export function TaskRow({
  task,
  progress,
  subtaskCount = 0,
  expanded,
  onToggleExpand,
  onEdit,
  compact,
}: {
  task: Task;
  progress?: number | undefined;
  subtaskCount?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onEdit?: (task: Task) => void;
  compact?: boolean;
}) {
  const done = task.status === "done";
  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60",
        task.parentId && "pl-9",
      )}
    >
      <Checkbox
        checked={done}
        onCheckedChange={(v) => setTaskStatus(task.id, v ? "done" : "todo")}
        aria-label={done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
        className="mt-0.5 size-[18px] rounded-full"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(task)}
            className={cn(
              "min-w-0 text-left text-sm font-medium leading-snug",
              done && "text-muted-foreground line-through",
              onEdit ? "cursor-pointer hover:text-primary" : "cursor-default",
            )}
          >
            {task.title}
          </button>
          {task.aiGenerated && (
            <Sparkle className="mt-0.5 size-3 shrink-0 text-ai" aria-label="AI-generated" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {!compact && <PriorityPill priority={task.priority} />}
          <DueLabel task={task} />
          {task.status === "in_progress" && <span className="text-xs font-medium text-ai">In progress</span>}
          {subtaskCount > 0 && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              {subtaskCount} subtasks
            </button>
          )}
        </div>
        {subtaskCount > 0 && progress !== undefined && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <Progress value={progress} className="h-1.5" />
            <span className="font-mono text-[11px] text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>
      {onEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-60 group-hover:opacity-100"
              aria-label="Task actions"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            {(["todo", "in_progress", "done"] as const)
              .filter((s) => s !== task.status)
              .map((s) => (
                <DropdownMenuItem key={s} onClick={() => setTaskStatus(task.id, s)}>
                  Mark as {STATUS_LABEL[s].toLowerCase()}
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteTask(task.id)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
