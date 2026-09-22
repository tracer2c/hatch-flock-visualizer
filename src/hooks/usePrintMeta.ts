import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ROLE_LABEL: Record<string, string> = {
  company_admin: "Company Admin",
  operations_head: "Operations Head",
  staff: "Staff",
};

/**
 * Metadata printed in the header band of any paper export: who printed it,
 * for which company, and when. Company name comes from `companies.name`;
 * falls back to the product name when it can't be read.
 */
export function usePrintMeta() {
  const { profile, userRoles } = useAuth();

  const companyQ = useQuery({
    queryKey: ["print-company-name", profile?.company_id],
    enabled: !!profile?.company_id,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("name")
        .eq("id", profile!.company_id)
        .maybeSingle();
      if (error) throw error;
      return data?.name ?? null;
    },
  });

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();

  return {
    companyName: companyQ.data || "Hatchery Pro",
    userName: fullName || profile?.email || "—",
    role: userRoles?.[0]?.role ? ROLE_LABEL[userRoles[0].role] ?? userRoles[0].role : "",
  };
}
