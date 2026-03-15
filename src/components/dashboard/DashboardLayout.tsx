import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Kanban from '@/components/dashboard/Kanban';
import DeliveryCalendar from '@/components/dashboard/DeliveryCalendar';
import DeliveryHistory from '@/components/dashboard/DeliveryHistory';
import ScriptGenerator from '@/components/dashboard/ScriptGenerator';
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
  FileText,
  Settings,
  Palette,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { useUserProject } from '@/hooks/useUserProject';
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

type DashboardTab = 'deliveries' | 'calendar' | 'history' | 'scripts' | 'brand' | 'settings';

interface NavItem {
  id: DashboardTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

/* ───── Header (compact on mobile) ───── */
const DashboardHeader = () => {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-abba-surface bg-abba-dark/90 backdrop-blur-lg px-3 md:px-4 md:h-14">
      <div className="flex items-center gap-2">
        {!isMobile && <SidebarTrigger className="mr-1" />}
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-md bg-abba-lime flex items-center justify-center">
            <Play className="h-3 w-3 text-[#111]" />
          </div>
          <span className="text-sm font-sans font-bold tracking-tight">
            Abba<span className="text-primary">Video</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <div className="glass-micro rounded-full">
          <NotificationBell />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground glass-micro rounded-full">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={restartTour}>
              Reiniciar Tour
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-0.5 gap-1.5 px-1.5 h-9 glass-micro rounded-full">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/15 text-[10px] font-sans text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <span className="max-w-[100px] truncate text-xs text-foreground">
                  {profile?.full_name || 'Usuario'}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => navigate('/dashboard?tab=settings')}>
              <Settings className="mr-2 h-4 w-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

/* ───── Desktop Sidebar ───── */
const DashboardSidebar = ({
  activeTab,
  setActiveTab,
  navItems,
  userProject,
}: {
  activeTab: DashboardTab;
  setActiveTab: (t: DashboardTab) => void;
  navItems: NavItem[];
  userProject: import('@/hooks/useUserProject').UserProjectData | null;
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
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    className={`cursor-pointer rounded-xl ${
                      activeTab === item.id
                        ? 'bg-abba-surface text-abba-lime font-semibold'
                        : 'text-white/60 hover:bg-abba-surface/60 rounded-xl'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span className="font-sans">{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* QuotaCard at sidebar bottom (desktop only) */}
      {!collapsed && userProject && userProject.client_type === 'custom' && (
        <div className="mt-auto p-2 border-t border-abba-surface">
          <QuotaCard userProject={userProject} />
        </div>
      )}
      {!collapsed && userProject && ['subscription', 'studio'].includes(userProject.client_type || '') && (
        <div className="mt-auto p-2 border-t border-abba-surface">
          {userProject.client_type === 'subscription' ? (
            <SubscriptionStatusCard userProject={userProject} />
          ) : (
            <QuotaCard userProject={userProject} />
          )}
        </div>
      )}
    </Sidebar>
  );
};

/* ───── Mobile Bottom Nav (fixed, always visible labels) ───── */
const MobileBottomNav = ({
  activeTab,
  setActiveTab,
  navItems,
}: {
  activeTab: DashboardTab;
  setActiveTab: (t: DashboardTab) => void;
  navItems: NavItem[];
}) => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-abba-surface bg-abba-dark/95 backdrop-blur-lg safe-area-bottom">
    <div className="flex items-stretch">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[56px] ${
              isActive
                ? 'text-abba-lime'
                : 'text-muted-foreground active:text-foreground'
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive ? 'text-abba-lime' : ''}`} />
            <span className={`text-[10px] font-sans font-semibold tracking-wider leading-none ${
              isActive ? '' : ''
            }`}>
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
const DashboardLayout = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as DashboardTab | null;
  const [activeTab, setActiveTab] = useState<DashboardTab>(tabFromUrl || 'deliveries');
  const { userProject, isLoading } = useUserProject();
  const isMobile = useIsMobile();

  // Sync tab from URL
  useEffect(() => {
    if (tabFromUrl && ['deliveries', 'calendar', 'history', 'scripts', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Redirect to root if no project (root handles WaitingForProject)
  if (!isLoading && !userProject) {
    return <Navigate to="/waiting" replace />;
  }

  const navItems: NavItem[] = [
    { id: 'deliveries', label: 'Minhas Entregas', shortLabel: 'ENTREGAS', icon: Video },
    { id: 'calendar', label: 'Calendário', shortLabel: 'AGENDA', icon: Calendar },
    { id: 'history', label: 'Histórico', shortLabel: 'HIST.', icon: CheckCircle2 },
    ...((userProject?.custom_project?.include_script || ['subscription', 'custom'].includes(userProject?.client_type || ''))
      ? [{ id: 'scripts' as DashboardTab, label: 'Roteiros', shortLabel: 'ROTEIRO', icon: FileText }]
      : []),
    { id: 'brand', label: 'Minha Marca', shortLabel: 'MARCA', icon: Palette },
    { id: 'settings', label: 'Configurações', shortLabel: 'CONFIG', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return userProject ? (
          <Kanban userProject={userProject} />
        ) : (
          <div className="rounded-[20px] border border-border bg-card p-8 text-center">
            <Video className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum projeto ativo</p>
          </div>
        );
      case 'calendar':
        return userProject ? (
          <DeliveryCalendar userProject={userProject} />
        ) : (
          <div className="rounded-[20px] border border-border bg-card p-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum projeto ativo</p>
          </div>
        );
      case 'history':
        return <DeliveryHistory />;
      case 'scripts':
        return <ScriptGenerator />;
      case 'brand':
        return <BrandProfile />;
      case 'settings':
        return <SettingsComponent />;
      default:
        return null;
    }
  };

  const tourReady = !isLoading && !!userProject;

  const mainContent = (
    <>
      <ContextualTour ready={tourReady} />

      {/* Desktop: sidebar + content side-by-side */}
      {!isMobile && (
        <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} navItems={navItems} userProject={userProject} />
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        <DashboardHeader />

        <main className={`flex-1 overflow-y-auto p-3 md:p-6 space-y-4 ${isMobile ? 'pb-20' : ''}`}>
          {/* Quota Card - mobile only (desktop shows in sidebar) */}
          {isMobile && (
            isLoading ? (
              <Skeleton className="h-12 w-full rounded-[20px]" />
            ) : userProject ? (
              activeTab !== 'settings' && (
                <>
                  {['custom', 'studio'].includes(userProject.client_type || '') && <QuotaCard userProject={userProject} />}
                  {userProject.client_type === 'subscription' && <SubscriptionStatusCard userProject={userProject} />}
                </>
              )
            ) : (
              activeTab === 'deliveries' && (
                <div className="rounded-[20px] bg-abba-surface p-4 text-center text-sm text-muted-foreground">
                  Nenhum projeto ativo encontrado.
                </div>
              )
            )
          )}

          {/* Dynamic content */}
          {renderContent()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} navItems={navItems} />
      )}
    </>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">{mainContent}</div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
