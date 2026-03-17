// 🎨 Design system: ver DESIGN_SYSTEM.md na raiz do projeto.
// Regras: cards p-4, text-sm para labels, ícones h-4 w-4, banners compactos em 1 linha.
import { useState, useEffect } from 'react';
import abbaLogo from '@/assets/abba-logo.png';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';
import Kanban from '@/components/dashboard/Kanban';
import DeliveryCalendar from '@/components/dashboard/DeliveryCalendar';
import UpgradeBanner from '@/components/dashboard/UpgradeBanner';
import { TrialBanner } from '@/components/dashboard/TrialBanner';
import { AffiliateStats } from '@/components/dashboard/AffiliateStats';
import DeliveryHistory from '@/components/dashboard/DeliveryHistory';

import BrandProfile from '@/components/dashboard/BrandProfile';
import SettingsComponent from '@/components/dashboard/Settings';

import NotificationBell from '@/components/shared/NotificationBell';
import ContextualTour, { restartTour } from '@/components/dashboard/ContextualTour';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  HelpCircle,
  Video,
  Calendar,
  CheckCircle2,
  Settings,
  Palette,
  LogOut,
  ChevronDown,
  
  Lock,
  Link2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { useUserProject, type UserProjectData } from '@/hooks/useUserProject';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import QuotaCard from '@/components/dashboard/QuotaCard';
import SubscriptionStatusCard from '@/components/dashboard/SubscriptionStatusCard';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DeliveryData } from '@/components/dashboard/DeliveryCard';
import { SupportChat } from '@/components/shared/SupportChat';

type DashboardTab = 'deliveries' | 'calendar' | 'history' | 'brand' | 'settings' | 'affiliate';

interface NavItem {
  id: DashboardTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  locked?: boolean;
}

interface DashboardLayoutProps {
  isPreviewMode?: boolean;
  previewUserProject?: UserProjectData;
  previewDeliveries?: DeliveryData[];
}

/* ───── Header (compact on mobile) ───── */
const DashboardHeader = ({ isPreviewMode }: { isPreviewMode?: boolean }) => {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const initials = isPreviewMode
    ? 'CD'
    : profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const displayName = isPreviewMode ? 'Cliente Demo' : (profile?.full_name || 'Usuario');

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-abba-surface bg-abba-dark/90 backdrop-blur-lg px-3 md:px-4 md:h-14">
      <div className="flex items-center gap-2">
        {!isMobile && <SidebarTrigger className="mr-1" />}
        <div className="flex items-center gap-1.5">
           <img src={abbaLogo} alt="AbbaVideo" className="h-6 w-6 rounded-md" />
          <span className="text-sm font-sans font-bold tracking-tight">
            Abba<span className="text-primary">Video</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {!isPreviewMode && (
          <div className="glass-micro rounded-full">
            <NotificationBell />
          </div>
        )}
        {!isPreviewMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground glass-micro rounded-full" aria-label="Ajuda e tour">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={restartTour}>
                Reiniciar Tour
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-0.5 gap-1.5 px-1.5 h-9 glass-micro rounded-full">
              <Avatar className="h-6 w-6">
                <AvatarImage src={isPreviewMode ? undefined : (profile?.avatar_url || undefined)} />
                <AvatarFallback className="bg-primary/15 text-[10px] font-sans text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <span className="max-w-[100px] truncate text-xs text-foreground">
                  {displayName}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {!isPreviewMode && (
              <>
                <DropdownMenuItem onClick={() => navigate('/dashboard?tab=settings')}>
                  <Settings className="mr-2 h-4 w-4" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </>
            )}
            {isPreviewMode && (
              <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                Modo Preview — sem ações reais
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

/* ───── Desktop Sidebar ───── */
const DashboardSidebar = ({
  activeTab,
  onTabChange,
  navItems,
  userProject,
}: {
  activeTab: DashboardTab;
  onTabChange: (t: DashboardTab, locked?: boolean) => void;
  navItems: NavItem[];
  userProject: UserProjectData | null;
}) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="bg-abba-dark border-r border-abba-surface">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id} {...(item.id === 'calendar' ? { 'data-tour': 'nav-calendar' } : {})}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id, item.locked)}
                    className={`cursor-pointer relative rounded-xl ${
                      activeTab === item.id
                        ? 'bg-abba-surface text-abba-lime font-semibold'
                        : item.locked
                        ? 'text-white/30 hover:text-white/50 cursor-default'
                        : 'text-white/60 hover:bg-abba-surface/60'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && (
                      <span className="flex-1 font-sans">{item.label}</span>
                    )}
                    {!collapsed && item.locked && (
                      <Lock className="h-3 w-3 text-white/30 shrink-0" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && userProject && userProject.client_type === 'custom' && (
        <div className="mt-auto p-2 border-t border-abba-surface">
          <QuotaCard userProject={userProject} />
        </div>
      )}
      {!collapsed && userProject && (userProject.client_type === 'subscription' || userProject.client_type === 'influencer') && (
        <div className="mt-auto p-2 border-t border-abba-surface space-y-2">
          {userProject.status === 'trialing' && (
            <TrialBanner
              trialEndDate={userProject.current_period_end}
              onUpgrade={() => window.location.href = '/payment'}
            />
          )}
          <SubscriptionStatusCard userProject={userProject} />
          {userProject?.client_type !== 'influencer' && <UpgradeBanner userProject={userProject} />}
        </div>
      )}
    </Sidebar>
  );
};

/* ───── Mobile Bottom Nav ───── */
const MobileBottomNav = ({
  activeTab,
  onTabChange,
  navItems,
}: {
  activeTab: DashboardTab;
  onTabChange: (t: DashboardTab, locked?: boolean) => void;
  navItems: NavItem[];
}) => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-abba-surface bg-abba-dark/95 backdrop-blur-lg safe-area-bottom">
    <div className="flex items-stretch">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id, item.locked)}
            {...(item.id === 'calendar' ? { 'data-tour': 'nav-calendar' } : {})}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[56px] ${
              isActive
                ? 'text-abba-lime'
                : item.locked
                ? 'text-white/20'
                : 'text-muted-foreground active:text-foreground'
            }`}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.locked && (
                <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-white/40" />
              )}
            </div>
            <span className="text-[10px] font-sans font-semibold tracking-wider leading-none">
              {item.shortLabel}
            </span>
            {isActive && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-abba-lime" />
            )}
          </button>
        );
      })}
    </div>
  </nav>
);

/* ───── Main Layout ───── */
const DashboardLayout = ({ isPreviewMode, previewUserProject, previewDeliveries }: DashboardLayoutProps) => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as DashboardTab | null;
  const { userProject: hookUserProject, isLoading: hookIsLoading } = useUserProject();
  const { isGod, loading: roleLoading } = useRole();
  const isMobile = useIsMobile();

  const userProject = isPreviewMode ? (previewUserProject ?? null) : hookUserProject;
  const isLoading = isPreviewMode ? false : hookIsLoading;

  const [activeTab, setActiveTab] = useState<DashboardTab>(tabFromUrl || 'deliveries');
  const [lockedTabAttempt, setLockedTabAttempt] = useState<DashboardTab | null>(null);

  // Sync tab da URL
  useEffect(() => {
    const valid: DashboardTab[] = ['deliveries', 'calendar', 'history', 'brand', 'settings', 'affiliate'];
    if (tabFromUrl && valid.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Redirect to waiting if no project — god bypasses, preview bypasses
  if (!isPreviewMode && !isLoading && !roleLoading && !userProject && !isGod()) {
    return <Navigate to="/waiting" replace />;
  }

  const handleTabChange = (tab: DashboardTab, locked?: boolean) => {
    if (locked) {
      setLockedTabAttempt(tab);
      return;
    }
    setActiveTab(tab);
    setLockedTabAttempt(null);
  };

   const navItems: NavItem[] = [
      { id: 'deliveries', label: 'Minhas Entregas', shortLabel: 'ENTREGAS', icon: Video },
      { id: 'calendar', label: 'Calendário', shortLabel: 'AGENDA', icon: Calendar },
      { id: 'history', label: 'Histórico', shortLabel: 'HIST.', icon: CheckCircle2 },
      { id: 'brand', label: 'Minha Marca', shortLabel: 'MARCA', icon: Palette },
      ...(userProject?.client_type === 'influencer'
        ? [{ id: 'affiliate' as DashboardTab, label: 'Afiliados', shortLabel: 'AFIL.', icon: Link2 }]
        : []),
      { id: 'settings', label: 'Configurações', shortLabel: 'CONFIG', icon: Settings },
    ];

  const renderContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return userProject ? (
          <Kanban userProject={userProject} mockDeliveries={isPreviewMode ? previewDeliveries : undefined} />
        ) : (
          <div className="rounded-[20px] border border-border bg-card p-5 text-center">
            <Video className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum projeto ativo</p>
          </div>
        );
      case 'calendar':
        return userProject ? (
          <DeliveryCalendar userProject={userProject} />
        ) : (
          <div className="rounded-[20px] border border-border bg-card p-5 text-center">
            <Calendar className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum projeto ativo</p>
          </div>
        );
      case 'history':
        return <DeliveryHistory />;
      case 'brand':
        return <BrandProfile />;
      case 'settings':
        return <SettingsComponent />;
      case 'affiliate':
        return <AffiliateStats />;
      default:
        return null;
    }
  };

  const tourReady = !isPreviewMode && !isLoading && !!userProject;

  const mainContent = (
    <>
      {!isPreviewMode && <ContextualTour ready={tourReady} />}

      {!isMobile && (
        <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} navItems={navItems} userProject={userProject} />
      )}

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <DashboardHeader isPreviewMode={isPreviewMode} />

        <main className={`flex-1 overflow-y-auto min-w-0 p-3 md:p-6 space-y-4 ${isMobile ? 'pb-20' : ''}`}>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-[20px]" />
              <Skeleton className="h-48 w-full rounded-[20px]" />
              <Skeleton className="h-48 w-full rounded-[20px]" />
            </div>
          ) : (
            <>
              {isMobile && userProject && activeTab !== 'settings' && (
                <>
                  {userProject.client_type === 'custom' && <QuotaCard userProject={userProject} />}
                  {(userProject.client_type === 'subscription' || userProject.client_type === 'influencer') && (
                    <>
                      {userProject.status === 'trialing' && (
                        <TrialBanner
                          trialEndDate={userProject.current_period_end}
                          onUpgrade={() => window.location.href = '/payment'}
                        />
                      )}
                      <SubscriptionStatusCard userProject={userProject} />
                      {userProject?.client_type !== 'influencer' && <UpgradeBanner userProject={userProject} />}
                    </>
                  )}
                </>
              )}
              {renderContent()}
            </>
          )}
        </main>
      </div>

      {isMobile && (
        <MobileBottomNav activeTab={activeTab} onTabChange={handleTabChange} navItems={navItems} />
      )}

      {/* Upsell overlay for locked tabs */}
      {lockedTabAttempt && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setLockedTabAttempt(null)}
        >
          <div
            className="w-full max-w-sm rounded-[24px] bg-abba-surface p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-[16px] bg-abba-lime p-5 text-abba-dark">
              <div
                className="absolute right-[-20px] top-[-20px] w-24 h-24 rounded-full border-[16px] border-black/10"
                style={{ boxShadow: '0 0 0 14px rgba(0,0,0,0.06), 0 0 0 30px rgba(0,0,0,0.03)' }}
              />
              <Lock className="h-6 w-6 mb-3 opacity-60" />
              <p className="text-[13px] font-semibold uppercase tracking-widest opacity-60 mb-1">
                Funcionalidade bloqueada
              </p>
              <p className="text-[22px] font-extrabold leading-tight tracking-tight">
                Isso faz parte<br />
                <span className="italic font-light">da assinatura</span>
              </p>
            </div>

            <p className="text-[13px] text-white/60 leading-relaxed">
              Com um plano de assinatura você envia o bruto, a gente edita e entrega seus Reels, Shorts e TikToks toda semana — com SLA garantido.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => window.open('/', '_blank')}
                className="w-full bg-abba-lime text-abba-dark font-bold rounded-full py-3 text-sm hover:opacity-90 transition-colors"
              >
                Ver planos de assinatura →
              </button>
              <button
                onClick={() => setLockedTabAttempt(null)}
                className="w-full text-white/40 text-sm py-2 hover:text-white/60 transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {mainContent}
        <SupportChat role="client" />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
