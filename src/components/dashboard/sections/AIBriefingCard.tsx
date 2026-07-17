import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, Loader2, MessageSquare, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  variant?: "default" | "compact";
}

export function AIBriefingCard(props: Props) {
  const { briefing, loading } = useAIBriefing(props, props.enabled);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const compact = props.variant === "compact";

  const header = (
    <div className="flex items-center justify-between mb-2 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold truncate">AI Daily Briefing</h3>
        {briefing && (
          <span className="text-[10px] text-muted-foreground truncate">
            · Updated {formatDistanceToNow(briefing.generatedAt, { addSuffix: true })}
          </span>
        )}
      </div>
      {compact && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => navigate("/chat")}>
            <MessageSquare className="h-3 w-3 mr-1" /> Ask HatchAI
          </Button>
          {briefing && (
            <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => setOpen(true)}>
              View full <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const body = (
    <div className="flex-1 min-h-0 overflow-y-auto text-sm text-foreground/90 prose prose-sm max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0 prose-strong:text-foreground">
      {briefing ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefing.text}</ReactMarkdown>
      ) : loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating briefing…
        </div>
      ) : (
        <div className="text-xs text-muted-foreground py-2">
          Briefing will appear here shortly.
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card
        className={
          "relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 flex flex-col " +
          (compact ? "h-[170px]" : "h-full")
        }
      >
        <div className="p-4 flex-1 min-h-0 flex flex-col">
          {header}
          {body}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Daily Briefing
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm prose prose-sm max-w-none max-h-[60vh] overflow-y-auto">
            {briefing ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefing.text}</ReactMarkdown>
            ) : (
              <div className="text-muted-foreground">No briefing yet.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
