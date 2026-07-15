import { useEffect } from "react";
import BentoDashboard from "@/components/dashboard/bento/BentoDashboard";

const Index = () => {
  useEffect(() => {
    document.title = "Dashboard Overview | Hatchery Pro";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Modular bento dashboard for hatchery operations — KPIs, alerts, pipeline and QA widgets."
      );
    }
  }, []);

  return <BentoDashboard />;
};

export default Index;
