import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface WxState {
  city: string;
  region: string;
  tempF: number;
  code: number;
}

const CACHE_KEY = "hp:weather-loc:v1";
const CACHE_MS = 30 * 60 * 1000; // 30 min

function iconFor(code: number) {
  // Open-Meteo WMO codes
  if (code === 0) return Sun;
  if ([1, 2].includes(code)) return Sun;
  if (code === 3) return Cloud;
  if ([45, 48].includes(code)) return CloudFog;
  if ([51, 53, 55, 56, 57].includes(code)) return CloudDrizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return CloudRain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return CloudSnow;
  if ([95, 96, 99].includes(code)) return CloudLightning;
  return Cloud;
}

interface Props {
  variant?: "pill" | "plain";
}

export function WeatherLocationChip({ variant = "pill" }: Props) {
  const [wx, setWx] = useState<WxState | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Date.now() - parsed.ts < CACHE_MS) {
            setWx(parsed.data);
            return;
          }
        }

        const locRes = await fetch("https://ipapi.co/json/");
        if (!locRes.ok) return;
        const loc = await locRes.json();
        const { city, region_code, region, latitude, longitude } = loc;
        if (!latitude || !longitude) return;

        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
        );
        if (!wxRes.ok) return;
        const wxData = await wxRes.json();
        const current = wxData?.current;
        if (!current) return;

        const data: WxState = {
          city: city || "—",
          region: region_code || region || "",
          tempF: Math.round(current.temperature_2m),
          code: current.weather_code ?? 0,
        };
        if (cancelled) return;
        setWx(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch {
        // silent fail
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!wx) return null;
  const Icon = iconFor(wx.code);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs",
        variant === "pill" && "rounded-full border border-border/60 bg-card/60 px-3 py-1.5 backdrop-blur",
        variant === "plain" && "px-1 py-1",
      )}
    >
      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">
        {wx.city}
        {wx.region ? `, ${wx.region}` : ""}
      </span>
      <span className="h-3 w-px bg-border" />
      <Icon className="h-3.5 w-3.5 text-amber-500" />
      <span className="font-semibold text-foreground">{wx.tempF}°F</span>
    </div>
  );
}
