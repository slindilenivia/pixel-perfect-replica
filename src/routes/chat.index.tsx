import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { chatStore, newThreadId, sortedThreads } from "@/lib/chats";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "AI Chat — Kestrel" },
      { name: "description", content: "Chat with Kestrel's AI assistant about planning, research, writing and productivity." },
      { property: "og:title", content: "AI Chat — Kestrel" },
      { property: "og:description", content: "Chat with an AI assistant for planning, research, writing and productivity." },
    ],
  }),
  component: ChatIndex,
});

/** Opens the most recent conversation, or a fresh one. */
function ChatIndex() {
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const latest = sortedThreads(chatStore.read())[0];
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: latest?.id ?? newThreadId() },
      replace: true,
    });
  }, [navigate]);
  return (
    <div className="flex h-svh items-center justify-center">
      <Shimmer className="text-sm">Opening your chats…</Shimmer>
    </div>
  );
}
