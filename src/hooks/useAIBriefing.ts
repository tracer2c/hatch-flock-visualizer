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
  briefPeriod?: string;
}

export function useAIBriefing(ctx: Context, enabled: boolean) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const inFlightKeyRef = useRef<string | null>(null);

  const contextSignature = [
    ctx.rangeLabel,
    ctx.totalEggs,
    ctx.avgFertility?.toFixed(1) ?? "na",
    ctx.avgHatch?.toFixed(1) ?? "na",
    ctx.avgHoi?.toFixed(1) ?? "na",
    ctx.criticalAlerts,
    ctx.attentionCount,
    ctx.topAttention.slice(0, 5).join(","),
    ctx.briefPeriod ?? "current",
  ].join("|");
  const cacheKey = `hp:ai-briefing:v3:${contextSignature}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Briefing;
        setBriefing(parsed);
        if (Date.now() - parsed.generatedAt < REFRESH_MS) return;
      } else {
        setBriefing(null);
      }
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }

    if (inFlightKeyRef.current === cacheKey) return;
    inFlightKeyRef.current = cacheKey;

    const fert = ctx.avgFertility;
    const hof = ctx.avgHatch;
    const hoi = ctx.avgHoi;
    const fertGap = fert != null ? (85 - fert).toFixed(1) : null;
    const hofGap = hof != null ? (88 - hof).toFixed(1) : null;
    const hoiGap = hoi != null ? (75 - hoi).toFixed(1) : null;

    const prompt = `You are a senior hatchery operations analyst writing an ${ctx.briefPeriod ?? "operations"} summary for the hatchery manager. The dashboard already shows the KPI cards, so interpret the day instead of repeating every raw number.

DATA (for your reasoning only — do NOT echo verbatim):
- Selected range: ${ctx.rangeLabel}
- Eggs Set: ${ctx.totalEggs.toLocaleString()}
- Fertility ${fert?.toFixed(1) ?? "n/a"}% vs 85% target (gap ${fertGap ?? "n/a"} pp)
- HOF ${hof?.toFixed(1) ?? "n/a"}% vs 88% target (gap ${hofGap ?? "n/a"} pp)
- HOI ${hoi?.toFixed(1) ?? "n/a"}% vs 75% target (gap ${hoiGap ?? "n/a"} pp)
- Critical QA alerts: ${ctx.criticalAlerts}
- Flocks flagged: ${ctx.attentionCount} (${ctx.topAttention.slice(0, 5).join(", ") || "none"})

Write one concise paragraph, 2 to 4 sentences, no markdown, no bullets, no heading, no table, 65 to 105 words.

Rules:
- Focus on the strongest operational signal, the main risk, and one next action.
- Name a flock if one is flagged.
- Mention a metric only when it explains the risk or priority.
- If everything is missing, say the dashboard is not ready for analysis and recommend the entry action.`;

    setLoading(true);
    supabase.functions
      .invoke("ai-chat", { body: { message: prompt, history: [] } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        const text: string = data?.response || data?.message || "";
        if (!text) return;
        const next: Briefing = { text, generatedAt: Date.now() };
        setBriefing(next);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          // Cache writes are best-effort; the live summary still renders.
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
        if (inFlightKeyRef.current === cacheKey) inFlightKeyRef.current = null;
      });

    return () => {
      cancelled = true;
    };
    // cacheKey includes every dashboard value used in the prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]);

  return { briefing, loading };
}
