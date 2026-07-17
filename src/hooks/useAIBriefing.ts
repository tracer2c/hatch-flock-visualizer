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

  const cacheKey = `hp:ai-briefing:v1`;

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

    const prompt = `You are a hatchery operations analyst. Write a concise daily briefing for a hatchery manager based on this snapshot:

Week: ${ctx.rangeLabel}
Total Eggs Set: ${ctx.totalEggs.toLocaleString()}
Avg Fertility: ${ctx.avgFertility?.toFixed(1) ?? "n/a"}% (target 85%)
Avg Hatch of Fertile: ${ctx.avgHatch?.toFixed(1) ?? "n/a"}% (target 88%)
Avg Hatch of Injection: ${ctx.avgHoi?.toFixed(1) ?? "n/a"}% (target 75%)
Critical QA Alerts: ${ctx.criticalAlerts}
Flocks needing attention: ${ctx.attentionCount}
Top attention flocks: ${ctx.topAttention.slice(0, 5).join(", ") || "none"}

Reply with 4–6 short bullets in plain user language. Highlight what's on track, what's off target, and one clear next step. Do NOT return tables. Do NOT return all zeros — if data is missing, say so plainly. Use markdown bullets (- ). No preamble.`;

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
