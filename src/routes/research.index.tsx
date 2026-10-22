import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { BookOpenText, FolderPlus, NotebookPen, Sparkle } from "lucide-react";

import { PageHeader, TopBar } from "@/components/app/page-header";
import { VerifyNotice } from "@/components/app/responsible-ai";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/lib/local-store";
import { createProject, useResearch } from "@/lib/research";

export const Route = createFileRoute("/research/")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant — Kestrel" },
      {
        name: "description",
        content:
          "Organise research projects, generate outlines and summaries, explain hard topics and find keywords with AI.",
      },
      { property: "og:title", content: "AI Research Assistant — Kestrel" },
      {
        property: "og:description",
        content:
          "Generate outlines, summaries, explanations and research questions — with reminders to verify.",
      },
    ],
  }),
  component: ResearchIndex,
});

function ResearchIndex() {
  const projects = useResearch();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TopBar>
        <span className="text-sm font-medium text-muted-foreground">Research</span>
      </TopBar>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-10">
        <PageHeader
          eyebrow="AI Research Assistant"
          title="Research projects"
          description="Keep each topic in its own notebook: outlines, summaries, explanations, keywords and your own notes."
          actions={
            <Button onClick={() => setOpen(true)}>
              <FolderPlus /> New project
            </Button>
          }
        />
        <VerifyNotice>
          AI research help is a starting point, not a source. Always confirm facts and find original
          references before citing.
        </VerifyNotice>

        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <BookOpenText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No research projects yet</p>
            <p className="text-sm text-muted-foreground">
              Start one to collect AI insights and your own notes.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => {
              const aiCount = p.notes.filter((n) => n.aiGenerated).length;
              return (
                <Link
                  key={p.id}
                  to="/research/$projectId"
                  params={{ projectId: p.id }}
                  className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold leading-tight group-hover:text-primary">
                      {p.title}
                    </h2>
                    <BookOpenText className="size-5 shrink-0 text-primary" />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.topic}</p>
                  <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <NotebookPen className="size-3.5" /> {p.notes.length} notes
                    </span>
                    {aiCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-ai">
                        <Sparkle className="size-3.5" /> {aiCount} AI
                      </span>
                    )}
                    <span className="ml-auto">
                      {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <NewProjectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const project = createProject(title.trim(), topic.trim() || title.trim());
    setTitle("");
    setTopic("");
    onOpenChange(false);
    void navigate({ to: "/research/$projectId", params: { projectId: project.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New research project</DialogTitle>
          <DialogDescription>
            Give it a name and the main question you want to answer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-title">Project name</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Renewable energy in Africa"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-topic">Main question or topic</Label>
            <Textarea
              id="project-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. What is holding back solar adoption in rural communities?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim()}>
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
