import { useAuth } from "@/hooks/useAuth";

/**
 * Display name of the signed-in user, used to stamp technician / inspector
 * fields automatically so they never have to be typed (or mistyped).
 */
export function useCurrentUserName(): string {
  const { profile, user } = useAuth();
  const full = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || profile?.email || user?.email || "";
}
