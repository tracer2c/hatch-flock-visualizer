import { ReactNode } from "react";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  eyebrow?: string;
  variant?: "cream" | "ink" | "lime" | "lavender";
  editing?: boolean;
  onRemove?: () => void;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  right?: ReactNode;
}

const variantMap = {
  cream: "bg-[hsl(var(--bento-cream))] text-[hsl(var(--bento-ink))]",
  ink: "bg-[hsl(var(--bento-ink))] text-[hsl(var(--bento-cream))]",
  lime: "bg-[hsl(var(--bento-lime))] text-[hsl(var(--bento-ink))]",
  lavender: "bg-[hsl(var(--bento-lavender))] text-[hsl(var(--bento-ink))]",
} as const;

export function BentoCard({
  title,
  eyebrow,
  variant = "cream",
  editing,
  onRemove,
  className,
  bodyClassName,
  children,
  right,
}: Props) {
  return (
    <div
      className={cn(
        "h-full w-full flex flex-col rounded-[22px] border-2 border-[hsl(var(--bento-ink))] overflow-hidden",
        "shadow-[6px_6px_0_hsl(var(--bento-ink))] transition-shadow",
        variantMap[variant],
        className
      )}
    >
      {(title || eyebrow || editing) && (
        <div
          className={cn(
            "bento-drag-handle flex items-start justify-between gap-2 px-4 pt-3 pb-2 select-none",
            editing && "cursor-grab active:cursor-grabbing"
          )}
        >
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-70">
                {eyebrow}
              </div>
            )}
            {title && (
              <div className="text-sm font-bold tracking-tight truncate">{title}</div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {right}
            {editing && (
              <>
                <GripVertical className="h-4 w-4 opacity-60" />
                {onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="rounded-full border-2 border-current p-0.5 hover:bg-[hsl(var(--bento-ink))] hover:text-[hsl(var(--bento-cream))] transition-colors"
                    aria-label="Remove widget"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <div className={cn("flex-1 min-h-0 px-4 pb-4", bodyClassName)}>{children}</div>
    </div>
  );
}
