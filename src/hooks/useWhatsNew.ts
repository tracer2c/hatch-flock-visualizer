import { useEffect, useState } from "react";
import { CHANGELOG, CURRENT_VERSION, ChangelogEntry } from "@/data/changelog";
import { useAuth } from "@/hooks/useAuth";

const BASE_KEY = "hp:lastSeenChangelogVersion";

function storageKey(userId?: string | null) {
  return userId ? `${BASE_KEY}:${userId}` : BASE_KEY;
}

/** Compare semver-ish strings. Returns >0 if a>b, <0 if a<b, 0 if equal. */
function cmpVersion(a: string, b: string) {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function useWhatsNew() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [entry] = useState<ChangelogEntry>(CHANGELOG[0]);

  useEffect(() => {
    if (!user) return; // only show once signed in
    try {
      const key = storageKey(user.id);
      const seen = localStorage.getItem(key);
      if (!seen) {
        // First-ever visit: seed silently, don't spam with old releases.
        localStorage.setItem(key, CURRENT_VERSION);
        return;
      }
      if (cmpVersion(CURRENT_VERSION, seen) > 0) {
        setOpen(true);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const acknowledge = () => {
    try {
      localStorage.setItem(storageKey(user?.id), CURRENT_VERSION);
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return { open, setOpen, acknowledge, entry };
}

export function hasUnseenChangelog(userId?: string | null) {
  try {
    const seen = localStorage.getItem(storageKey(userId));
    if (!seen) return false;
    return cmpVersion(CURRENT_VERSION, seen) > 0;
  } catch {
    return false;
  }
}
