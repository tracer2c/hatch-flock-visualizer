import { supabase } from '@/integrations/supabase/client';

type ActionType = 
  | 'login' 
  | 'logout' 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'mfa_setup' 
  | 'mfa_verify'
  | 'password_change' 
  | 'email_change' 
  | 'file_upload' 
  | 'file_delete'
  | 'bulk_import'
  | 'export';

type ActionCategory = 
  | 'auth' 
  | 'data_entry' 
  | 'management' 
  | 'qa' 
  | 'settings' 
  | 'file'
  | 'sync';

interface ActivityLogEntry {
  action_type: ActionType;
  action_category: ActionCategory;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  notes?: string;
}

class ActivityLogger {
  private sessionId: string;
  private queue: ActivityLogEntry[] = [];
  private isProcessing = false;
  private retryDelay = 1000;
  private maxRetries = 3;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getPagePath(): string {
    return typeof window !== 'undefined' ? window.location.pathname : '';
  }

  async log(entry: ActivityLogEntry): Promise<void> {
    // Add to queue and process
    this.queue.push(entry);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const entry = this.queue.shift();
      if (!entry) continue;

      try {
        await this.sendLog(entry);
      } catch (error) {
        console.warn('Failed to log activity:', error);
        // Don't re-queue to avoid infinite loops
      }
    }

    this.isProcessing = false;
  }

  private async sendLog(entry: ActivityLogEntry, retryCount = 0): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('log-activity', {
        body: {
          ...entry,
          session_id: this.sessionId,
          page_path: this.getPagePath(),
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      if (retryCount < this.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.sendLog(entry, retryCount + 1);
      }
      throw error;
    }
  }

  // Convenience methods for common actions
  async logLogin(): Promise<void> {
    return this.log({
      action_type: 'login',
      action_category: 'auth',
      notes: 'User logged in',
    });
  }

  async logLogout(): Promise<void> {
    return this.log({
      action_type: 'logout',
      action_category: 'auth',
      notes: 'User logged out',
    });
  }

  async logPasswordChange(): Promise<void> {
    return this.log({
      action_type: 'password_change',
      action_category: 'auth',
      notes: 'Password changed',
    });
  }

  async logMFASetup(): Promise<void> {
    return this.log({
      action_type: 'mfa_setup',
      action_category: 'auth',
      notes: 'MFA enabled',
    });
  }

  async logMFAVerify(): Promise<void> {
    return this.log({
      action_type: 'mfa_verify',
      action_category: 'auth',
      notes: 'MFA verified',
    });
  }

  async logCreate(
    resourceType: string,
    resourceId: string,
    resourceName: string,
    data: Record<string, any>,
    category: ActionCategory = 'data_entry'
  ): Promise<void> {
    return this.log({
      action_type: 'create',
      action_category: category,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      new_values: this.sanitizeData(data),
    });
  }

  async logUpdate(
    resourceType: string,
    resourceId: string,
    resourceName: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    category: ActionCategory = 'data_entry'
  ): Promise<void> {
    return this.log({
      action_type: 'update',
      action_category: category,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      old_values: this.sanitizeData(oldData),
      new_values: this.sanitizeData(newData),
    });
  }

  async logDelete(
    resourceType: string,
    resourceId: string,
    resourceName: string,
    data: Record<string, any>,
    category: ActionCategory = 'data_entry'
  ): Promise<void> {
    return this.log({
      action_type: 'delete',
      action_category: category,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      old_values: this.sanitizeData(data),
    });
  }

  async logFileUpload(fileName: string, fileUrl: string, recordType: string): Promise<void> {
    return this.log({
      action_type: 'file_upload',
      action_category: 'file',
      resource_type: recordType,
      resource_name: fileName,
      new_values: { file_url: fileUrl },
    });
  }

  async logBulkImport(resourceType: string, recordCount: number): Promise<void> {
    return this.log({
      action_type: 'bulk_import',
      action_category: 'data_entry',
      resource_type: resourceType,
      notes: `Imported ${recordCount} records`,
      new_values: { record_count: recordCount },
    });
  }

  async logExport(resourceType: string, format: string): Promise<void> {
    return this.log({
      action_type: 'export',
      action_category: 'data_entry',
      resource_type: resourceType,
      notes: `Exported to ${format}`,
    });
  }

  // Sanitize data to remove sensitive fields and limit size
  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'auth'];
    const maxValueLength = 500;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        continue;
      }

      // Truncate long strings
      if (typeof value === 'string' && value.length > maxValueLength) {
        sanitized[key] = value.substring(0, maxValueLength) + '...';
      } else if (typeof value === 'object' && value !== null) {
        // Stringify objects but limit size
        const str = JSON.stringify(value);
        if (str.length > maxValueLength) {
          sanitized[key] = '[Object too large]';
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// Export singleton instance
export const activityLogger = new ActivityLogger();
