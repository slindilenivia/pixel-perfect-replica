import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { History, MessageSquarePlus, Trash2 } from "lucide-react";
import { z } from "zod";

import { TopBar } from "@/components/app/page-header";
import { ChatWindow } from "@/components/chat/chat-window";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteThread, newThreadId, sortedThreads, useThreads } from "@/lib/chats";
import { useHydrated } from "@/lib/local-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat/$threadId")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "AI Chat — Kestrel" },
      { name: "description", content: "Chat with Kestrel's AI assistant about planning, research, writing and productivity." },
      { property: "og:title", content: "AI Chat — Kestrel" },
      { property: "og:description", content: "Chat with an AI assistant for planning, research, writing and productivity." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const { q } = Route.useSearch();
  const hydrated = useHydrated();

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <TopBar>
        <span className="text-sm font-medium text-muted-foreground">AI Chat</span>
        <div className="ml-auto flex items-center gap-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <History /> History
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="border-b p-4">
                <SheetTitle className="font-display">Conversations</SheetTitle>
              </SheetHeader>
              <ThreadList activeId={threadId} />
            </SheetContent>
          </Sheet>
          <NewChatButton />
        </div>
      </TopBar>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col border-r bg-sidebar/50 lg:flex">
          <div className="px-4 pb-2 pt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Chat history
          </div>
          {hydrated ? <ThreadList activeId={threadId} /> : <ListSkeleton />}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {hydrated ? (
            <ChatWindow key={threadId} threadId={threadId} initialPrompt={q} />
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>
    </div>
  );
}

function NewChatButton() {
  const navigate = useNavigate();
  return (
    <Button
      size="sm"
      onClick={() => navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() } })}
    >
      <MessageSquarePlus /> New chat
    </Button>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function ThreadList({ activeId }: { activeId: string }) {
  const threads = sortedThreads(useThreads());
  const navigate = useNavigate();

  if (threads.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Your conversations will appear here.</p>;
  }

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Conversations">
      {threads.map((t) => (
        <div
          key={t.id}
          className={cn(
            "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
            t.id === activeId ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-muted",
          )}
        >
          <Link
            to="/chat/$threadId"
            params={{ threadId: t.id }}
            className="min-w-0 flex-1 px-3 py-2"
          >
            <p className="truncate text-sm font-medium">{t.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
            </p>
          </Link>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Delete ${t.title}`}
            onClick={() => {
              deleteThread(t.id);
              if (t.id === activeId) void navigate({ to: "/chat/$threadId", params: { threadId: newThreadId() } });
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </nav>
  );
}
