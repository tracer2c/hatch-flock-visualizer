import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CHANGELOG, CURRENT_VERSION } from "@/data/changelog";

const tagStyles: Record<string, string> = {
  New: "bg-primary/10 text-primary border-primary/20",
  Improved: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  Fixed: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
};

export default function ChangelogsPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col px-4 sm:px-6 pb-6">
      <header className="flex items-center gap-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">What's New</h1>
          <p className="text-sm text-muted-foreground">
            Product updates and improvements across Hatchery Pro.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pr-1">
        <ol className="relative space-y-6 border-l border-border pl-6 ml-3">
          {CHANGELOG.map((entry) => {
            const isCurrent = entry.version === CURRENT_VERSION;
            return (
              <li key={entry.version} className="relative">
                <span
                  className={`absolute -left-[31px] top-2 h-3 w-3 rounded-full border-2 ${
                    isCurrent ? "bg-primary border-primary" : "bg-background border-border"
                  }`}
                />
                <Card className="p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold">v{entry.version}</h2>
                    {isCurrent && (
                      <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
                        Current
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground ml-auto">
                      {new Date(entry.releaseDate).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{entry.title}</p>

                  <ul className="space-y-2">
                    {entry.highlights.map((h, i) => (
                      <li key={i} className="flex gap-3">
                        <Badge
                          variant="outline"
                          className={`h-6 shrink-0 ${tagStyles[h.tag] ?? ""}`}
                        >
                          {h.tag}
                        </Badge>
                        <span className="text-sm leading-relaxed">{h.text}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
