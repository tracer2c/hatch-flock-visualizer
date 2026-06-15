import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface ReportData {
  title: string;
  dateRange?: { start: string; end: string };
  metrics?: Record<string, number | string>;
  tables?: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }>;
}

export interface VisualReportOptions {
  /** Title at the top of page 1 */
  title: string;
  /** Scope line, e.g. "Active houses · All hatcheries" */
  subtitle?: string;
  /** Template-based explanation bullet lines, built from the actual numbers */
  summary: string[];
  /** DOM element id whose charts + numbers get captured into the report */
  captureElementId?: string;
  /** Output filename (no extension) */
  filename: string;
}

export class ReportService {
  /**
   * Generic "report generation" PDF used by the per-page export buttons.
   * Page 1 = title + template explanation of the charts/data; following pages =
   * the on-screen charts & numbers captured as an image (sliced across pages).
   * This is what powers "download numbers + charts + explanation as 1 PDF".
   */
  static async generateVisualReport(opts: VisualReportOptions): Promise<void> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const MARGIN = 15;
    const contentWidth = pageWidth - MARGIN * 2;
    let y = MARGIN;

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(30, 41, 59);
    pdf.text(opts.title, MARGIN, y + 4);
    y += 11;

    if (opts.subtitle) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(100, 116, 139);
      pdf.text(opts.subtitle, MARGIN, y);
      y += 6;
    }
    pdf.setFontSize(9);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Generated ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, MARGIN, y);
    y += 6;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 8;

    // Summary & Explanation
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(30, 41, 59);
    pdf.text('Summary & Explanation', MARGIN, y);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(51, 65, 85);
    for (const line of opts.summary) {
      const wrapped = pdf.splitTextToSize(`•  ${line}`, contentWidth);
      if (y + wrapped.length * 5 > pageHeight - MARGIN) {
        pdf.addPage();
        y = MARGIN;
      }
      pdf.text(wrapped, MARGIN, y);
      y += wrapped.length * 5 + 2;
    }

    // Captured charts + numbers
    if (opts.captureElementId) {
      const el = document.getElementById(opts.captureElementId);
      if (el) {
        const canvas = await html2canvas(el, { scale: 2, logging: false, backgroundColor: '#ffffff' });
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addPage();
        y = MARGIN;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(30, 41, 59);
        pdf.text('Charts & Figures', MARGIN, y);
        y += 6;

        const pxPerMm = canvas.height / imgHeight;
        let remaining = imgHeight;
        let sourceY = 0;
        while (remaining > 0) {
          const avail = pageHeight - MARGIN - y;
          const sliceMm = Math.min(remaining, avail);
          const slicePx = sliceMm * pxPerMm;
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = slicePx;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, sourceY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
            pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', MARGIN, y, imgWidth, sliceMm);
          }
          remaining -= sliceMm;
          sourceY += slicePx;
          if (remaining > 0.5) {
            pdf.addPage();
            y = MARGIN;
          } else {
            y += sliceMm;
          }
        }
      }
    }

    pdf.save(`${opts.filename}.pdf`);
  }

  static async generateBatchReport(batchId: string): Promise<Blob> {
    // Fetch batch data
    const { data: batch, error } = await supabase
      .from('batches')
      .select(`
        *,
        flock:flocks(flock_name, breed, age_weeks),
        machine:machines(machine_number, machine_type),
        unit:units(name),
        fertility_analysis(*),
        residue_analysis(*)
      `)
      .eq('id', batchId)
      .single();

    if (error || !batch) throw new Error('Batch not found');

    const pdf = new jsPDF();
    let yPos = 20;

    // Title
    pdf.setFontSize(20);
    pdf.text('House Performance Report', 105, yPos, { align: 'center' });
    yPos += 15;

    // Subtitle
    pdf.setFontSize(12);
    pdf.setTextColor(100);
    pdf.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 105, yPos, { align: 'center' });
    yPos += 20;

    // House Info Section
    pdf.setTextColor(0);
    pdf.setFontSize(14);
    pdf.text('House Information', 20, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    const info = [
      ['House Number:', batch.batch_number],
      ['Flock:', (batch.flock as any)?.flock_name || 'N/A'],
      ['Breed:', (batch.flock as any)?.breed || 'N/A'],
      ['Machine:', (batch.machine as any)?.machine_number || 'N/A'],
      ['Hatchery:', (batch.unit as any)?.name || 'N/A'],
      ['Set Date:', format(new Date(batch.set_date), 'MMM dd, yyyy')],
      ['Expected Hatch:', format(new Date(batch.expected_hatch_date), 'MMM dd, yyyy')],
      ['Status:', batch.status.toUpperCase()],
    ];

    info.forEach(([label, value]) => {
      pdf.text(label, 25, yPos);
      pdf.text(value, 80, yPos);
      yPos += 7;
    });
    yPos += 10;

    // Production Metrics
    pdf.setFontSize(14);
    pdf.text('Production Metrics', 20, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    const metrics = [
      ['Total Eggs Set:', batch.total_eggs_set.toLocaleString()],
      ['Eggs Injected:', batch.eggs_injected.toLocaleString()],
      ['Chicks Hatched:', batch.chicks_hatched.toLocaleString()],
      ['Eggs Cleared:', (batch.eggs_cleared || 0).toLocaleString()],
    ];

    metrics.forEach(([label, value]) => {
      pdf.text(label, 25, yPos);
      pdf.text(value, 80, yPos);
      yPos += 7;
    });
    yPos += 10;

    // Fertility Analysis
    const fertility = batch.fertility_analysis;
    if (fertility) {
      pdf.setFontSize(14);
      pdf.text('Fertility Analysis', 20, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      const fertMetrics = [
        ['Fertility %:', `${fertility.fertility_percent || 0}%`],
        ['Hatch %:', `${fertility.hatch_percent || 0}%`],
        ['HOF %:', `${fertility.hof_percent || 0}%`],
        ['HOI %:', `${fertility.hoi_percent || 0}%`],
      ];

      fertMetrics.forEach(([label, value]) => {
        pdf.text(label, 25, yPos);
        pdf.text(value, 80, yPos);
        yPos += 7;
      });
      yPos += 10;
    }

    // Residue Analysis
    const residue = batch.residue_analysis;
    if (residue) {
      pdf.setFontSize(14);
      pdf.text('Residue Analysis', 20, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      const residueMetrics = [
        ['Sample Size:', (residue.sample_size || 648).toString()],
        ['Infertile:', (residue.infertile_eggs || 0).toString()],
        ['Early Dead:', (residue.early_dead || 0).toString()],
        ['Mid Dead:', (residue.mid_dead || 0).toString()],
        ['Late Dead:', (residue.late_dead || 0).toString()],
        ['Culls:', (residue.cull_chicks || 0).toString()],
        ['Live Pips:', (residue.live_pip_number || 0).toString()],
        ['Dead Pips:', (residue.dead_pip_number || 0).toString()],
      ];

      residueMetrics.forEach(([label, value]) => {
        pdf.text(label, 25, yPos);
        pdf.text(value, 80, yPos);
        yPos += 7;
      });
    }

    return pdf.output('blob');
  }

  static async generateWeeklyReport(startDate: string, endDate: string): Promise<Blob> {
    // Fetch data for the week
    const { data: batches } = await supabase
      .from('batches')
      .select(`
        *,
        flock:flocks(flock_name),
        residue_analysis(*)
      `)
      .gte('set_date', startDate)
      .lte('set_date', endDate)
      .order('set_date', { ascending: false });

    const pdf = new jsPDF();
    let yPos = 20;

    // Title
    pdf.setFontSize(20);
    pdf.text('Weekly Hatchery Report', 105, yPos, { align: 'center' });
    yPos += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(100);
    pdf.text(`${format(new Date(startDate), 'MMM dd')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`, 105, yPos, { align: 'center' });
    yPos += 20;

    // Summary
    pdf.setTextColor(0);
    pdf.setFontSize(14);
    pdf.text('Summary', 20, yPos);
    yPos += 10;

    const totalBatches = batches?.length || 0;
    const totalEggsSet = batches?.reduce((sum, b) => sum + (b.total_eggs_set || 0), 0) || 0;
    const totalChicks = batches?.reduce((sum, b) => sum + (b.chicks_hatched || 0), 0) || 0;
    const avgHatch = totalEggsSet > 0 ? ((totalChicks / totalEggsSet) * 100).toFixed(1) : '0';

    pdf.setFontSize(10);
    const summary = [
      ['Total Houses Set:', totalBatches.toString()],
      ['Total Eggs Set:', totalEggsSet.toLocaleString()],
      ['Total Chicks Hatched:', totalChicks.toLocaleString()],
      ['Average Hatch Rate:', `${avgHatch}%`],
    ];

    summary.forEach(([label, value]) => {
      pdf.text(label, 25, yPos);
      pdf.text(value, 80, yPos);
      yPos += 7;
    });
    yPos += 15;

    // Houses List
    if (batches && batches.length > 0) {
      pdf.setFontSize(14);
      pdf.text('Houses This Week', 20, yPos);
      yPos += 10;

      pdf.setFontSize(9);
      // Headers
      const headers = ['House', 'Flock', 'Set Date', 'Eggs', 'Status'];
      const colWidths = [40, 40, 30, 30, 30];
      let xPos = 20;
      
      headers.forEach((header, i) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(header, xPos, yPos);
        xPos += colWidths[i];
      });
      yPos += 7;

      // Rows
      pdf.setFont('helvetica', 'normal');
      batches.slice(0, 15).forEach(batch => {
        xPos = 20;
        const row = [
          batch.batch_number.substring(0, 20),
          ((batch.flock as any)?.flock_name || 'N/A').substring(0, 20),
          format(new Date(batch.set_date), 'MMM dd'),
          batch.total_eggs_set.toLocaleString(),
          batch.status
        ];
        row.forEach((cell, i) => {
          pdf.text(cell, xPos, yPos);
          xPos += colWidths[i];
        });
        yPos += 6;
      });
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 20, 285);

    return pdf.output('blob');
  }

  static downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
