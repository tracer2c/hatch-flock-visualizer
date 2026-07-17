import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAIBriefing } from "@/hooks/useAIBriefing";

interface Props {
  rangeLabel: string;
  totalEggs: number;
  avgFertility: number | null;
  avgHatch: number | null;
  avgHoi: number | null;
  criticalAlerts: number;
  attentionCount: number;
  topAttention: string[];
  enabled: boolean;
}

export function AIBriefingCard(props: Props) {
  const { briefing, loading } = useAIBriefing(props, props.enabled);

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 h-full flex flex-col">
      <div className="p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold">AI Daily Briefing</h3>
          </div>
          {briefing && (
            <span className="text-[10px] text-muted-foreground">
              Updated {formatDistanceToNow(briefing.generatedAt, { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto text-sm text-foreground/90 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground">
          {briefing ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefing.text}</ReactMarkdown>
          ) : loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating briefing…
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-4">
              Briefing will appear here shortly.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
