import jsPDF from 'jspdf';
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

export class ReportService {
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
