import { describe, expect, it } from "vitest";

import {
  completionsByDay,
  isOverdue,
  progressOf,
  sortTasks,
  upcomingTasks,
  type Task,
} from "@/lib/tasks";

const NOW = new Date(2026, 9, 22, 10, 0, 0); // 22 Oct 2026, local time

function task(p: Partial<Task> & { id: string }): Task {
  return {
    title: p.id,
    notes: "",
    priority: "medium",
    status: "todo",
    dueDate: null,
    parentId: null,
    aiGenerated: false,
    createdAt: NOW.toISOString(),
    completedAt: null,
    ...p,
  };
}

describe("task rules", () => {
  it("a goal's progress is the share of its subtasks that are done", () => {
    const goal = task({ id: "goal" });
    const tasks = [
      goal,
      task({ id: "a", parentId: "goal", status: "done" }),
      task({ id: "b", parentId: "goal" }),
      task({ id: "c", parentId: "goal" }),
      task({ id: "d", parentId: "goal", status: "done" }),
    ];
    expect(progressOf(tasks, goal)).toBe(50);
  });

  it("an open task past its deadline is overdue, a done one is not", () => {
    expect(isOverdue(task({ id: "x", dueDate: "2026-10-21" }), NOW)).toBe(true);
    expect(isOverdue(task({ id: "y", dueDate: "2026-10-21", status: "done" }), NOW)).toBe(false);
    expect(isOverdue(task({ id: "z", dueDate: "2026-10-22" }), NOW)).toBe(false);
  });

  it("upcoming deadlines exclude today and finished tasks, soonest first", () => {
    const list = [
      task({ id: "later", dueDate: "2026-10-28" }),
      task({ id: "today", dueDate: "2026-10-22" }),
      task({ id: "soon", dueDate: "2026-10-23" }),
      task({ id: "finished", dueDate: "2026-10-24", status: "done" }),
      task({ id: "far", dueDate: "2026-12-01" }),
    ];
    expect(upcomingTasks(list, 7, NOW).map((t) => t.id)).toEqual(["soon", "later"]);
  });

  it("high priority sorts before medium and low, and done tasks go last", () => {
    const list = [
      task({ id: "low", priority: "low" }),
      task({ id: "done-high", priority: "high", status: "done" }),
      task({ id: "high", priority: "high" }),
      task({ id: "medium" }),
    ];
    expect(sortTasks(list).map((t) => t.id)).toEqual(["high", "medium", "low", "done-high"]);
  });

  it("weekly progress counts completions on each of the last 7 days", () => {
    const list = [
      task({ id: "a", status: "done", completedAt: new Date(2026, 9, 22, 9).toISOString() }),
      task({ id: "b", status: "done", completedAt: new Date(2026, 9, 22, 8).toISOString() }),
      task({ id: "c", status: "done", completedAt: new Date(2026, 9, 16, 12).toISOString() }),
      task({ id: "old", status: "done", completedAt: new Date(2026, 9, 1).toISOString() }),
    ];
    const days = completionsByDay(list, NOW);
    expect(days).toHaveLength(7);
    expect(days[6]).toEqual({ day: "2026-10-22", completed: 2 });
    expect(days[0]).toEqual({ day: "2026-10-16", completed: 1 });
  });
});
