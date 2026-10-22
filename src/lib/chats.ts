import type { UIMessage } from "ai";
import { createLocalStore, uid } from "./local-store";

export interface ChatThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: UIMessage[];
}

export const chatStore = createLocalStore<ChatThread[]>("kestrel.chats.v1", {
  serverValue: [],
  seed: () => [],
});

export const useThreads = chatStore.useValue;

export function newThreadId() {
  return uid();
}

export function titleFrom(messages: UIMessage[]) {
  const first = messages.find((m) => m.role === "user");
  const text =
    first?.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim() ?? "";
  if (!text) return "New conversation";
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

/** Creates or updates a thread. Threads are created lazily on the first message. */
export function saveThread(id: string, messages: UIMessage[]) {
  if (messages.length === 0) return;
  chatStore.update((prev) => {
    const existing = prev.find((t) => t.id === id);
    const thread: ChatThread = {
      id,
      title:
        existing && existing.title !== "New conversation" ? existing.title : titleFrom(messages),
      updatedAt: new Date().toISOString(),
      messages,
    };
    return [thread, ...prev.filter((t) => t.id !== id)];
  });
}

export function deleteThread(id: string) {
  chatStore.update((prev) => prev.filter((t) => t.id !== id));
}

export function sortedThreads(threads: ChatThread[]) {
  return [...threads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
