import { useChat } from "@ai-sdk/react";
import { useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { BookOpenText, CalendarCheck, Check, Copy, PenLine, RefreshCcw, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrandMark } from "@/components/app/brand";
import { AiBadge } from "@/components/app/responsible-ai";
import { chatStore, saveThread } from "@/lib/chats";

const SUGGESTIONS = [
  {
    category: "Planning",
    icon: CalendarCheck,
    prompts: ["Help me plan a productive Monday", "Create a 4-week study plan for an exam"],
  },
  {
    category: "Research",
    icon: BookOpenText,
    prompts: ["Explain machine learning like I'm new to it", "What are good sources for market research?"],
  },
  {
    category: "Writing",
    icon: PenLine,
    prompts: ["Draft a polite follow-up email to a client", "Improve the clarity of this paragraph:"],
  },
  {
    category: "Productivity",
    icon: Zap,
    prompts: ["How can I beat procrastination today?", "Suggest a simple weekly review routine"],
  },
];

function textOf(message: UIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function ChatWindow({ threadId, initialPrompt }: { threadId: string; initialPrompt?: string | undefined }) {
  const navigate = useNavigate();
  const initialMessages = useMemo(
    () => chatStore.read().find((t) => t.id === threadId)?.messages ?? [],
    [threadId],
  );
  const lastSaved = useRef(JSON.stringify(initialMessages));
  const sentInitial = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "The AI couldn't respond. Please try again."),
  });

  const busy = status === "submitted" || status === "streaming";

  // Persist completed turns to this browser.
  useEffect(() => {
    if (busy || messages.length === 0) return;
    const serialized = JSON.stringify(messages);
    if (serialized === lastSaved.current) return;
    lastSaved.current = serialized;
    saveThread(threadId, messages);
  }, [busy, messages, threadId]);

  // A prompt handed over from the dashboard (?q=…) is sent once.
  useEffect(() => {
    if (sentInitial.current || !initialPrompt) return;
    sentInitial.current = true;
    if (initialMessages.length === 0) void sendMessage({ text: initialPrompt });
    void navigate({ to: "/chat/$threadId", params: { threadId }, search: {}, replace: true });
  }, [initialPrompt, initialMessages.length, navigate, sendMessage, threadId]);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, threadId]);

  function submit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text || busy) return;
    void sendMessage({ text });
    setInput("");
  }

  function pickSuggestion(prompt: string) {
    if (prompt.endsWith(":")) {
      setInput(`${prompt} `);
      textareaRef.current?.focus();
      return;
    }
    void sendMessage({ text: prompt });
  }

  const lastAssistantIndex = messages.reduce((last, m, i) => (m.role === "assistant" ? i : last), -1);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 md:px-6">
          {messages.length === 0 ? (
            <EmptyState onPick={pickSuggestion} />
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                streaming={busy && index === messages.length - 1}
                canRegenerate={!busy && index === lastAssistantIndex}
                onRegenerate={() => void regenerate()}
              />
            ))
          )}
          {status === "submitted" && (
            <div className="flex items-center gap-3">
              <BrandMark className="size-7" />
              <Shimmer className="text-sm">Thinking…</Shimmer>
            </div>
          )}
          {error && !busy && (
            <div className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
              {error.message || "Something went wrong."}{" "}
              <button type="button" className="font-medium underline" onClick={() => void regenerate()}>
                Try again
              </button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background/90 px-4 pb-4 pt-3 backdrop-blur md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput onSubmit={submit} className="rounded-2xl bg-card shadow-soft">
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Kestrel to plan, research, write or explain…"
              autoFocus
            />
            <PromptInputFooter className="justify-between">
              <span className="pl-1 text-[11px] text-muted-foreground">
                Shift + Enter for a new line · Don't share passwords or personal IDs
              </span>
              <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()} />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Replies are AI-generated and can be wrong. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({
  message,
  streaming,
  canRegenerate,
  onRegenerate,
}: {
  message: UIMessage;
  streaming: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = textOf(message);

  if (message.role === "user") {
    return (
      <Message from="user">
        <MessageContent>
          <p className="whitespace-pre-wrap">{text}</p>
        </MessageContent>
      </Message>
    );
  }

  return (
    <div className="flex gap-3">
      <BrandMark className="mt-0.5 size-7" />
      <Message from="assistant" className="max-w-full min-w-0 flex-1">
        <MessageContent className="w-full">
          {message.parts.map((part, i) => {
            if (part.type === "reasoning" && part.text) {
              return (
                <Reasoning key={i} isStreaming={streaming && part.state === "streaming"} defaultOpen={false}>
                  <ReasoningTrigger />
                  <ReasoningContent>{part.text}</ReasoningContent>
                </Reasoning>
              );
            }
            if (part.type === "text") {
              return (
                <MessageResponse key={i} isAnimating={streaming}>
                  {part.text}
                </MessageResponse>
              );
            }
            return null;
          })}
        </MessageContent>
        {!streaming && text && (
          <MessageActions className="-ml-1.5">
            <AiBadge className="mr-1" />
            <MessageAction
              tooltip={copied ? "Copied" : "Copy"}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  toast.error("Couldn't copy to clipboard");
                }
              }}
            >
              {copied ? <Check /> : <Copy />}
            </MessageAction>
            {canRegenerate && (
              <MessageAction tooltip="Regenerate" onClick={onRegenerate}>
                <RefreshCcw />
              </MessageAction>
            )}
          </MessageActions>
        )}
      </Message>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-8 py-8 text-center md:py-14">
      <div className="space-y-3">
        <BrandMark className="mx-auto size-14 rounded-2xl shadow-lift" />
        <h2 className="text-2xl font-bold md:text-3xl">What are we working on?</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Ask anything about planning, research, writing or getting things done. Pick a starter or type your own.
        </p>
      </div>
      <div className="grid w-full gap-3 text-left sm:grid-cols-2">
        {SUGGESTIONS.map((group) => (
          <div key={group.category} className="rounded-xl border bg-card p-3 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <group.icon className="size-3.5" />
              {group.category}
            </div>
            <div className="space-y-1">
              {group.prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPick(p)}
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
