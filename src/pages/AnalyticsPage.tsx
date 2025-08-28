import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import AdvancedAnalytics from "@/components/dashboard/AdvancedAnalytics";

const AnalyticsPage = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Advanced Analytics | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Advanced analytics with environmental calendar, predictions, and unit comparisons."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Advanced analytics with environmental calendar, predictions, and unit comparisons.";
      document.head.appendChild(m);
    }
  }, []);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="p-6">
        <div className="max-w-full mx-auto">
          <AdvancedAnalytics />
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;