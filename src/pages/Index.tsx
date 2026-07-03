import { useEffect } from "react";
import DashboardHome from "@/components/dashboard/DashboardHome";

const Index = () => {
  useEffect(() => {
    document.title = "Dashboard Overview | Hatchery Pro";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Live overview of hatchery operations with KPIs, alerts, and system status."
      );
    }
  }, []);

  return <DashboardHome />;
};

export default Index;
