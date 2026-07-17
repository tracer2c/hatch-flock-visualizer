import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const KEY = "app_route_history";
const MAX = 50;

export function pushHistoryEntry(path: string) {
  try {
    const raw = sessionStorage.getItem(KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (arr[arr.length - 1] === path) return;
    arr.push(path);
    if (arr.length > MAX) arr.splice(0, arr.length - MAX);
    sessionStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export function readHistory(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Tracks visited in-app paths so useSmartBack can decide if history(-1) is safe. */
export function RouteHistoryTracker() {
  const loc = useLocation();
  useEffect(() => {
    pushHistoryEntry(loc.pathname + loc.search);
  }, [loc.pathname, loc.search]);
  return null;
}
