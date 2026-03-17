// =============================================
// Custom TypeScript types for AbbaVideo
// These complement the auto-generated Supabase types
// =============================================

// Status & Category types (mirror DB enums)
export type DeliveryStatus = 'pending' | 'queue' | 'in_progress' | 'review' | 'revision' | 'approved' | 'cancelled';
export type DeliveryType = 'youtube_video' | 'instagram_video' | 'thumbnail' | 'cover';
export type UserProjectStatus = 'pending_payment' | 'active' | 'suspended' | 'cancelled';
export type AppRole = 'admin' | 'editor' | 'client' | 'god';
export type EditorStatus = 'available' | 'busy' | 'inactive';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'annual';
export type DeadlineType = '24h' | '48h' | '72h';

// Profile
export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  company: string | null;
  onboarding_complete: boolean;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

// Custom Project (template created by admin)
export interface CustomProject {
  id: string;
  project_name: string;
  description: string | null;
  youtube_videos: number;
  instagram_videos: number;
  include_thumbnails: boolean;
  include_covers: boolean;
  include_script: boolean;
  include_capture: boolean;
  max_captures: number;
  capture_lead_days: number;
  monthly_value: number;
  payment_frequency: PaymentFrequency;
  max_revisions: number;
  deadline: DeadlineType;
  custom_slug: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// User Project (with joined custom project)
export interface UserProject {
  id: string;
  user_id: string;
  custom_project_id: string;
  editor_id: string | null;
  status: UserProjectStatus;
  stripe_subscription_id: string | null;
  payment_confirmed_at: string | null;
  youtube_reserved: number;
  instagram_reserved: number;
  thumbnails_reserved: number;
  covers_reserved: number;
  youtube_approved: number;
  instagram_approved: number;
  thumbnails_approved: number;
  covers_approved: number;
  captures_reserved: number;
  captures_approved: number;
  current_period_start: string;
  current_period_end: string;
  assigned_at: string;
  tour_completed: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  custom_project?: CustomProject;
}

// Delivery
export interface Delivery {
  id: string;
  user_project_id: string;
  editor_id: string | null;
  title: string;
  description: string | null;
  delivery_type: DeliveryType;
  status: DeliveryStatus;
  file_url: string | null;
  thumbnail_url: string | null;
  revision_count: number;
  max_revisions: number;
  revision_notes: string | null;
  due_date: string | null;
  delivered_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// Editor
export interface Editor {
  id: string;
  user_id: string;
  display_name: string;
  specialty: string | null;
  portfolio_url: string | null;
  status: EditorStatus;
  max_concurrent_projects: number;
  active_projects: number;
  created_at: string;
  updated_at: string;
}

// Onboarding Briefing
export interface OnboardingBriefing {
  id: string;
  user_id: string;
  user_project_id: string | null;
  brand_name: string;
  brand_description: string | null;
  target_audience: string | null;
  brand_colors: string[];
  brand_fonts: string[];
  logo_url: string | null;
  content_style: string | null;
  reference_channels: string[] | null;
  preferred_music_style: string | null;
  intro_url: string | null;
  outro_url: string | null;
  additional_notes: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// System Settings
export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

// Subtask types
export type SubtaskStatus = 'pending' | 'in_progress' | 'completed' | 'approved';
export type CaptureSessionStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

// Project Subtask Template (admin-defined per project)
export interface ProjectSubtaskTemplate {
  id: string;
  custom_project_id: string;
  name: string;
  delivery_types: string[];
  sort_order: number;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
}

// Delivery Subtask (instance per delivery)
export interface DeliverySubtask {
  id: string;
  delivery_id: string;
  template_id: string | null;
  name: string;
  status: SubtaskStatus;
  sort_order: number;
  requires_approval: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

// Capture Session (scheduling)
export interface CaptureSession {
  id: string;
  user_project_id: string;
  delivery_id: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number;
  location_name: string | null;
  address: string | null;
  notes: string | null;
  status: CaptureSessionStatus;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
