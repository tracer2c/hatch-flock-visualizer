export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      alert_configs: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          critical_days: number[] | null
          description: string | null
          id: string
          is_enabled: boolean
          maintenance_days_interval: number | null
          maintenance_hours_interval: number | null
          max_humidity: number | null
          max_temperature: number | null
          min_humidity: number | null
          min_temperature: number | null
          name: string
          reminder_hours_before: number | null
          updated_at: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          critical_days?: number[] | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          maintenance_days_interval?: number | null
          maintenance_hours_interval?: number | null
          max_humidity?: number | null
          max_temperature?: number | null
          min_humidity?: number | null
          min_temperature?: number | null
          name: string
          reminder_hours_before?: number | null
          updated_at?: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          critical_days?: number[] | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          maintenance_days_interval?: number | null
          maintenance_hours_interval?: number | null
          max_humidity?: number | null
          max_temperature?: number | null
          min_humidity?: number | null
          min_temperature?: number | null
          name?: string
          reminder_hours_before?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_config_id: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          batch_day: number | null
          batch_id: string | null
          created_at: string
          current_humidity: number | null
          current_temperature: number | null
          id: string
          machine_id: string | null
          message: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          triggered_at: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_config_id?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          batch_day?: number | null
          batch_id?: string | null
          created_at?: string
          current_humidity?: number | null
          current_temperature?: number | null
          id?: string
          machine_id?: string | null
          message: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          triggered_at?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_config_id?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          batch_day?: number | null
          batch_id?: string | null
          created_at?: string
          current_humidity?: number | null
          current_temperature?: number | null
          id?: string
          machine_id?: string | null
          message?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          triggered_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "alert_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          actual_hatch_date: string | null
          batch_number: string
          created_at: string
          expected_hatch_date: string
          flock_id: string
          humidity_avg: number | null
          id: string
          machine_id: string
          notes: string | null
          set_date: string
          status: Database["public"]["Enums"]["batch_status"]
          temperature_avg: number | null
          total_eggs_set: number
          updated_at: string
        }
        Insert: {
          actual_hatch_date?: string | null
          batch_number: string
          created_at?: string
          expected_hatch_date: string
          flock_id: string
          humidity_avg?: number | null
          id?: string
          machine_id: string
          notes?: string | null
          set_date: string
          status?: Database["public"]["Enums"]["batch_status"]
          temperature_avg?: number | null
          total_eggs_set: number
          updated_at?: string
        }
        Update: {
          actual_hatch_date?: string | null
          batch_number?: string
          created_at?: string
          expected_hatch_date?: string
          flock_id?: string
          humidity_avg?: number | null
          id?: string
          machine_id?: string
          notes?: string | null
          set_date?: string
          status?: Database["public"]["Enums"]["batch_status"]
          temperature_avg?: number | null
          total_eggs_set?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_flock_id_fkey"
            columns: ["flock_id"]
            isOneToOne: false
            referencedRelation: "flocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      egg_pack_quality: {
        Row: {
          batch_id: string
          cracked: number
          created_at: string
          dirty: number
          grade_a: number
          grade_b: number
          grade_c: number
          id: string
          inspection_date: string
          inspector_name: string | null
          large: number
          notes: string | null
          sample_size: number
          shell_thickness_avg: number | null
          small: number
          weight_avg: number | null
        }
        Insert: {
          batch_id: string
          cracked?: number
          created_at?: string
          dirty?: number
          grade_a?: number
          grade_b?: number
          grade_c?: number
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          large?: number
          notes?: string | null
          sample_size?: number
          shell_thickness_avg?: number | null
          small?: number
          weight_avg?: number | null
        }
        Update: {
          batch_id?: string
          cracked?: number
          created_at?: string
          dirty?: number
          grade_a?: number
          grade_b?: number
          grade_c?: number
          id?: string
          inspection_date?: string
          inspector_name?: string | null
          large?: number
          notes?: string | null
          sample_size?: number
          shell_thickness_avg?: number | null
          small?: number
          weight_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "egg_pack_quality_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      fertility_analysis: {
        Row: {
          analysis_date: string
          batch_id: string
          created_at: string
          cull_chicks: number
          early_dead: number
          fertile_eggs: number
          fertility_percent: number | null
          hatch_percent: number | null
          hof_percent: number | null
          id: string
          infertile_eggs: number
          late_dead: number
          notes: string | null
          sample_size: number
          technician_name: string | null
        }
        Insert: {
          analysis_date?: string
          batch_id: string
          created_at?: string
          cull_chicks?: number
          early_dead: number
          fertile_eggs: number
          fertility_percent?: number | null
          hatch_percent?: number | null
          hof_percent?: number | null
          id?: string
          infertile_eggs: number
          late_dead: number
          notes?: string | null
          sample_size?: number
          technician_name?: string | null
        }
        Update: {
          analysis_date?: string
          batch_id?: string
          created_at?: string
          cull_chicks?: number
          early_dead?: number
          fertile_eggs?: number
          fertility_percent?: number | null
          hatch_percent?: number | null
          hof_percent?: number | null
          id?: string
          infertile_eggs?: number
          late_dead?: number
          notes?: string | null
          sample_size?: number
          technician_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fertility_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      flocks: {
        Row: {
          age_weeks: number
          arrival_date: string
          breed: Database["public"]["Enums"]["breed_type"]
          created_at: string
          flock_name: string
          flock_number: number
          house_number: string | null
          id: string
          notes: string | null
          total_birds: number | null
          updated_at: string
        }
        Insert: {
          age_weeks: number
          arrival_date: string
          breed: Database["public"]["Enums"]["breed_type"]
          created_at?: string
          flock_name: string
          flock_number: number
          house_number?: string | null
          id?: string
          notes?: string | null
          total_birds?: number | null
          updated_at?: string
        }
        Update: {
          age_weeks?: number
          arrival_date?: string
          breed?: Database["public"]["Enums"]["breed_type"]
          created_at?: string
          flock_name?: string
          flock_number?: number
          house_number?: string | null
          id?: string
          notes?: string | null
          total_birds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      machines: {
        Row: {
          capacity: number
          created_at: string
          id: string
          last_maintenance: string | null
          location: string | null
          machine_number: string
          machine_type: Database["public"]["Enums"]["machine_type"]
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          last_maintenance?: string | null
          location?: string | null
          machine_number: string
          machine_type: Database["public"]["Enums"]["machine_type"]
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          last_maintenance?: string | null
          location?: string | null
          machine_number?: string
          machine_type?: Database["public"]["Enums"]["machine_type"]
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          browser_enabled: boolean
          created_at: string
          critical_day_alerts: boolean
          email_enabled: boolean
          humidity_alerts: boolean
          id: string
          maintenance_alerts: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          schedule_reminders: boolean
          temperature_alerts: boolean
          updated_at: string
          user_email: string
        }
        Insert: {
          browser_enabled?: boolean
          created_at?: string
          critical_day_alerts?: boolean
          email_enabled?: boolean
          humidity_alerts?: boolean
          id?: string
          maintenance_alerts?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          schedule_reminders?: boolean
          temperature_alerts?: boolean
          updated_at?: string
          user_email: string
        }
        Update: {
          browser_enabled?: boolean
          created_at?: string
          critical_day_alerts?: boolean
          email_enabled?: boolean
          humidity_alerts?: boolean
          id?: string
          maintenance_alerts?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          schedule_reminders?: boolean
          temperature_alerts?: boolean
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      qa_monitoring: {
        Row: {
          batch_id: string
          candling_results: string | null
          check_date: string
          check_time: string
          co2_level: number | null
          created_at: string
          day_of_incubation: number
          humidity: number
          id: string
          inspector_name: string
          mortality_count: number | null
          notes: string | null
          temperature: number
          turning_frequency: number | null
          ventilation_rate: number | null
        }
        Insert: {
          batch_id: string
          candling_results?: string | null
          check_date?: string
          check_time?: string
          co2_level?: number | null
          created_at?: string
          day_of_incubation: number
          humidity: number
          id?: string
          inspector_name: string
          mortality_count?: number | null
          notes?: string | null
          temperature: number
          turning_frequency?: number | null
          ventilation_rate?: number | null
        }
        Update: {
          batch_id?: string
          candling_results?: string | null
          check_date?: string
          check_time?: string
          co2_level?: number | null
          created_at?: string
          day_of_incubation?: number
          humidity?: number
          id?: string
          inspector_name?: string
          mortality_count?: number | null
          notes?: string | null
          temperature?: number
          turning_frequency?: number | null
          ventilation_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_monitoring_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      residue_analysis: {
        Row: {
          analysis_date: string
          batch_id: string
          contaminated_eggs: number
          created_at: string
          id: string
          lab_technician: string | null
          malformed_chicks: number
          microscopy_results: string | null
          notes: string | null
          pathology_findings: string | null
          pipped_not_hatched: number
          residue_percent: number | null
          total_residue_count: number
          unhatched_fertile: number
        }
        Insert: {
          analysis_date?: string
          batch_id: string
          contaminated_eggs?: number
          created_at?: string
          id?: string
          lab_technician?: string | null
          malformed_chicks?: number
          microscopy_results?: string | null
          notes?: string | null
          pathology_findings?: string | null
          pipped_not_hatched?: number
          residue_percent?: number | null
          total_residue_count: number
          unhatched_fertile?: number
        }
        Update: {
          analysis_date?: string
          batch_id?: string
          contaminated_eggs?: number
          created_at?: string
          id?: string
          lab_technician?: string | null
          malformed_chicks?: number
          microscopy_results?: string | null
          notes?: string | null
          pathology_findings?: string | null
          pipped_not_hatched?: number
          residue_percent?: number | null
          total_residue_count?: number
          unhatched_fertile?: number
        }
        Relationships: [
          {
            foreignKeyName: "residue_analysis_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      alert_status: "active" | "acknowledged" | "resolved" | "dismissed"
      alert_type:
        | "temperature"
        | "humidity"
        | "schedule_reminder"
        | "critical_day"
        | "machine_maintenance"
      batch_status:
        | "planned"
        | "setting"
        | "incubating"
        | "hatching"
        | "completed"
        | "cancelled"
      breed_type: "broiler" | "layer" | "breeder"
      machine_type: "setter" | "hatcher" | "combo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["info", "warning", "critical"],
      alert_status: ["active", "acknowledged", "resolved", "dismissed"],
      alert_type: [
        "temperature",
        "humidity",
        "schedule_reminder",
        "critical_day",
        "machine_maintenance",
      ],
      batch_status: [
        "planned",
        "setting",
        "incubating",
        "hatching",
        "completed",
        "cancelled",
      ],
      breed_type: ["broiler", "layer", "breeder"],
      machine_type: ["setter", "hatcher", "combo"],
    },
  },
} as const
