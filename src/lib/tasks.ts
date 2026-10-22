import { createLocalStore, uid } from "./local-store";
import { daysUntil, offsetKey, todayKey, toDateKey } from "./dates";
import { addDays } from "date-fns";

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null; // yyyy-MM-dd
  parentId: string | null;
  aiGenerated: boolean;
  createdAt: string;
  completedAt: string | null;
}

export const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function seedTasks(): Task[] {
  const now = new Date().toISOString();
  const base = (t: Partial<Task> & { title: string }): Task => ({
    id: uid(),
    notes: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    parentId: null,
    aiGenerated: false,
    createdAt: now,
    completedAt: null,
    ...t,
  });
  const launch = base({ title: "Launch portfolio website", priority: "high", dueDate: offsetKey(6) });
  return [
    launch,
    base({ title: "Write the About page", parentId: launch.id, dueDate: offsetKey(2), status: "done", completedAt: now }),
    base({ title: "Pick 5 best projects to feature", parentId: launch.id, dueDate: offsetKey(3) }),
    base({ title: "Set up a custom domain", parentId: launch.id, dueDate: offsetKey(5), priority: "low" }),
    base({ title: "Review quarterly budget", priority: "high", dueDate: todayKey(), status: "in_progress" }),
    base({ title: "Reply to client emails", dueDate: todayKey() }),
    base({ title: "30-minute reading session", priority: "low", dueDate: todayKey() }),
    base({ title: "Prepare slides for Monday meeting", priority: "medium", dueDate: offsetKey(3) }),
  ];
}

export const taskStore = createLocalStore<Task[]>("kestrel.tasks.v1", {
  serverValue: [],
  seed: seedTasks,
});

export const useTasks = taskStore.useValue;

export function addTask(input: Partial<Task> & { title: string }) {
  const task: Task = {
    id: uid(),
    notes: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    parentId: null,
    aiGenerated: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    ...input,
  };
  taskStore.update((prev) => [task, ...prev]);
  return task;
}

export function addTasks(inputs: Array<Partial<Task> & { title: string }>) {
  const now = new Date().toISOString();
  const tasks = inputs.map<Task>((input) => ({
    id: uid(),
    notes: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    parentId: null,
    aiGenerated: false,
    createdAt: now,
    completedAt: null,
    ...input,
  }));
  taskStore.update((prev) => [...tasks, ...prev]);
  return tasks;
}

export function updateTask(id: string, patch: Partial<Task>) {
  taskStore.update((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export function setTaskStatus(id: string, status: TaskStatus) {
  updateTask(id, { status, completedAt: status === "done" ? new Date().toISOString() : null });
}

/** Deletes a task and all its subtasks. */
export function deleteTask(id: string) {
  taskStore.update((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
}

// ---------- Derived helpers (pure, tested) ----------

export function subtasksOf(tasks: Task[], parentId: string) {
  return tasks.filter((t) => t.parentId === parentId);
}

/** Completion ratio 0..100. A task with subtasks counts its subtasks. */
export function progressOf(tasks: Task[], task: Task) {
  const subs = subtasksOf(tasks, task.id);
  if (subs.length === 0) return task.status === "done" ? 100 : 0;
  const done = subs.filter((s) => s.status === "done").length;
  return Math.round((done / subs.length) * 100);
}

export function isOverdue(task: Task, now = new Date()) {
  return task.status !== "done" && task.dueDate !== null && daysUntil(task.dueDate, now) < 0;
}

export function isDueToday(task: Task, now = new Date()) {
  return task.dueDate !== null && daysUntil(task.dueDate, now) === 0;
}

/** Open tasks due within the next `days` days (excluding today), soonest first. */
export function upcomingTasks(tasks: Task[], days = 7, now = new Date()) {
  return tasks
    .filter((t) => t.status !== "done" && t.dueDate !== null)
    .filter((t) => {
      const d = daysUntil(t.dueDate!, now);
      return d > 0 && d <= days;
    })
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
}

export function sortTasks(list: Task[]) {
  return [...list].sort((a, b) => {
    if ((a.status === "done") !== (b.status === "done")) return a.status === "done" ? 1 : -1;
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (p !== 0) return p;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

/** Completed-task counts for each of the last 7 days (oldest first). */
export function completionsByDay(tasks: Task[], now = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(now, i - 6)));
  return days.map((day) => ({
    day,
    completed: tasks.filter((t) => t.completedAt && toDateKey(new Date(t.completedAt)) === day).length,
  }));
}

export function taskSummaryForAI(tasks: Task[]) {
  const open = sortTasks(tasks.filter((t) => t.status !== "done"));
  if (open.length === 0) return "No open tasks.";
  return open
    .slice(0, 40)
    .map(
      (t) =>
        `- ${t.title} | priority: ${t.priority} | due: ${t.dueDate ?? "none"} | status: ${t.status}${
          t.parentId ? " | subtask" : ""
        }`,
    )
    .join("\n");
}
