import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, X } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import type { UserProjectData } from '@/hooks/useUserProject';
import type { DeliveryData } from '@/components/dashboard/DeliveryCard';

// ─── Mock deliveries ────────────────────────────────────────────────────────
const MOCK_DELIVERIES: DeliveryData[] = [
  {
    id: 'mock-1',
    title: 'Vídeo: Como aumentar engajamento no Instagram',
    description: 'Reels de 60s com legendas e cortes dinâmicos',
    delivery_type: 'instagram_video',
    status: 'queue',
    due_date: new Date(Date.now() + 48 * 3600000).toISOString(),
    revision_count: 0,
    max_revisions: 2,
    file_url: null,
    thumbnail_url: null,
    editor_name: null,
    editor_id: null,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    delivered_at: null,
    approved_at: null,
    revision_notes: null,
    user_project_id: 'mock-project',
    raw_file_url: null,
    raw_drive_link: null,
    client_notes: null,
    is_exception: false,
    exception_notes: null,
  },
  {
    id: 'mock-2',
    title: 'Vídeo: Tutorial de produto — unboxing e review',
    description: 'Vídeo longo para YouTube com intro animada',
    delivery_type: 'youtube_video',
    status: 'in_progress',
    due_date: new Date(Date.now() + 24 * 3600000).toISOString(),
    revision_count: 0,
    max_revisions: 2,
    file_url: null,
    thumbnail_url: null,
    editor_name: 'Editor Demo',
    editor_id: 'mock-editor',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    delivered_at: null,
    approved_at: null,
    revision_notes: null,
    user_project_id: 'mock-project',
    raw_file_url: null,
    raw_drive_link: null,
    client_notes: 'Incluir intro animada',
    is_exception: false,
    exception_notes: null,
  },
  {
    id: 'mock-3',
    title: 'Thumbnail: Pack de 5 capas para YouTube',
    description: null,
    delivery_type: 'thumbnail',
    status: 'review',
    due_date: new Date(Date.now() + 6 * 3600000).toISOString(),
    revision_count: 1,
    max_revisions: 2,
    file_url: null,
    thumbnail_url: null,
    editor_name: 'Editor Demo',
    editor_id: 'mock-editor',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    delivered_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    approved_at: null,
    revision_notes: null,
    user_project_id: 'mock-project',
    raw_file_url: null,
    raw_drive_link: null,
    client_notes: null,
    is_exception: false,
    exception_notes: null,
  },
  {
    id: 'mock-4',
    title: 'Vídeo: Reels — 3 peças para campanha de lançamento',
    description: null,
    delivery_type: 'instagram_video',
    status: 'approved',
    due_date: new Date(Date.now() - 12 * 3600000).toISOString(),
    revision_count: 0,
    max_revisions: 2,
    file_url: null,
    thumbnail_url: null,
    editor_name: 'Editor Demo',
    editor_id: 'mock-editor',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    delivered_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    approved_at: new Date(Date.now() - 86400000).toISOString(),
    revision_notes: null,
    user_project_id: 'mock-project',
    raw_file_url: null,
    raw_drive_link: null,
    client_notes: 'Ficou ótimo!',
    is_exception: false,
    exception_notes: null,
  },
];

// ─── Mock projects by plan ──────────────────────────────────────────────────
const baseMock = {
  id: 'mock-project',
  user_id: 'mock-user',
  youtube_reserved: 1,
  youtube_approved: 2,
  instagram_reserved: 0,
  instagram_approved: 1,
  thumbnails_reserved: 1,
  thumbnails_approved: 3,
  covers_reserved: 0,
  covers_approved: 0,
  captures_reserved: 0,
  captures_approved: 0,
  current_period_start: new Date(Date.now() - 15 * 86400000).toISOString(),
  current_period_end: new Date(Date.now() + 15 * 86400000).toISOString(),
  stripe_subscription_id: null,
  tour_completed: true,
  studio_access: false,
  subscription_slug: null,
  custom_slug: null,
  monthly_quota: null,
  
};

const MOCK_PROJECTS: Record<string, UserProjectData> = {
  custom: {
    ...baseMock,
    client_type: 'custom',
    status: 'active',
    subscription_tier: null,
    sla_hours: 48,
    custom_project: {
      id: 'mock-cp',
      project_name: 'Projeto Demo',
      description: null,
      youtube_videos: 4,
      instagram_videos: 4,
      include_thumbnails: true,
      include_covers: false,
      include_script: false,
      include_capture: false,
      max_captures: 0,
      monthly_value: 1500,
      payment_frequency: 'monthly',
      max_revisions: 2,
      deadline: '48h',
      capture_lead_days: 30,
    },
  },
  standard: {
    ...baseMock,
    client_type: 'subscription',
    status: 'active',
    subscription_tier: 'standard',
    sla_hours: 72,
    monthly_quota: 7,
    custom_project: null,
    stripe_subscription_id: 'sub_mock',
  },
  pro: {
    ...baseMock,
    client_type: 'subscription',
    status: 'active',
    subscription_tier: 'pro',
    sla_hours: 48,
    monthly_quota: 11,
    custom_project: null,
    stripe_subscription_id: 'sub_mock',
  },
  business: {
    ...baseMock,
    client_type: 'subscription',
    status: 'active',
    subscription_tier: 'business',
    sla_hours: 24,
    monthly_quota: 22,
    custom_project: null,
    stripe_subscription_id: 'sub_mock',
  },
  premium: {
    ...baseMock,
    client_type: 'subscription',
    status: 'active',
    subscription_tier: 'premium',
    sla_hours: 8,
    monthly_quota: 66,
    custom_project: null,
    stripe_subscription_id: 'sub_mock',
  },
  influencer: {
    ...baseMock,
    client_type: 'influencer',
    status: 'active',
    subscription_tier: 'pro',
    sla_hours: 48,
    monthly_quota: 11,
    custom_project: null,
  },
  trialing: {
    ...baseMock,
    client_type: 'subscription',
    status: 'trialing',
    subscription_tier: 'standard',
    sla_hours: 72,
    monthly_quota: 7,
    custom_project: null,
    stripe_subscription_id: 'sub_mock',
    current_period_end: new Date(Date.now() + 5 * 86400000).toISOString(),
  },
};

const PLAN_LABELS: Record<string, string> = {
  custom: 'Custom',
  standard: 'Standard',
  pro: 'Pro',
  business: 'Business',
  premium: 'Premium',
  influencer: 'Influencer',
  trialing: 'Trial (Standard)',
};

export default function AdminPreview() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('standard');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Preview banner */}
      <div className="relative z-[60] flex items-center justify-between gap-4 px-4 py-2 bg-secondary border-b border-border flex-wrap">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <span className="text-sm font-bold text-foreground">
              Modo Preview — {PLAN_LABELS[selectedPlan]}
            </span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
              Dados de exemplo · nenhuma ação real
            </span>
          </div>
        </div>

        {/* Plan selector */}
        <div className="flex items-center gap-1 flex-wrap">
          {Object.keys(PLAN_LABELS).map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlan(plan)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedPlan === plan
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {PLAN_LABELS[plan]}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
          Sair
        </button>
      </div>

      {/* Dashboard with mock data */}
      <DashboardLayout
        isPreviewMode
        previewUserProject={MOCK_PROJECTS[selectedPlan]}
        previewDeliveries={MOCK_DELIVERIES}
      />
    </div>
  );
}
