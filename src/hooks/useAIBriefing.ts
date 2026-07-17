import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Briefing {
  text: string;
  generatedAt: number;
}

const REFRESH_MS = 2 * 60 * 60 * 1000; // 2 hours

interface Context {
  rangeLabel: string;
  totalEggs: number;
  avgFertility: number | null;
  avgHatch: number | null;
  avgHoi: number | null;
  criticalAlerts: number;
  attentionCount: number;
  topAttention: string[];
}

export function useAIBriefing(ctx: Context, enabled: boolean) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const cacheKey = `hp:ai-briefing:v2`;

  useEffect(() => {
    if (!enabled) return;
    // load cache
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Briefing;
        setBriefing(parsed);
        if (Date.now() - parsed.generatedAt < REFRESH_MS) return;
      }
    } catch {}

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fert = ctx.avgFertility;
    const hof = ctx.avgHatch;
    const hoi = ctx.avgHoi;
    const fertGap = fert != null ? (85 - fert).toFixed(1) : null;
    const hofGap = hof != null ? (88 - hof).toFixed(1) : null;
    const hoiGap = hoi != null ? (75 - hoi).toFixed(1) : null;

    const prompt = `You are a senior hatchery operations analyst writing the morning stand-up briefing for the hatchery manager. Do NOT restate the raw numbers back in sentences — the manager already sees KPI cards. Interpret them.

DATA (for your reasoning only — do NOT echo verbatim):
- Week: ${ctx.rangeLabel}
- Eggs Set: ${ctx.totalEggs.toLocaleString()}
- Fertility ${fert?.toFixed(1) ?? "n/a"}% vs 85% target (gap ${fertGap ?? "n/a"} pp)
- HOF ${hof?.toFixed(1) ?? "n/a"}% vs 88% target (gap ${hofGap ?? "n/a"} pp)
- HOI ${hoi?.toFixed(1) ?? "n/a"}% vs 75% target (gap ${hoiGap ?? "n/a"} pp)
- Critical QA alerts: ${ctx.criticalAlerts}
- Flocks flagged: ${ctx.attentionCount} (${ctx.topAttention.slice(0, 5).join(", ") || "none"})

WRITE exactly 4 markdown bullets, in this fixed order, each ≤ 90 chars, no restating of the raw numbers:
- **Signal:** the one thing that most defines this week (trend, outlier, or "quiet week").
- **Risk:** the biggest downside risk right now, tied to a metric gap or QA alert. If data is missing say so ("Residue not entered — HOF unreliable").
- **Opportunity:** where a small change would move the needle most.
- **Next step:** one concrete action, name a flock/hatchery/room if possible.

Rules: no headings, no tables, no preamble, no "Total Eggs Set: 55,000" style lines, no percentages restated back. If everything is missing, say the data is not entered yet and recommend an entry action.`;

    setLoading(true);
    supabase.functions
      .invoke("ai-chat", { body: { message: prompt, history: [] } })
      .then(({ data, error }) => {
        if (error) throw error;
        const text: string = data?.response || data?.message || "";
        if (!text) return;
        const next: Briefing = { text, generatedAt: Date.now() };
        setBriefing(next);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { briefing, loading };
}
