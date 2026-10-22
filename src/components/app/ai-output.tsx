import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { AiBadge, VerifyNotice } from "./responsible-ai";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="xs"
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
      {copied ? "Copied" : label}
    </Button>
  );
}

/** Renders streamed AI markdown with a clear AI label and verification reminder. */
export function AiOutput({
  text,
  loading,
  loadingLabel = "Thinking…",
  actions,
  verify = true,
}: {
  text: string;
  loading: boolean;
  loadingLabel?: string;
  actions?: React.ReactNode;
  verify?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AiBadge />
        <div className="flex items-center gap-1">
          {text && !loading && <CopyButton text={text} />}
          {actions}
        </div>
      </div>
      {loading && !text ? (
        <Shimmer className="text-sm">{loadingLabel}</Shimmer>
      ) : (
        <div className="text-sm leading-relaxed">
          <MessageResponse isAnimating={loading}>{text}</MessageResponse>
        </div>
      )}
      {verify && !loading && text && <VerifyNotice />}
    </div>
  );
}
