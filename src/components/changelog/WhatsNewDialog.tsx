import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWhatsNew } from "@/hooks/useWhatsNew";

const tagStyles: Record<string, string> = {
  New: "bg-primary/10 text-primary border-primary/20",
  Improved: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  Fixed: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
};

export function WhatsNewDialog() {
  const { open, setOpen, acknowledge, entry } = useWhatsNew();

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : acknowledge())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-left">What's new · v{entry.version}</DialogTitle>
              <DialogDescription className="text-left">
                {new Date(entry.releaseDate).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · "}
                {entry.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ul className="mt-2 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {entry.highlights.map((h, i) => (
            <li key={i} className="flex gap-3">
              <Badge
                variant="outline"
                className={`h-6 shrink-0 ${tagStyles[h.tag] ?? ""}`}
              >
                {h.tag}
              </Badge>
              <p className="text-sm text-foreground leading-relaxed">{h.text}</p>
            </li>
          ))}
        </ul>

        <DialogFooter className="mt-4 flex-row justify-between sm:justify-between gap-2">
          <Button variant="ghost" asChild>
            <Link to="/changelogs" onClick={acknowledge}>
              View full changelog
            </Link>
          </Button>
          <Button onClick={acknowledge}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
