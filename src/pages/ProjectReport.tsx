import { useEffect, useRef } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const ProjectReport = () => {
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // SEO: title, description, canonical
    document.title = "Hatchery Project Report – 270 Hours"; // < 60 chars
    const desc =
      "Detailed 270-hour progress: UI updates, analytics, HOI/HOF, alerts, AI, exports."; // < 160 chars
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, []);

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    const el = reportRef.current;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = -imgHeight + (pdf.internal.pageSize.getHeight() * (Math.ceil(imgHeight / pageHeight) - (heightLeft / pageHeight)));
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    pdf.save("Hatchery_Project_Report.pdf");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Hatchery Project Report (270 Hours)</h1>
          <p className="text-muted-foreground">Comprehensive summary of features, UI changes, analytics, and deliverables</p>
        </header>

        <Navigation />

        <main className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={downloadPDF}>Download Report as PDF</Button>
          </div>

          <section ref={reportRef} id="report-content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
                  <li>Core dashboards completed with multi-unit support and themed visualizations.</li>
                  <li>Process Flow updated to HOI/HOF metrics with breed/age comparisons.</li>
                  <li>Advanced Analytics: Predictions Panel (Supabase Edge + OpenAI) and AI Chart Insights.</li>
                  <li>Alerting system wired to Supabase checks, plus export options (image/PDF).</li>
                  <li>UX polish: navigation, colorful chart palette, responsive layouts.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Major Deliverables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h3 className="font-semibold mb-2">Dashboards & Analytics</h3>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      <li>Live Overview with KPIs and alerts.</li>
                      <li>Process Flow with HOI/HOF area charts and breed-age slices.</li>
                      <li>Performance & Comparison tabs with vibrant palette and radar/bar charts.</li>
                      <li>Advanced Analytics hub: Heatmap Calendar, Timeline, Sankey, Weekly Comparison.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Intelligence & Automation</h3>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      <li>Predictions Panel via predict-metrics Edge Function.</li>
                      <li>AI Chart Insights via chart-insights Edge Function.</li>
                      <li>Alert Center with temperature/humidity/schedule checks.</li>
                      <li>One-click chart and flowchart downloads.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>UI/UX Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                  <li>Color system: semantic HSL tokens for charts (--chart-1..5).</li>
                  <li>Navigation improvements with role-aware items and quick access.</li>
                  <li>Responsive layouts, accessible contrasts, and consistent typography.</li>
                  <li>Flowchart with zoom/pan and export, refreshed to reflect new features.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data & Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground">
                  <li>Supabase tables for batches, flocks, QA, residue, and alerts.</li>
                  <li>Real-time sync enabling alert updates and dashboard refresh.</li>
                  <li>Edge Functions: predict-metrics (OpenAI) and chart-insights for explanations.</li>
                  <li>Secure auth with role-based controls for management features.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Milestones Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                  <li>Weeks 1-2: Setup, auth, base schema.</li>
                  <li>Weeks 3-5: Data models and entry flows.</li>
                  <li>Weeks 6-9: Dashboards and process flow visualizations.</li>
                  <li>Weeks 10-13: HOI/HOF + Analysis enhancements.</li>
                  <li>Weeks 14-18: Advanced Analytics hub, AI integrations.</li>
                  <li>Weeks 19-22: Alerts and export tooling.</li>
                  <li>Weeks 23-27: Theming, color palette, UX polish, QA.</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demo Script</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-6 space-y-1 text-sm text-muted-foreground">
                  <li>Open Main Dashboard → show KPIs and Alerts.</li>
                  <li>Process Flow → highlight HOI/HOF and breed/age breakdowns.</li>
                  <li>Analysis tab → radar and bar comparisons with new colors.</li>
                  <li>Advanced Analytics → Predictions Panel and AI Insights.</li>
                  <li>System Flow → updated architecture and milestones.</li>
                  <li>Project Report → click "Download PDF" to share.</li>
                </ol>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ProjectReport;
