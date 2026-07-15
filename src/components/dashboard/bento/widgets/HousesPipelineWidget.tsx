import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { BentoCard } from "../BentoCard";
import { useHousesData } from "@/hooks/useHousesData";

interface Props {
  editing?: boolean;
  onRemove?: () => void;
}

export function HousesPipelineWidget({ editing, onRemove }: Props) {
  const navigate = useNavigate();
  const { data: houses = [] } = useHousesData();

  const setter = houses.filter((h: any) => h.status === "in_setter").length;
  const hatcher = houses.filter((h: any) => h.status === "in_hatcher").length;
  const completed = houses.filter((h: any) => h.status === "completed").length;
  const total = Math.max(1, setter + hatcher + completed);

  const bars = [
    { label: "In Setter", value: setter, fill: "url(#stripeBlue)", solid: "hsl(225 73% 57%)" },
    { label: "In Hatcher", value: hatcher, fill: "url(#stripeOrange)", solid: "hsl(22 91% 46%)" },
    { label: "Completed", value: completed, fill: "url(#stripeLime)", solid: "hsl(var(--bento-lime))" },
  ];

  return (
    <BentoCard
      variant="cream"
      eyebrow="Pipeline"
      title="Active Houses"
      editing={editing}
      onRemove={onRemove}
      bodyClassName="flex flex-col gap-3"
      right={
        !editing && (
          <button
            onClick={() => navigate("/live-tracking")}
            className="rounded-full border-2 border-[hsl(var(--bento-ink))] p-1 hover:bg-[hsl(var(--bento-ink))] hover:text-[hsl(var(--bento-cream))] transition-colors"
            aria-label="Open live tracking"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )
      }
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="stripeBlue" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="hsl(225 73% 57%)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="hsl(var(--bento-ink))" strokeWidth="3" />
          </pattern>
          <pattern id="stripeOrange" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="hsl(22 91% 46%)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="hsl(var(--bento-ink))" strokeWidth="3" />
          </pattern>
          <pattern id="stripeLime" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="hsl(var(--bento-lime))" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="hsl(var(--bento-ink))" strokeWidth="3" />
          </pattern>
        </defs>
      </svg>

      <div className="flex items-baseline gap-2">
        <div className="font-display font-black tracking-[-0.04em] leading-none text-[clamp(2.5rem,5vw,4rem)]">
          {setter + hatcher}
        </div>
        <div className="text-xs font-bold uppercase tracking-wider opacity-70">
          active · {completed} done
        </div>
      </div>

      <div className="flex flex-col gap-2 min-h-0 flex-1 justify-end">
        {bars.map((b) => {
          const pct = (b.value / total) * 100;
          return (
            <div key={b.label}>
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>{b.label}</span>
                <span>{b.value}</span>
              </div>
              <div className="h-5 w-full rounded-md border-2 border-[hsl(var(--bento-ink))] overflow-hidden bg-white">
                <svg width="100%" height="100%" preserveAspectRatio="none">
                  <rect width={`${pct}%`} height="100%" fill={b.fill} />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </BentoCard>
  );
}
