import { useState } from "react";
import { Wand2, X } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { AiBadge, VerifyNotice } from "@/components/app/responsible-ai";
import { breakdownGoal, type SuggestedSubtask } from "@/lib/ai/client";
import { addTask, addTasks } from "@/lib/tasks";
import { offsetKey } from "@/lib/dates";
import { PriorityPill } from "./task-bits";

export function BreakdownDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedSubtask[] | null>(null);

  function reset() {
    setGoal("");
    setDeadline("");
    setSuggestions(null);
    setLoading(false);
  }

  async function generate() {
    if (goal.trim().length < 3) return;
    setLoading(true);
    setSuggestions(null);
    try {
      const subs = await breakdownGoal(goal.trim(), deadline || null);
      setSuggestions(subs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't break down that goal");
    } finally {
      setLoading(false);
    }
  }

  function accept() {
    if (!suggestions?.length) return;
    const parent = addTask({ title: goal.trim(), priority: "high", dueDate: deadline || null });
    addTasks(
      suggestions.map((s) => ({
        title: s.title,
        priority: s.priority,
        dueDate: offsetKey(s.dayOffset),
        parentId: parent.id,
        aiGenerated: true,
      })),
    );
    toast.success(`Added “${parent.title}” with ${suggestions.length} subtasks`);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Break down a goal</DialogTitle>
          <DialogDescription>
            Describe something big. AI will suggest smaller, scheduled steps you can edit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal">Goal</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Prepare for my final statistics exam"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-deadline">Deadline (optional)</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {loading && <Shimmer className="text-sm">Breaking it into steps…</Shimmer>}

          {suggestions && (
            <div className="space-y-3 rounded-xl border bg-muted/40 p-3">
              <AiBadge />
              <ul className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md bg-card px-2.5 py-2 text-sm shadow-soft"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{s.title}</span>
                    <PriorityPill priority={s.priority} />
                    <span className="w-14 text-right text-xs text-muted-foreground">
                      {s.dayOffset === 0 ? "Today" : `+${s.dayOffset}d`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove step"
                      onClick={() =>
                        setSuggestions((prev) => prev?.filter((_, j) => j !== i) ?? null)
                      }
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
              <VerifyNotice>
                Review the steps and dates — you can edit any task after adding it.
              </VerifyNotice>
            </div>
          )}
        </div>
        <DialogFooter>
          {suggestions ? (
            <>
              <Button variant="ghost" onClick={generate} disabled={loading}>
                Try again
              </Button>
              <Button onClick={accept} disabled={!suggestions.length}>
                Add {suggestions.length} tasks
              </Button>
            </>
          ) : (
            <Button onClick={generate} disabled={loading || goal.trim().length < 3}>
              <Wand2 /> Break it down
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
