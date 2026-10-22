import type { AssistMode } from "./prompts";

async function readError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

/** Streams text from the assist endpoint, calling onText with the full text so far. */
export async function streamAssist(
  params: { mode: AssistMode; input: string; context?: string },
  onText: (text: string) => void,
  signal?: AbortSignal,
) {
  const res = await fetch("/api/assist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(await readError(res));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  return text;
}

export interface SuggestedSubtask {
  title: string;
  priority: "low" | "medium" | "high";
  dayOffset: number;
}

export async function breakdownGoal(goal: string, deadline: string | null, signal?: AbortSignal) {
  const res = await fetch("/api/breakdown", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal, deadline }),
    signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { subtasks: SuggestedSubtask[] };
  return data.subtasks;
}
