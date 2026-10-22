import type { ReactNode } from "react";
import { BadgeCheck, EyeOff, HardDrive, ShieldCheck, Sparkle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const POINTS = [
  {
    icon: HardDrive,
    title: "Your data stays in this browser",
    body: "Tasks, research notes and chats are saved on this device only. Clearing your browser data removes them.",
  },
  {
    icon: EyeOff,
    title: "Keys stay on the server",
    body: "AI requests go through our server. No API keys or secrets are ever sent to your browser.",
  },
  {
    icon: Sparkle,
    title: "AI content is labelled",
    body: "Anything written by AI carries an “AI-generated” label so you always know where it came from.",
  },
  {
    icon: BadgeCheck,
    title: "Verify what matters",
    body: "AI can be wrong or out of date. Check facts, figures and citations against reliable sources before relying on them.",
  },
  {
    icon: ShieldCheck,
    title: "Share carefully",
    body: "Avoid entering passwords, ID numbers, health or financial details. Only the text you send is shared with the AI.",
  },
];

export function ResponsibleAiDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Privacy & responsible AI</DialogTitle>
          <DialogDescription>How Kestrel handles your information and AI output.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-4">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <p.icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-medium text-ai",
        className,
      )}
    >
      <Sparkle className="size-3" />
      AI-generated
    </span>
  );
}

export function VerifyNotice({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-highlight/40 bg-highlight-soft px-3 py-2 text-xs text-foreground",
        className,
      )}
    >
      <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-warning" />
      <p>
        {children ??
          "AI can make mistakes. Verify important facts, figures and sources before you rely on them."}
      </p>
    </div>
  );
}
