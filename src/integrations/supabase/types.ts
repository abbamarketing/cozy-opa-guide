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
      custom_projects: {
        Row: {
          active: boolean
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
          logo_url: string | null
          outro_url: string | null
          preferred_music_style: string | null
          reference_channels: string[] | null
          target_audience: string | null
          updated_at: string
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
          logo_url?: string | null
          outro_url?: string | null
          preferred_music_style?: string | null
          reference_channels?: string[] | null
          target_audience?: string | null
          updated_at?: string
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
          logo_url?: string | null
          outro_url?: string | null
          preferred_music_style?: string | null
          reference_channels?: string[] | null
          target_audience?: string | null
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "client"
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
      user_project_status: [
        "pending_payment",
        "active",
        "suspended",
        "cancelled",
      ],
    },
  },
} as const
