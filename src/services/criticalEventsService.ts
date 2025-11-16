import { addDays, differenceInDays } from 'date-fns';

export interface CriticalEvent {
  id: string;
  batchId: string;
  batchNumber: string;
  eventType: 'fertility_due' | 'fertility_overdue' | 'transfer_due' | 'transfer_overdue' | 'residue_due' | 'residue_overdue';
  eventDate: Date;
  status: 'upcoming' | 'due_today' | 'overdue';
  daysUntil: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  actionUrl: string;
}

export class CriticalEventsService {
  static calculateCriticalEvents(batches: any[]): CriticalEvent[] {
    const events: CriticalEvent[] = [];
    const today = new Date();
    
    batches.forEach(batch => {
      const setDate = new Date(batch.set_date);
      const daysSinceSet = differenceInDays(today, setDate);
      
      // Fertility Window (Days 10-14)
      const fertilityStartDate = addDays(setDate, 10);
      const fertilityEndDate = addDays(setDate, 14);
      const fertilityDaysUntil = differenceInDays(fertilityStartDate, today);
      
      if (!batch.fertility_analysis_completed) {
        if (daysSinceSet >= 10 && daysSinceSet <= 14) {
          events.push({
            id: `fertility-due-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'fertility_due',
            eventDate: fertilityStartDate,
            status: 'due_today',
            daysUntil: 0,
            severity: 'warning',
            message: `Fertility analysis due (Day ${daysSinceSet} of recommended 10-14 window)`,
            actionUrl: `/data-entry/fertility`
          });
        } else if (daysSinceSet > 14) {
          events.push({
            id: `fertility-overdue-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'fertility_overdue',
            eventDate: fertilityEndDate,
            status: 'overdue',
            daysUntil: daysSinceSet - 14,
            severity: 'error',
            message: `Fertility analysis overdue by ${daysSinceSet - 14} days`,
            actionUrl: `/data-entry/fertility`
          });
        } else if (fertilityDaysUntil <= 2 && fertilityDaysUntil > 0) {
          events.push({
            id: `fertility-upcoming-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'fertility_due',
            eventDate: fertilityStartDate,
            status: 'upcoming',
            daysUntil: fertilityDaysUntil,
            severity: 'info',
            message: `Fertility analysis recommended in ${fertilityDaysUntil} days (Day 10-14 window)`,
            actionUrl: `/data-entry/fertility`
          });
        }
      }
      
      // Transfer to Hatcher (Day 18)
      const transferDate = addDays(setDate, 18);
      const transferDaysUntil = differenceInDays(transferDate, today);
      
      if (!batch.transferred) {
        if (daysSinceSet === 18) {
          events.push({
            id: `transfer-due-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'transfer_due',
            eventDate: transferDate,
            status: 'due_today',
            daysUntil: 0,
            severity: 'warning',
            message: 'Transfer to hatcher due today (Day 18)',
            actionUrl: `/`
          });
        } else if (daysSinceSet > 18 && batch.status !== 'hatching') {
          events.push({
            id: `transfer-overdue-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'transfer_overdue',
            eventDate: transferDate,
            status: 'overdue',
            daysUntil: daysSinceSet - 18,
            severity: 'error',
            message: `Transfer overdue by ${daysSinceSet - 18} days`,
            actionUrl: `/`
          });
        } else if (transferDaysUntil <= 2 && transferDaysUntil > 0) {
          events.push({
            id: `transfer-upcoming-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'transfer_due',
            eventDate: transferDate,
            status: 'upcoming',
            daysUntil: transferDaysUntil,
            severity: 'info',
            message: `Transfer to hatcher expected in ${transferDaysUntil} days`,
            actionUrl: `/`
          });
        }
      }
      
      // Residue Analysis (Days 22-23)
      const residueStartDate = addDays(setDate, 22);
      const residueEndDate = addDays(setDate, 23);
      const residueDaysUntil = differenceInDays(residueStartDate, today);
      
      if (!batch.residue_analysis_completed) {
        if (daysSinceSet >= 22 && daysSinceSet <= 23) {
          events.push({
            id: `residue-due-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'residue_due',
            eventDate: residueStartDate,
            status: 'due_today',
            daysUntil: 0,
            severity: 'warning',
            message: `Residue analysis due (Day ${daysSinceSet} of recommended 22-23 window)`,
            actionUrl: `/data-entry/residue`
          });
        } else if (daysSinceSet > 23) {
          events.push({
            id: `residue-overdue-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'residue_overdue',
            eventDate: residueEndDate,
            status: 'overdue',
            daysUntil: daysSinceSet - 23,
            severity: 'error',
            message: `Residue analysis overdue by ${daysSinceSet - 23} days`,
            actionUrl: `/data-entry/residue`
          });
        } else if (residueDaysUntil <= 2 && residueDaysUntil > 0) {
          events.push({
            id: `residue-upcoming-${batch.id}`,
            batchId: batch.id,
            batchNumber: batch.batch_number,
            eventType: 'residue_due',
            eventDate: residueStartDate,
            status: 'upcoming',
            daysUntil: residueDaysUntil,
            severity: 'info',
            message: `Residue analysis recommended in ${residueDaysUntil} days`,
            actionUrl: `/data-entry/residue`
          });
        }
      }
    });
    
    return events.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.daysUntil - b.daysUntil;
    });
  }
}
