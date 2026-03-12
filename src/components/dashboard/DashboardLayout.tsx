import { useState, useEffect } from 'react';
import Kanban from '@/components/dashboard/Kanban';
import DeliveryCalendar from '@/components/dashboard/DeliveryCalendar';
import DeliveryHistory from '@/components/dashboard/DeliveryHistory';
import ScriptGenerator from '@/components/dashboard/ScriptGenerator';
import SettingsComponent from '@/components/dashboard/Settings';
import NotificationBell from '@/components/shared/NotificationBell';
import ContextualTour, { restartTour } from '@/components/dashboard/ContextualTour';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  HelpCircle,
  Video,
  Calendar,
  CheckCircle2,
  FileText,
  Settings,
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
import { useIsMobile } from '@/hooks/use-mobile';

type DashboardTab = 'deliveries' | 'calendar' | 'history' | 'scripts' | 'settings';

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
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background px-3 md:px-4 md:h-14">
      <div className="flex items-center gap-2">
        {!isMobile && <SidebarTrigger className="mr-1" />}
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <Play className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-mono font-semibold tracking-tight">
            Video<span className="text-primary">Flow</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
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
            <Button variant="ghost" size="sm" className="ml-0.5 gap-1.5 px-1.5 h-9">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/15 text-[10px] font-mono text-primary">
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
              <Settings className="mr-2 h-4 w-4" /> Configuracoes
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
}: {
  activeTab: DashboardTab;
  setActiveTab: (t: DashboardTab) => void;
  navItems: NavItem[];
}) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    className={`cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-muted text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
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
  <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background safe-area-bottom">
    <div className="flex items-stretch">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[56px] ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground active:text-foreground'
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
            <span className={`text-[10px] font-mono tracking-wider leading-none ${
              isActive ? 'font-medium' : ''
            }`}>
              {item.shortLabel}
            </span>
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
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

  const navItems: NavItem[] = [
    { id: 'deliveries', label: 'Minhas Entregas', shortLabel: 'ENTREGAS', icon: Video },
    { id: 'calendar', label: 'Calendario', shortLabel: 'AGENDA', icon: Calendar },
    { id: 'history', label: 'Historico', shortLabel: 'HIST.', icon: CheckCircle2 },
    ...(userProject?.custom_project?.include_script
      ? [{ id: 'scripts' as DashboardTab, label: 'Roteiros', shortLabel: 'ROTEIRO', icon: FileText }]
      : []),
    { id: 'settings', label: 'Configuracoes', shortLabel: 'CONFIG', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return userProject ? (
          <Kanban userProject={userProject} />
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Video className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum projeto ativo</p>
          </div>
        );
      case 'calendar':
        return userProject ? (
          <DeliveryCalendar userProject={userProject} />
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum projeto ativo</p>
          </div>
        );
      case 'history':
        return <DeliveryHistory />;
      case 'scripts':
        return <ScriptGenerator />;
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
      <DashboardHeader />

      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} navItems={navItems} />
        )}

        <main className={`flex-1 overflow-y-auto p-3 md:p-6 space-y-4 ${isMobile ? 'pb-20' : ''}`}>
          {/* Quota Card */}
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : userProject ? (
            activeTab !== 'settings' && <QuotaCard userProject={userProject} />
          ) : (
            activeTab === 'deliveries' && (
              <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                Nenhum projeto ativo encontrado.
              </div>
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
      <div className="flex min-h-screen w-full flex-col bg-background">{mainContent}</div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
