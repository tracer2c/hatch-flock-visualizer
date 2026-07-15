import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { WIDGET_REGISTRY } from "./widgets/registry";
import { Plus, Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  active: string[];
  onAdd: (id: string, size: { w: number; h: number }) => void;
}

export function AddWidgetSheet({ open, onOpenChange, active, onAdd }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-[hsl(var(--bento-cream))] border-l-2 border-[hsl(var(--bento-ink))]">
        <SheetHeader>
          <SheetTitle className="font-display font-black tracking-tight text-2xl text-[hsl(var(--bento-ink))]">
            Widget Library
          </SheetTitle>
          <SheetDescription className="text-[hsl(var(--bento-ink))]/70">
            Tap a widget to drop it on your dashboard.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-2">
          {WIDGET_REGISTRY.map((w) => {
            const on = active.includes(w.id);
            const Icon = w.icon;
            return (
              <button
                key={w.id}
                disabled={on}
                onClick={() => {
                  onAdd(w.id, w.defaultSize);
                  onOpenChange(false);
                }}
                className={`flex items-start gap-3 rounded-xl border-2 border-[hsl(var(--bento-ink))] p-3 text-left transition-all ${
                  on
                    ? "bg-[hsl(var(--bento-lime))] cursor-not-allowed opacity-70"
                    : "bg-white hover:shadow-[4px_4px_0_hsl(var(--bento-ink))] hover:-translate-x-[2px] hover:-translate-y-[2px]"
                }`}
              >
                <div className="p-2 rounded-lg border-2 border-[hsl(var(--bento-ink))] bg-[hsl(var(--bento-lavender))]">
                  <Icon className="h-4 w-4 text-[hsl(var(--bento-ink))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[hsl(var(--bento-ink))]">{w.title}</div>
                  <div className="text-xs text-[hsl(var(--bento-ink))]/70 mt-0.5">{w.description}</div>
                </div>
                {on ? (
                  <Check className="h-4 w-4 text-[hsl(var(--bento-ink))]" />
                ) : (
                  <Plus className="h-4 w-4 text-[hsl(var(--bento-ink))]" />
                )}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
