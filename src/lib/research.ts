import { createLocalStore, uid } from "./local-store";

export type NoteKind = "note" | "outline" | "summary" | "explanation" | "keywords" | "questions";

export interface ResearchNote {
  id: string;
  kind: NoteKind;
  title: string;
  content: string;
  aiGenerated: boolean;
  verified: boolean;
  createdAt: string;
}

export interface ResearchProject {
  id: string;
  title: string;
  topic: string;
  notes: ResearchNote[];
  createdAt: string;
  updatedAt: string;
}

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  note: "My note",
  outline: "Outline",
  summary: "Summary",
  explanation: "Explanation",
  keywords: "Keywords",
  questions: "Research questions",
};

function seed(): ResearchProject[] {
  const now = new Date().toISOString();
  return [
    {
      id: uid(),
      title: "Remote work & productivity",
      topic: "How does remote work affect employee productivity and wellbeing?",
      createdAt: now,
      updatedAt: now,
      notes: [
        {
          id: uid(),
          kind: "note",
          title: "Starting point",
          content:
            "Look for studies from 2020 onwards. Compare fully remote vs hybrid. Check sample sizes before quoting numbers.",
          aiGenerated: false,
          verified: true,
          createdAt: now,
        },
      ],
    },
  ];
}

export const researchStore = createLocalStore<ResearchProject[]>("kestrel.research.v1", {
  serverValue: [],
  seed,
});

export const useResearch = researchStore.useValue;

export function createProject(title: string, topic: string) {
  const now = new Date().toISOString();
  const project: ResearchProject = {
    id: uid(),
    title,
    topic,
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
  researchStore.update((prev) => [project, ...prev]);
  return project;
}

export function updateProject(
  id: string,
  patch: Partial<Pick<ResearchProject, "title" | "topic">>,
) {
  researchStore.update((prev) =>
    prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
  );
}

export function deleteProject(id: string) {
  researchStore.update((prev) => prev.filter((p) => p.id !== id));
}

export function addNote(projectId: string, note: Omit<ResearchNote, "id" | "createdAt">) {
  const now = new Date().toISOString();
  const full: ResearchNote = { ...note, id: uid(), createdAt: now };
  researchStore.update((prev) =>
    prev.map((p) => (p.id === projectId ? { ...p, notes: [full, ...p.notes], updatedAt: now } : p)),
  );
  return full;
}

export function updateNote(projectId: string, noteId: string, patch: Partial<ResearchNote>) {
  const now = new Date().toISOString();
  researchStore.update((prev) =>
    prev.map((p) =>
      p.id === projectId
        ? {
            ...p,
            updatedAt: now,
            notes: p.notes.map((n) => (n.id === noteId ? { ...n, ...patch } : n)),
          }
        : p,
    ),
  );
}

export function deleteNote(projectId: string, noteId: string) {
  researchStore.update((prev) =>
    prev.map((p) =>
      p.id === projectId ? { ...p, notes: p.notes.filter((n) => n.id !== noteId) } : p,
    ),
  );
}
