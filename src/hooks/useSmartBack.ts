import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { readHistory } from "@/components/RouteHistoryTracker";

/**
 * Returns a `goBack()` that returns to the previous in-app page when possible,
 * otherwise falls back to `fallback` (e.g. "/data-entry"). If the caller passed
 * `state.from`, that path wins.
 */
export function useSmartBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from && typeof from === "string" && from.startsWith("/")) {
      navigate(from);
      return;
    }

    const hist = readHistory();
    // Last entry is the current route; the one before is the true previous.
    const prev = hist[hist.length - 2];
    if (prev && prev !== location.pathname + location.search) {
      navigate(-1);
      return;
    }

    navigate(fallback);
  }, [navigate, location, fallback]);
}
