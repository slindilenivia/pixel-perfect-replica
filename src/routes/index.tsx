import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  CalendarClock,
  ListChecks,
  MessagesSquare,
  SendHorizontal,
  Flame,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { TopBar } from "@/components/app/page-header";
import { DueLabel, PriorityPill, TaskRow } from "@/components/tasks/task-bits";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { newThreadId, sortedThreads, useThreads } from "@/lib/chats";
import { useHydrated } from "@/lib/local-store";
import { useResearch } from "@/lib/research";
import {
  completionsByDay,
  isDueToday,
  isOverdue,
  sortTasks,
  upcomingTasks,
  useTasks,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kestrel — Your AI Productivity Dashboard" },
      {
        name: "description",
        content: "One dashboard for today's tasks, deadlines, research projects and AI conversations.",
      },
      { property: "og:title", content: "Kestrel — Your AI Productivity Dashboard" },
      {
        property: "og:description",
        content: "Plan, research and chat with AI from one calm, focused dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

const TOOLS = [
  {
    to: "/tasks",
    title: "Task Planner",
    body: "Prioritise, break down goals, plan your day.",
    icon: ListChecks,
  },
  {
    to: "/research",
    title: "Research Assistant",
    body: "Outlines, summaries, keywords and notes.",
    icon: BookOpenText,
  },
  {
    to: "/chat",
    title: "AI Chat",
    body: "Ask, draft and think things through.",
    icon: MessagesSquare,
  },
] as const;

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const hydrated = useHydrated();
  const tasks = useTasks();
  const research = useResearch();
  const threads = sortedThreads(useThreads());
  const navigate = useNavigate();
  const [ask, setAsk] = useState("");

  const today = sortTasks(tasks.filter((t) => isDueToday(t) || (isOverdue(t) && t.status !== "done")));
  const todayDone = today.filter((t) => t.status === "done").length;
  const upcoming = upcomingTasks(tasks, 14).slice(0, 5);
  const week = completionsByDay(tasks);
  const weekTotal = week.reduce((s, d) => s + d.completed, 0);
  const total = tasks.length;
  const doneAll = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;

  function startChat(e: React.FormEvent) {
    e.preventDefault();
    const q = ask.trim();
    if (!q) return;
    void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() }, search: { q } });
  }

  return (
    <>
      <TopBar>
        <span className="text-sm font-medium text-muted-foreground">Dashboard</span>
      </TopBar>
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        {/* Hero */}
        <section className="hero-panel relative overflow-hidden rounded-3xl p-6 shadow-lift md:p-8">
          <div className="paper-grid pointer-events-none absolute inset-0 opacity-15" />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div className="space-y-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-80">
                {hydrated ? format(new Date(), "EEEE, d MMMM") : "\u00a0"}
              </p>
              <h1 className="text-3xl font-bold leading-tight md:text-5xl">
                {hydrated ? greeting(new Date()) : "Welcome back"}.
                <br />
                <span className="opacity-80">What's the plan?</span>
              </h1>
              <form
                onSubmit={startChat}
                className="flex max-w-xl items-center gap-2 rounded-2xl bg-card p-1.5 pl-4 text-card-foreground shadow-lift"
              >
                <input
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  placeholder="Ask Kestrel anything…"
                  aria-label="Ask Kestrel"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button type="submit" size="sm" disabled={!ask.trim()}>
                  <SendHorizontal /> Ask
                </Button>
              </form>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Due today" value={hydrated ? today.length - todayDone : "–"} />
              <Stat label="Done this week" value={hydrated ? weekTotal : "–"} />
              <Stat label="Overdue" value={hydrated ? overdue : "–"} warn={hydrated && overdue > 0} />
            </div>
          </div>
        </section>

        {/* Quick access */}
        <section className="grid gap-3 sm:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <tool.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold">{tool.title}</p>
                <p className="truncate text-xs text-muted-foreground">{tool.body}</p>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Today */}
          <Panel
            className="lg:col-span-2"
            title="Today's tasks"
            action={<PanelLink to="/tasks">Open planner</PanelLink>}
          >
            {!hydrated ? (
              <ListSkeleton />
            ) : today.length === 0 ? (
              <Empty>Nothing due today. Add tasks in the planner.</Empty>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-3 px-2">
                  <Progress value={(todayDone / today.length) * 100} className="h-1.5" />
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {todayDone}/{today.length}
                  </span>
                </div>
                <div className="-mx-2">
                  {today.slice(0, 6).map((t) => (
                    <TaskRow key={t.id} task={{ ...t, parentId: null }} />
                  ))}
                </div>
              </>
            )}
          </Panel>

          {/* Progress */}
          <Panel title="Productivity" action={<Flame className="size-4 text-highlight" />}>
            {!hydrated ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-display text-4xl font-bold text-primary">
                      {total ? Math.round((doneAll / total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      of all tasks complete · {doneAll}/{total}
                    </p>
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    <span className="font-display text-lg font-bold text-foreground">{weekTotal}</span>
                    <br />
                    last 7 days
                  </p>
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={week.map((d) => ({ ...d, label: format(parseISO(d.day), "EEEEE") }))}>
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--muted)" }}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "var(--popover-foreground)",
                        }}
                        formatter={(v) => [v, "Completed"]}
                        labelFormatter={() => ""}
                      />
                      <Bar dataKey="completed" fill="var(--chart-1)" radius={[6, 6, 2, 2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </Panel>

          {/* Upcoming */}
          <Panel title="Upcoming deadlines" action={<CalendarClock className="size-4 text-muted-foreground" />}>
            {!hydrated ? (
              <ListSkeleton />
            ) : upcoming.length === 0 ? (
              <Empty>No deadlines in the next two weeks.</Empty>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <DueLabel task={t} />
                    </div>
                    <PriorityPill priority={t.priority} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Research */}
          <Panel title="Research projects" action={<PanelLink to="/research">All projects</PanelLink>}>
            {!hydrated ? (
              <ListSkeleton />
            ) : research.length === 0 ? (
              <Empty>Start a research project to collect notes.</Empty>
            ) : (
              <ul className="space-y-2">
                {research.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/research/$projectId"
                      params={{ projectId: p.id }}
                      className="block rounded-lg border bg-background px-3 py-2 transition-colors hover:border-primary/40"
                    >
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.notes.length} notes · updated {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Conversations */}
          <Panel title="Recent conversations" action={<PanelLink to="/chat">Open chat</PanelLink>}>
            {!hydrated ? (
              <ListSkeleton />
            ) : threads.length === 0 ? (
              <Empty>No chats yet. Ask Kestrel something above.</Empty>
            ) : (
              <ul className="space-y-2">
                {threads.slice(0, 4).map((t) => (
                  <li key={t.id}>
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId: t.id }}
                      className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 transition-colors hover:border-primary/40"
                    >
                      <MessagesSquare className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-card/15 p-3 ring-1 ring-primary-foreground/15 backdrop-blur">
      <p className={cn("font-display text-3xl font-bold", warn && "text-highlight")}>{value}</p>
      <p className="text-[11px] leading-tight opacity-80">{label}</p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-2xl border bg-card p-4 shadow-soft md:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function PanelLink({ to, children }: { to: "/tasks" | "/research" | "/chat"; children: React.ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      {children} <ArrowRight className="size-3" />
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
