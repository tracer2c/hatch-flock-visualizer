import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import PerformanceAnalytics from "@/components/dashboard/PerformanceAnalytics";

const PerformancePage = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Performance Analytics | Hatchery Dashboard";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Performance analytics dashboard with process flow analysis and key metrics."
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Performance analytics dashboard with process flow analysis and key metrics.";
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
          <PerformanceAnalytics />
        </div>
      </main>
    </div>
  );
};

export default PerformancePage;