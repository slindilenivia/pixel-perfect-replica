import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Check,
  HelpCircle,
  KeyRound,
  ListTree,
  Lightbulb,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Square,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { TopBar } from "@/components/app/page-header";
import { AiOutput } from "@/components/app/ai-output";
import { AiBadge, VerifyNotice } from "@/components/app/responsible-ai";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { streamAssist } from "@/lib/ai/client";
import type { AssistMode } from "@/lib/ai/prompts";
import { useHydrated } from "@/lib/local-store";
import {
  addNote,
  deleteNote,
  deleteProject,
  NOTE_KIND_LABEL,
  updateNote,
  updateProject,
  useResearch,
  type NoteKind,
  type ResearchNote,
  type ResearchProject,
} from "@/lib/research";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/research/$projectId")({
  head: () => ({
    meta: [
      { title: "Research notebook — Kestrel" },
      {
        name: "description",
        content: "Generate outlines, summaries, explanations, keywords and research questions, and keep organised notes.",
      },
      { property: "og:title", content: "Research notebook — Kestrel" },
      { property: "og:description", content: "An AI-assisted research notebook with verification reminders." },
    ],
  }),
  component: ProjectPage,
});

type Tool = Exclude<AssistMode, "daily-plan" | "weekly-plan">;

const TOOLS: Array<{ id: Tool; label: string; icon: typeof ListTree; hint: string; kind: NoteKind }> = [
  { id: "outline", label: "Outline", icon: ListTree, hint: "A structured outline for the topic", kind: "outline" },
  { id: "summary", label: "Summary", icon: ScrollText, hint: "What's generally known, key points & debates", kind: "summary" },
  { id: "explain", label: "Explain", icon: Lightbulb, hint: "Explain a difficult concept simply", kind: "explanation" },
  { id: "keywords", label: "Keywords", icon: KeyRound, hint: "Search terms and Boolean strings", kind: "keywords" },
  { id: "questions", label: "Questions", icon: HelpCircle, hint: "Strong research questions to investigate", kind: "questions" },
];

function ProjectPage() {
  const { projectId } = Route.useParams();
  const projects = useResearch();
  const hydrated = useHydrated();
  const project = projects.find((p) => p.id === projectId);

  return (
    <>
      <TopBar>
        <Link to="/research" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Research
        </Link>
      </TopBar>
      {!hydrated ? (
        <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8 md:px-8">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !project ? (
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="font-display text-2xl font-bold">Project not found</p>
          <p className="mt-2 text-sm text-muted-foreground">It may have been deleted from this browser.</p>
          <Button asChild className="mt-6">
            <Link to="/research">Back to research</Link>
          </Button>
        </div>
      ) : (
        <Notebook project={project} />
      )}
    </>
  );
}

function Notebook({ project }: { project: ResearchProject }) {
  const navigate = useNavigate();
  const [editingHeader, setEditingHeader] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [topic, setTopic] = useState(project.topic);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {editingHeader ? (
          <form
            className="w-full max-w-2xl space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              updateProject(project.id, { title: title.trim(), topic: topic.trim() });
              setEditingHeader(false);
            }}
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-display text-lg font-bold" />
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" type="submit">
                Save
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setEditingHeader(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-1">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-primary">Research notebook</p>
            <h1 className="text-3xl font-bold md:text-4xl">{project.title}</h1>
            <p className="max-w-2xl text-muted-foreground">{project.topic}</p>
          </div>
        )}
        {!editingHeader && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingHeader(true)}>
              <Pencil /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    “{project.title}” and its {project.notes.length} notes will be removed from this browser.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteProject(project.id);
                      void navigate({ to: "/research" });
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <AssistantPanel project={project} />
        <NotesPanel project={project} />
      </div>
    </main>
  );
}

function AssistantPanel({ project }: { project: ResearchProject }) {
  const [tool, setTool] = useState<Tool>("outline");
  const [question, setQuestion] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastRun, setLastRun] = useState<{ tool: Tool; input: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const active = TOOLS.find((t) => t.id === tool)!;

  async function run() {
    const input = question.trim() || project.topic;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setText("");
    setSaved(false);
    setLoading(true);
    setLastRun({ tool, input });
    try {
      await streamAssist(
        {
          mode: tool,
          input,
          context:
            input === project.topic ? undefined : `This is part of a research project on: ${project.topic}`,
        },
        setText,
        controller.signal,
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error(error instanceof Error ? error.message : "Couldn't reach the AI");
      }
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  function save() {
    if (!text || !lastRun) return;
    const t = TOOLS.find((x) => x.id === lastRun.tool)!;
    addNote(project.id, {
      kind: t.kind,
      title: `${t.label}: ${lastRun.input.length > 60 ? `${lastRun.input.slice(0, 57)}…` : lastRun.input}`,
      content: text,
      aiGenerated: true,
      verified: false,
    });
    setSaved(true);
    toast.success("Saved to notes");
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-soft md:p-5">
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 text-primary" />
        <h2 className="text-lg font-bold">Research assistant</h2>
      </div>
      <div className="grid grid-cols-5 gap-1.5" role="tablist" aria-label="Research tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tool === t.id}
            onClick={() => setTool(t.id)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border px-1 py-2.5 text-xs font-medium transition-colors",
              tool === t.id
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{active.hint}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className="space-y-2"
      >
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            tool === "explain"
              ? "What's confusing you? e.g. What is a confounding variable?"
              : `Leave empty to use the project topic, or ask something specific…`
          }
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void run();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-muted-foreground">
            Only the text above and your topic are sent to the AI.
          </span>
          {loading ? (
            <Button type="button" variant="outline" size="sm" onClick={() => abortRef.current?.abort()}>
              <Square /> Stop
            </Button>
          ) : (
            <Button type="submit" size="sm">
              <active.icon /> Generate {active.label.toLowerCase()}
            </Button>
          )}
        </div>
      </form>

      {(text || loading) && (
        <div className="rounded-xl border bg-background p-4">
          <AiOutput
            text={text}
            loading={loading}
            loadingLabel="Researching…"
            actions={
              !loading && text ? (
                <>
                  <Button variant="ghost" size="xs" onClick={() => void run()}>
                    Regenerate
                  </Button>
                  <Button variant={saved ? "ghost" : "secondary"} size="xs" onClick={save} disabled={saved}>
                    {saved ? <Check /> : <Bookmark />}
                    {saved ? "Saved" : "Save to notes"}
                  </Button>
                </>
              ) : null
            }
          />
        </div>
      )}
    </section>
  );
}

function NotesPanel({ project }: { project: ResearchProject }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "mine" | "ai" | "unverified">("all");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const notes = useMemo(() => {
    const q = query.toLowerCase();
    return project.notes.filter((n) => {
      if (filter === "mine" && n.aiGenerated) return false;
      if (filter === "ai" && !n.aiGenerated) return false;
      if (filter === "unverified" && (n.verified || !n.aiGenerated)) return false;
      return !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    });
  }, [project.notes, query, filter]);

  const unverified = project.notes.filter((n) => n.aiGenerated && !n.verified).length;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Notes</h2>
        <Button size="sm" variant="outline" onClick={() => setDraftOpen((o) => !o)}>
          <Plus /> Add note
        </Button>
      </div>

      {draftOpen && (
        <form
          className="space-y-2 rounded-xl border bg-card p-3 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draftBody.trim()) return;
            addNote(project.id, {
              kind: "note",
              title: draftTitle.trim() || "Untitled note",
              content: draftBody.trim(),
              aiGenerated: false,
              verified: true,
            });
            setDraftTitle("");
            setDraftBody("");
            setDraftOpen(false);
          }}
        >
          <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Title" autoFocus />
          <Textarea value={draftBody} onChange={(e) => setDraftBody(e.target.value)} placeholder="Your note (markdown works)" rows={4} />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraftOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!draftBody.trim()}>
              Save note
            </Button>
          </div>
        </form>
      )}

      {unverified > 0 && (
        <VerifyNotice>
          {unverified} AI note{unverified > 1 ? "s" : ""} not yet verified. Check them against trusted sources, then mark as verified.
        </VerifyNotice>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="pl-8" />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["all", "mine", "ai", "unverified"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "ai" ? "AI" : f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {project.notes.length === 0 ? "Save AI results or add your own notes here." : "No notes match."}
          </p>
        ) : (
          notes.map((n) => <NoteCard key={n.id} projectId={project.id} note={n} />)
        )}
      </div>
    </section>
  );
}

function NoteCard({ projectId, note }: { projectId: string; note: ResearchNote }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.content);
  const long = note.content.length > 420;

  return (
    <article className="rounded-xl border bg-card p-4 shadow-soft">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {NOTE_KIND_LABEL[note.kind]}
        </span>
        {note.aiGenerated && <AiBadge />}
        {note.aiGenerated && note.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
            <BadgeCheck className="size-3" /> Verified by you
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {format(new Date(note.createdAt), "d MMM, HH:mm")}
        </span>
      </header>
      <h3 className="mb-1 font-sans text-sm font-semibold tracking-normal">{note.title}</h3>
      {editing ? (
        <div className="space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          <div className="flex justify-end gap-2">
            <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              onClick={() => {
                updateNote(projectId, note.id, { content: body });
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn("relative text-sm", long && !expanded && "max-h-48 overflow-hidden")}>
          <MessageResponse>{note.content}</MessageResponse>
          {long && !expanded && (
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
          )}
        </div>
      )}
      <footer className="mt-3 flex flex-wrap items-center gap-1">
        {long && !editing && (
          <Button size="xs" variant="ghost" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {note.aiGenerated && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => updateNote(projectId, note.id, { verified: !note.verified })}
            >
              <BadgeCheck /> {note.verified ? "Unverify" : "Mark verified"}
            </Button>
          )}
          {!editing && (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Edit note"
              onClick={() => {
                setBody(note.content);
                setEditing(true);
              }}
            >
              <Pencil />
            </Button>
          )}
          <Button size="icon-xs" variant="ghost" aria-label="Delete note" onClick={() => deleteNote(projectId, note.id)}>
            <Trash2 />
          </Button>
        </div>
      </footer>
    </article>
  );
}
