import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { ReportRow } from '@/hooks/useManagementReportData';

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

export type ManagementReportType = 'house' | 'fertility' | 'comparison';

export interface ManagementReportPdfOptions {
  type: ManagementReportType;
  title: string;
  dateRange: string;
  hatcheryScope: string;
  companyName: string;
  userName: string;
  generatedAt: string;
  rows: ReportRow[];
  previousRows: ReportRow[];
  summary: string[];
}

const REPORT_COLORS = {
  ink: [36, 54, 75] as const,
  muted: [100, 116, 139] as const,
  line: [203, 213, 225] as const,
  soft: [231, 237, 243] as const,
  red: [185, 28, 28] as const,
  green: [21, 128, 61] as const,
  orange: [221, 85, 12] as const,
};

const pct = (value: number | null | undefined) => value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)}%`;
const int = (value: number | null | undefined) => Math.round(value || 0).toLocaleString();

function totals(rows: ReportRow[]) {
  const eggsSet = rows.reduce((sum, row) => sum + row.eggsSet, 0);
  const chicksHatched = rows.reduce((sum, row) => sum + row.chicksHatched, 0);
  const fertilitySample = rows.reduce((sum, row) => sum + row.fertilitySample, 0);
  const fertileEggs = rows.reduce((sum, row) => sum + row.fertileEggs, 0);
  const residueSample = rows.reduce((sum, row) => sum + row.residueSample, 0);
  const contaminatedEggs = rows.reduce((sum, row) => sum + row.contaminatedEggs, 0);
  const lateDead = rows.reduce((sum, row) => sum + row.lateDead, 0);
  const earlyDead = rows.reduce((sum, row) => sum + row.earlyDead, 0);
  const upsideDown = rows.reduce((sum, row) => sum + row.upsideDown, 0);
  return {
    eggsSet,
    chicksHatched,
    fertilitySample,
    fertileEggs,
    residueSample,
    contaminatedEggs,
    lateDead,
    earlyDead,
    upsideDown,
    fertilityPercent: fertilitySample > 0 ? (fertileEggs / fertilitySample) * 100 : null,
    contaminationPercent: residueSample > 0 ? (contaminatedEggs / residueSample) * 100 : null,
    lateDeadPercent: residueSample > 0 ? (lateDead / residueSample) * 100 : null,
    hatchPercent: eggsSet > 0 ? (chicksHatched / eggsSet) * 100 : null,
  };
}

function deltaLabel(current: number | null | undefined, previous: number | null | undefined, inverse = false) {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return { label: '—', tone: 'neutral' as const };
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) return { label: '→ 0.0', tone: 'neutral' as const };
  const good = inverse ? delta < 0 : delta > 0;
  return { label: `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}`, tone: good ? 'good' as const : 'bad' as const };
}

function sameGroupRows(previousRows: ReportRow[], row: ReportRow) {
  return previousRows.filter((prior) => prior.flockId === row.flockId && prior.houseNumber === row.houseNumber && prior.unitId === row.unitId);
}

function relationField(relation: unknown, field: string) {
  const value = Array.isArray(relation) ? relation[0] : relation;
  if (!value || typeof value !== 'object') return undefined;
  const fieldValue = (value as Record<string, unknown>)[field];
  return typeof fieldValue === 'string' || typeof fieldValue === 'number' ? String(fieldValue) : undefined;
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
      ['Flock:', relationField(batch.flock, 'flock_name') || 'N/A'],
      ['Breed:', relationField(batch.flock, 'breed') || 'N/A'],
      ['Machine:', relationField(batch.machine, 'machine_number') || 'N/A'],
      ['Hatchery:', relationField(batch.unit, 'name') || 'N/A'],
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
          (relationField(batch.flock, 'flock_name') || 'N/A').substring(0, 20),
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

  static generateManagementReportPdf(opts: ManagementReportPdfOptions): Blob {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const setColor = (color: readonly [number, number, number]) => pdf.setTextColor(color[0], color[1], color[2]);
    const setFill = (color: readonly [number, number, number]) => pdf.setFillColor(color[0], color[1], color[2]);
    const ensureRoom = (needed: number) => {
      if (y + needed <= pageHeight - margin) return;
      pdf.addPage();
      y = margin;
      drawPageHeader(false);
    };
    const drawPageHeader = (firstPage: boolean) => {
      setColor(REPORT_COLORS.ink);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(firstPage ? 17 : 11);
      pdf.text(firstPage ? opts.title : `${opts.title} continued`, margin, y + 4);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      setColor(REPORT_COLORS.muted);
      pdf.text(opts.companyName || 'Hatchery Pro', pageWidth - margin, y + 4, { align: 'right' });
      y += firstPage ? 9 : 7;
      pdf.setDrawColor(...REPORT_COLORS.line);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;
    };
    const drawMeta = () => {
      const meta = [
        ['Date range', opts.dateRange],
        ['Hatchery scope', opts.hatcheryScope],
        ['Printed by', opts.userName || 'Not recorded'],
        ['Generated', opts.generatedAt],
      ];
      const boxWidth = contentWidth / meta.length;
      setFill(REPORT_COLORS.soft);
      pdf.rect(margin, y, contentWidth, 17, 'F');
      meta.forEach(([label, value], index) => {
        const x = margin + index * boxWidth + 3;
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        setColor(REPORT_COLORS.muted);
        pdf.text(label.toUpperCase(), x, y + 6);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        setColor(REPORT_COLORS.ink);
        pdf.text(String(value), x, y + 12, { maxWidth: boxWidth - 6 });
      });
      y += 22;
    };
    const drawSummary = () => {
      ensureRoom(30);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      setColor(REPORT_COLORS.ink);
      pdf.text('Summary', margin, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      opts.summary.slice(0, 4).forEach((line) => {
        const wrapped = pdf.splitTextToSize(`• ${line}`, contentWidth - 4);
        ensureRoom(wrapped.length * 4.4 + 1);
        setColor(REPORT_COLORS.ink);
        pdf.text(wrapped, margin + 2, y);
        y += wrapped.length * 4.4 + 1;
      });
      y += 2;
    };
    const drawKpis = () => {
      const current = totals(opts.rows);
      const previous = totals(opts.previousRows);
      const cards = [
        ['Eggs set', int(current.eggsSet), null],
        ['Weighted fertility', pct(current.fertilityPercent), deltaLabel(current.fertilityPercent, previous.fertilityPercent)],
        ['Residue contamination', pct(current.contaminationPercent), deltaLabel(current.contaminationPercent, previous.contaminationPercent, true)],
        ['Weekly hatch', pct(current.hatchPercent), deltaLabel(current.hatchPercent, previous.hatchPercent)],
      ];
      const gap = 3;
      const width = (contentWidth - gap * (cards.length - 1)) / cards.length;
      ensureRoom(24);
      cards.forEach(([label, value, trend], index) => {
        const x = margin + index * (width + gap);
        pdf.setDrawColor(...REPORT_COLORS.line);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(x, y, width, 20, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        setColor(REPORT_COLORS.muted);
        pdf.text(String(label).toUpperCase(), x + 3, y + 6);
        pdf.setFontSize(13);
        setColor(REPORT_COLORS.ink);
        pdf.text(String(value), x + 3, y + 14);
        if (trend) {
          const typedTrend = trend as ReturnType<typeof deltaLabel>;
          const color = typedTrend.tone === 'good' ? REPORT_COLORS.green : typedTrend.tone === 'bad' ? REPORT_COLORS.red : REPORT_COLORS.muted;
          pdf.setFontSize(8.5);
          setColor(color);
          pdf.text(typedTrend.label, x + width - 3, y + 14, { align: 'right' });
        }
      });
      y += 26;
    };
    const drawSectionTitle = (title: string) => {
      ensureRoom(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      setColor(REPORT_COLORS.ink);
      pdf.text(title, margin, y);
      y += 5;
    };
    const drawTable = (headers: string[], rows: string[][], widths: number[], aligns: Array<'left' | 'right'> = []) => {
      const rowHeight = 7;
      ensureRoom(rowHeight * 2);
      setFill(REPORT_COLORS.ink);
      pdf.rect(margin, y, contentWidth, rowHeight, 'F');
      let x = margin;
      headers.forEach((header, index) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.2);
        pdf.setTextColor(255, 255, 255);
        pdf.text(header, x + 1.5, y + 4.7, { maxWidth: widths[index] - 3 });
        x += widths[index];
      });
      y += rowHeight;
      rows.forEach((row, rowIndex) => {
        ensureRoom(rowHeight);
        if (rowIndex % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y, contentWidth, rowHeight, 'F');
        }
        x = margin;
        row.forEach((cell, index) => {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.1);
          setColor(REPORT_COLORS.ink);
          const align = aligns[index] || 'left';
          pdf.text(String(cell), align === 'right' ? x + widths[index] - 1.5 : x + 1.5, y + 4.7, {
            align,
            maxWidth: widths[index] - 3,
          });
          x += widths[index];
        });
        pdf.setDrawColor(...REPORT_COLORS.line);
        pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
        y += rowHeight;
      });
      y += 5;
    };
    const trendText = (row: ReportRow, metric: 'fertilityPercent' | 'hatchPercent' | 'contaminationPercent' | 'lateDeadPercent', inverse = false) => {
      const previous = totals(sameGroupRows(opts.previousRows, row));
      const trend = deltaLabel(row[metric], previous[metric], inverse);
      return trend.label;
    };

    drawPageHeader(true);
    drawMeta();
    drawSummary();
    drawKpis();

    if (opts.type === 'fertility') {
      drawSectionTitle('Combined fertility by flock and house');
      drawTable(
        ['Flock', 'House', 'Hatchery', 'Sample', 'Fertile', 'Fertility', 'Trend', 'Eggs set', 'Hatch'],
        opts.rows.map((row) => [row.flockNumber, row.houseNumber, row.unitName, int(row.fertilitySample), int(row.fertileEggs), pct(row.fertilityPercent), trendText(row, 'fertilityPercent'), int(row.eggsSet), pct(row.hatchPercent)]),
        [24, 20, 44, 22, 22, 22, 18, 26, 19],
        ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right'],
      );
    } else if (opts.type === 'comparison') {
      drawSectionTitle('Flock comparison');
      const groupTotals = Array.from(new Map(opts.rows.map((row) => [row.flockId, row])).keys()).map((id) => {
        const group = opts.rows.filter((row) => row.flockId === id);
        const first = group[0];
        return { first, values: totals(group), houses: new Set(group.map((row) => row.houseNumber)).size };
      });
      drawTable(
        ['Flock', 'Age', 'Houses', 'Eggs set', 'Fertility', 'Contam.', 'Late dead', 'Upside down', 'Early dead', 'Hatch'],
        groupTotals.map(({ first, values, houses }) => [first.flockNumber, first.ageWeeks == null ? '—' : `${first.ageWeeks} wk`, String(houses), int(values.eggsSet), pct(values.fertilityPercent), pct(values.contaminationPercent), pct(values.lateDeadPercent), int(values.upsideDown), int(values.earlyDead), pct(values.hatchPercent)]),
        [28, 18, 18, 26, 24, 22, 23, 27, 24, 21],
        ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
      );
      drawSectionTitle('House-level detail');
      drawTable(
        ['Flock', 'House', 'Hatchery', 'Eggs set', 'Fertility', 'Contam.', 'Late dead', 'Upside down', 'Early dead', 'Hatch'],
        opts.rows.map((row) => [row.flockNumber, row.houseNumber, row.unitName, int(row.eggsSet), pct(row.fertilityPercent), pct(row.contaminationPercent), pct(row.lateDeadPercent), int(row.upsideDown), int(row.earlyDead), pct(row.hatchPercent)]),
        [22, 18, 42, 26, 24, 22, 23, 27, 24, 21],
        ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
      );
    } else {
      drawSectionTitle('House performance detail');
      drawTable(
        ['Flock', 'Grower', 'House', 'Hatchery', 'Breed', 'Eggs set', 'Fertility', 'Contam.', 'Late dead', 'Upside down', 'Early dead', 'Hatch'],
        opts.rows.map((row) => [row.flockNumber, 'Not recorded', row.houseNumber, row.unitName, row.breed, int(row.eggsSet), pct(row.fertilityPercent), pct(row.contaminationPercent), pct(row.lateDeadPercent), int(row.upsideDown), int(row.earlyDead), pct(row.hatchPercent)]),
        [20, 25, 18, 34, 24, 23, 22, 20, 22, 23, 22, 19],
        ['left', 'left', 'left', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
      );
    }

    const pages = pdf.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      pdf.setPage(page);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      setColor(REPORT_COLORS.muted);
      pdf.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

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
