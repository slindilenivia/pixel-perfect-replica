import logo from "@/assets/kestrel-logo.png";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-logo-tile ring-1 ring-border",
        className,
      )}
    >
      <img src={logo} alt="Kestrel" width={816} height={816} className="size-full scale-125 object-cover" />
    </span>
  );
}
