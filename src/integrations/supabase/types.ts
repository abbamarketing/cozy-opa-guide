export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      capture_sessions: {
        Row: {
          address: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          delivery_id: string | null
          duration_minutes: number | null
          id: string
          location_name: string | null
          notes: string | null
          scheduled_date: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["capture_session_status"]
          updated_at: string
          user_project_id: string
        }
        Insert: {
          address?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          delivery_id?: string | null
          duration_minutes?: number | null
          id?: string
          location_name?: string | null
          notes?: string | null
          scheduled_date: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["capture_session_status"]
          updated_at?: string
          user_project_id: string
        }
        Update: {
          address?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          delivery_id?: string | null
          duration_minutes?: number | null
          id?: string
          location_name?: string | null
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["capture_session_status"]
          updated_at?: string
          user_project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_sessions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_sessions_user_project_id_fkey"
            columns: ["user_project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_projects: {
        Row: {
          active: boolean
          capture_lead_days: number
          created_at: string
          created_by: string
          deadline: Database["public"]["Enums"]["deadline_type"]
          description: string | null
          id: string
          include_capture: boolean
          include_covers: boolean
          include_script: boolean
          include_thumbnails: boolean
          instagram_videos: number
          max_captures: number
          max_revisions: number
          monthly_value: number
          payment_frequency: Database["public"]["Enums"]["payment_frequency_type"]
          project_name: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
          youtube_videos: number
        }
        Insert: {
          active?: boolean
          capture_lead_days?: number
          created_at?: string
          created_by: string
          deadline?: Database["public"]["Enums"]["deadline_type"]
          description?: string | null
          id?: string
          include_capture?: boolean
          include_covers?: boolean
          include_script?: boolean
          include_thumbnails?: boolean
          instagram_videos?: number
          max_captures?: number
          max_revisions?: number
          monthly_value: number
          payment_frequency?: Database["public"]["Enums"]["payment_frequency_type"]
          project_name: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
          youtube_videos?: number
        }
        Update: {
          active?: boolean
          capture_lead_days?: number
          created_at?: string
          created_by?: string
          deadline?: Database["public"]["Enums"]["deadline_type"]
          description?: string | null
          id?: string
          include_capture?: boolean
          include_covers?: boolean
          include_script?: boolean
          include_thumbnails?: boolean
          instagram_videos?: number
          max_captures?: number
          max_revisions?: number
          monthly_value?: number
          payment_frequency?: Database["public"]["Enums"]["payment_frequency_type"]
          project_name?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
          youtube_videos?: number
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          approved_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          description: string | null
          drive_link: string | null
          due_date: string | null
          editor_id: string | null
          file_url: string | null
          id: string
          max_revisions: number
          revision_count: number
          revision_notes: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_project_id: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          drive_link?: string | null
          due_date?: string | null
          editor_id?: string | null
          file_url?: string | null
          id?: string
          max_revisions?: number
          revision_count?: number
          revision_notes?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_project_id: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          description?: string | null
          drive_link?: string | null
          due_date?: string | null
          editor_id?: string | null
          file_url?: string | null
          id?: string
          max_revisions?: number
          revision_count?: number
          revision_notes?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "editors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_user_project_id_fkey"
            columns: ["user_project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_messages: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          message: string
          sender_id: string
          timestamp_marker: string | null
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          message: string
          sender_id: string
          timestamp_marker?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          message?: string
          sender_id?: string
          timestamp_marker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_messages_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_revisions: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          notes: string
          requested_by: string
          timestamp_marker: string | null
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          notes: string
          requested_by: string
          timestamp_marker?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          notes?: string
          requested_by?: string
          timestamp_marker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_revisions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_subtasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          delivery_id: string
          id: string
          name: string
          requires_approval: boolean
          sort_order: number
          status: Database["public"]["Enums"]["subtask_status"]
          template_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          delivery_id: string
          id?: string
          name: string
          requires_approval?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["subtask_status"]
          template_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          delivery_id?: string
          id?: string
          name?: string
          requires_approval?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["subtask_status"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_subtasks_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_subtasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_subtask_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      editors: {
        Row: {
          active_projects: number
          created_at: string
          display_name: string
          id: string
          max_concurrent_projects: number
          portfolio_url: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["editor_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active_projects?: number
          created_at?: string
          display_name: string
          id?: string
          max_concurrent_projects?: number
          portfolio_url?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["editor_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active_projects?: number
          created_at?: string
          display_name?: string
          id?: string
          max_concurrent_projects?: number
          portfolio_url?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["editor_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_briefings: {
        Row: {
          additional_notes: string | null
          brand_colors: Json | null
          brand_description: string | null
          brand_fonts: Json | null
          brand_name: string
          completed: boolean
          completed_at: string | null
          content_style: string | null
          created_at: string
          id: string
          intro_url: string | null
          jump_cuts: boolean | null
          legend_style: string | null
          logo_url: string | null
          outro_url: string | null
          preferred_music_style: string | null
          primary_color: string | null
          reference_channels: string[] | null
          remove_silences: boolean | null
          secondary_color: string | null
          target_audience: string | null
          updated_at: string
          use_emojis: boolean | null
          use_icons: boolean | null
          user_id: string
          user_project_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          brand_colors?: Json | null
          brand_description?: string | null
          brand_fonts?: Json | null
          brand_name: string
          completed?: boolean
          completed_at?: string | null
          content_style?: string | null
          created_at?: string
          id?: string
          intro_url?: string | null
          jump_cuts?: boolean | null
          legend_style?: string | null
          logo_url?: string | null
          outro_url?: string | null
          preferred_music_style?: string | null
          primary_color?: string | null
          reference_channels?: string[] | null
          remove_silences?: boolean | null
          secondary_color?: string | null
          target_audience?: string | null
          updated_at?: string
          use_emojis?: boolean | null
          use_icons?: boolean | null
          user_id: string
          user_project_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          brand_colors?: Json | null
          brand_description?: string | null
          brand_fonts?: Json | null
          brand_name?: string
          completed?: boolean
          completed_at?: string | null
          content_style?: string | null
          created_at?: string
          id?: string
          intro_url?: string | null
          jump_cuts?: boolean | null
          legend_style?: string | null
          logo_url?: string | null
          outro_url?: string | null
          preferred_music_style?: string | null
          primary_color?: string | null
          reference_channels?: string[] | null
          remove_silences?: boolean | null
          secondary_color?: string | null
          target_audience?: string | null
          updated_at?: string
          use_emojis?: boolean | null
          use_icons?: boolean | null
          user_id?: string
          user_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_briefings_user_project_id_fkey"
            columns: ["user_project_id"]
            isOneToOne: false
            referencedRelation: "user_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_project_id: string | null
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          onboarding_complete: boolean
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_project_id?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_project_id?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_project_id_fkey"
            columns: ["assigned_project_id"]
            isOneToOne: false
            referencedRelation: "custom_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_subtask_templates: {
        Row: {
          created_at: string
          custom_project_id: string
          delivery_types: string[]
          id: string
          is_active: boolean
          name: string
          requires_approval: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          custom_project_id: string
          delivery_types?: string[]
          id?: string
          is_active?: boolean
          name: string
          requires_approval?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          custom_project_id?: string
          delivery_types?: string[]
          id?: string
          is_active?: boolean
          name?: string
          requires_approval?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_subtask_templates_custom_project_id_fkey"
            columns: ["custom_project_id"]
            isOneToOne: false
            referencedRelation: "custom_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          level: string
          message: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_projects: {
        Row: {
          assigned_at: string
          captures_approved: number
          captures_reserved: number
          covers_approved: number
          covers_reserved: number
          created_at: string
          current_period_end: string
          current_period_start: string
          custom_project_id: string
          editor_id: string | null
          id: string
          instagram_approved: number
          instagram_reserved: number
          payment_confirmed_at: string | null
          status: Database["public"]["Enums"]["user_project_status"]
          stripe_subscription_id: string | null
          thumbnails_approved: number
          thumbnails_reserved: number
          tour_completed: boolean
          updated_at: string
          user_id: string
          youtube_approved: number
          youtube_reserved: number
        }
        Insert: {
          assigned_at?: string
          captures_approved?: number
          captures_reserved?: number
          covers_approved?: number
          covers_reserved?: number
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          custom_project_id: string
          editor_id?: string | null
          id?: string
          instagram_approved?: number
          instagram_reserved?: number
          payment_confirmed_at?: string | null
          status?: Database["public"]["Enums"]["user_project_status"]
          stripe_subscription_id?: string | null
          thumbnails_approved?: number
          thumbnails_reserved?: number
          tour_completed?: boolean
          updated_at?: string
          user_id: string
          youtube_approved?: number
          youtube_reserved?: number
        }
        Update: {
          assigned_at?: string
          captures_approved?: number
          captures_reserved?: number
          covers_approved?: number
          covers_reserved?: number
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          custom_project_id?: string
          editor_id?: string | null
          id?: string
          instagram_approved?: number
          instagram_reserved?: number
          payment_confirmed_at?: string | null
          status?: Database["public"]["Enums"]["user_project_status"]
          stripe_subscription_id?: string | null
          thumbnails_approved?: number
          thumbnails_reserved?: number
          tour_completed?: boolean
          updated_at?: string
          user_id?: string
          youtube_approved?: number
          youtube_reserved?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_projects_custom_project_id_fkey"
            columns: ["custom_project_id"]
            isOneToOne: false
            referencedRelation: "custom_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_projects_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "editors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reset_monthly_quotas: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "editor" | "client"
      capture_session_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
      deadline_type: "24h" | "48h" | "72h"
      delivery_status:
        | "pending"
        | "in_progress"
        | "review"
        | "revision"
        | "approved"
        | "cancelled"
      delivery_type: "youtube_video" | "instagram_video" | "thumbnail" | "cover"
      editor_status: "available" | "busy" | "inactive"
      payment_frequency_type: "monthly" | "quarterly" | "annual"
      subtask_status: "pending" | "in_progress" | "completed" | "approved"
      user_project_status:
        | "pending_payment"
        | "active"
        | "suspended"
        | "cancelled"
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
      app_role: ["admin", "editor", "client"],
      capture_session_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
      ],
      deadline_type: ["24h", "48h", "72h"],
      delivery_status: [
        "pending",
        "in_progress",
        "review",
        "revision",
        "approved",
        "cancelled",
      ],
      delivery_type: ["youtube_video", "instagram_video", "thumbnail", "cover"],
      editor_status: ["available", "busy", "inactive"],
      payment_frequency_type: ["monthly", "quarterly", "annual"],
      subtask_status: ["pending", "in_progress", "completed", "approved"],
      user_project_status: [
        "pending_payment",
        "active",
        "suspended",
        "cancelled",
      ],
    },
  },
} as const
