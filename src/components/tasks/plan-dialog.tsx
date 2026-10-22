import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AiOutput } from "@/components/app/ai-output";
import { streamAssist } from "@/lib/ai/client";
import { taskStore, taskSummaryForAI } from "@/lib/tasks";

export type PlanKind = "daily-plan" | "weekly-plan";

export function PlanDialog({ kind, onClose }: { kind: PlanKind | null; onClose: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function run(k: PlanKind) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setText("");
    setLoading(true);
    try {
      await streamAssist(
        {
          mode: k,
          input: k === "daily-plan" ? "Plan my day." : "Plan my week.",
          context: `My tasks:\n${taskSummaryForAI(taskStore.read())}`,
        },
        setText,
        controller.signal,
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast.error(error instanceof Error ? error.message : "Couldn't create a plan");
      }
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  useEffect(() => {
    if (kind) void run(kind);
    return () => abortRef.current?.abort();
  }, [kind]);

  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {kind === "weekly-plan" ? "Your week, planned" : "Your day, planned"}
          </DialogTitle>
          <DialogDescription>Built from your open tasks, priorities and deadlines.</DialogDescription>
        </DialogHeader>
        <AiOutput
          text={text}
          loading={loading}
          loadingLabel="Arranging your tasks…"
          verify={false}
          actions={
            kind && !loading ? (
              <Button variant="ghost" size="xs" onClick={() => run(kind)}>
                Regenerate
              </Button>
            ) : null
          }
        />
      </DialogContent>
    </Dialog>
  );
}
