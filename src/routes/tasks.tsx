import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, CalendarRange, ListPlus, Plus, Wand2 } from "lucide-react";

import { TopBar, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskRow } from "@/components/tasks/task-bits";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { BreakdownDialog } from "@/components/tasks/breakdown-dialog";
import { PlanDialog, type PlanKind } from "@/components/tasks/plan-dialog";
import { useHydrated } from "@/lib/local-store";
import { todayKey } from "@/lib/dates";
import {
  addTask,
  isDueToday,
  isOverdue,
  progressOf,
  sortTasks,
  subtasksOf,
  upcomingTasks,
  useTasks,
  type Task,
} from "@/lib/tasks";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — Kestrel" },
      {
        name: "description",
        content: "Create, prioritise and complete tasks, break big goals into steps and generate daily or weekly plans with AI.",
      },
      { property: "og:title", content: "AI Task Planner — Kestrel" },
      {
        property: "og:description",
        content: "Prioritise tasks, break down goals and generate daily and weekly plans with AI.",
      },
    ],
  }),
  component: TasksPage,
});

type Filter = "all" | "today" | "upcoming" | "done";

function TasksPage() {
  const tasks = useTasks();
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<Filter>("all");
  const [quick, setQuick] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [plan, setPlan] = useState<PlanKind | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const overall = total ? Math.round((done / total) * 100) : 0;

  const visible = useMemo(() => {
    const topLevel = tasks.filter((t) => !t.parentId);
    switch (filter) {
      case "today":
        return sortTasks(tasks.filter((t) => t.status !== "done" && (isDueToday(t) || isOverdue(t))));
      case "upcoming":
        return upcomingTasks(tasks, 14);
      case "done":
        return tasks.filter((t) => t.status === "done").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
      default:
        return sortTasks(topLevel);
    }
  }, [tasks, filter]);

  function openEditor(task: Task | null) {
    setEditing(task);
    setDialogOpen(true);
  }

  function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quick.trim()) return;
    addTask({ title: quick.trim(), dueDate: filter === "today" ? todayKey() : null });
    setQuick("");
  }

  const counts = {
    all: tasks.filter((t) => !t.parentId && t.status !== "done").length,
    today: tasks.filter((t) => t.status !== "done" && (isDueToday(t) || isOverdue(t))).length,
    upcoming: upcomingTasks(tasks, 14).length,
    done,
  };

  return (
    <>
      <TopBar>
        <span className="text-sm font-medium text-muted-foreground">Task Planner</span>
      </TopBar>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="AI Task Planner"
          title="Your tasks"
          description="Set priorities and deadlines, split big goals into steps, and let AI arrange your day."
          actions={
            <>
              <Button variant="outline" onClick={() => setPlan("daily-plan")}>
                <CalendarClock /> Plan my day
              </Button>
              <Button variant="outline" onClick={() => setPlan("weekly-plan")}>
                <CalendarRange /> Plan my week
              </Button>
              <Button onClick={() => setBreakdownOpen(true)}>
                <Wand2 /> Break down a goal
              </Button>
            </>
          }
        />

        <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Overall progress</span>
              <span className="font-mono text-xs text-muted-foreground">
                {done}/{total} done
              </span>
            </div>
            <Progress value={overall} className="h-2" />
          </div>
          <span className="font-display text-3xl font-bold text-primary sm:pl-6">{overall}%</span>
        </section>

        <section className="rounded-2xl border bg-card shadow-soft">
          <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList>
                {(["all", "today", "upcoming", "done"] as const).map((f) => (
                  <TabsTrigger key={f} value={f} className="gap-1.5 capitalize">
                    {f === "done" ? "Completed" : f}
                    {hydrated && <span className="font-mono text-[10px] text-muted-foreground">{counts[f]}</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="sm" onClick={() => openEditor(null)}>
              <ListPlus /> Detailed task
            </Button>
          </div>

          <form onSubmit={quickAdd} className="flex gap-2 border-b p-3">
            <Input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder={filter === "today" ? "Add a task for today…" : "Add a task and press Enter…"}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label="New task title"
            />
            <Button type="submit" size="sm" disabled={!quick.trim()}>
              <Plus /> Add
            </Button>
          </form>

          <div className="p-2">
            {!hydrated ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              visible.map((task) => {
                const subs = filter === "all" ? sortTasks(subtasksOf(tasks, task.id)) : [];
                const isCollapsed = collapsed.has(task.id);
                return (
                  <div key={task.id}>
                    <TaskRow
                      task={filter === "all" ? task : { ...task, parentId: null }}
                      onEdit={openEditor}
                      subtaskCount={subs.length}
                      progress={subs.length ? progressOf(tasks, task) : undefined}
                      expanded={!isCollapsed}
                      onToggleExpand={() =>
                        setCollapsed((prev) => {
                          const next = new Set(prev);
                          if (next.has(task.id)) next.delete(task.id);
                          else next.add(task.id);
                          return next;
                        })
                      }
                    />
                    {!isCollapsed && subs.map((s) => <TaskRow key={s.id} task={s} onEdit={openEditor} />)}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        defaultDue={filter === "today" ? todayKey() : null}
      />
      <BreakdownDialog open={breakdownOpen} onOpenChange={setBreakdownOpen} />
      <PlanDialog kind={plan} onClose={() => setPlan(null)} />
    </>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const copy: Record<Filter, string> = {
    all: "No tasks yet. Add one above or let AI break down a goal.",
    today: "Nothing due today. Enjoy the breathing room.",
    upcoming: "No deadlines in the next two weeks.",
    done: "Completed tasks will show up here.",
  };
  return <p className="px-3 py-10 text-center text-sm text-muted-foreground">{copy[filter]}</p>;
}
