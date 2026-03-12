import { useState } from 'react';
import Kanban from '@/components/dashboard/Kanban';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Bell,
  HelpCircle,
  Video,
  Calendar,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import QuotaCard from '@/components/dashboard/QuotaCard';
import { useIsMobile } from '@/hooks/use-mobile';

type DashboardTab = 'deliveries' | 'calendar' | 'scripts' | 'settings';

interface NavItem {
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  condition?: boolean;
}

/* ───── Header ───── */
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {!isMobile && <SidebarTrigger className="mr-1" />}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg gradient-neon flex items-center justify-center">
            <Play className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">
            Video<span className="text-primary">Flow</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="ml-1 gap-2 px-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-xs text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <span className="max-w-[120px] truncate text-xs text-card-foreground">
                  {profile?.full_name || 'Usuário'}
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

/* ───── Mobile Tabs ───── */
const MobileNav = ({
  activeTab,
  setActiveTab,
  navItems,
}: {
  activeTab: DashboardTab;
  setActiveTab: (t: DashboardTab) => void;
  navItems: NavItem[];
}) => (
  <div className="sticky top-14 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md px-2">
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DashboardTab)}>
      <TabsList className="w-full bg-transparent h-11">
        {navItems.map((item) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            className="flex-1 gap-1.5 text-xs data-[state=active]:bg-muted data-[state=active]:text-primary"
          >
            <item.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  </div>
);

/* ───── Main Layout ───── */
const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('deliveries');
  const { userProject, isLoading } = useUserProject();
  const isMobile = useIsMobile();

  const navItems: NavItem[] = [
    { id: 'deliveries', label: 'Minhas Entregas', icon: Video },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    ...(userProject?.custom_project?.include_script
      ? [{ id: 'scripts' as DashboardTab, label: 'Roteiros', icon: FileText }]
      : []),
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'deliveries':
        return userProject ? (
          <Kanban userProject={userProject} />
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Nenhum projeto ativo</p>
          </div>
        );
      case 'calendar':
        return userProject ? (
          <DeliveryCalendar userProject={userProject} />
        ) : (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Nenhum projeto ativo</p>
          </div>
        );
      case 'scripts':
        return (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Roteiros — em construção</p>
          </div>
        );
      case 'settings':
        return (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Configurações — em construção</p>
          </div>
        );
      default:
        return null;
    }
  };

  const mainContent = (
    <>
      <DashboardHeader />
      {isMobile && <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} navItems={navItems} />}

      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <DashboardSidebar activeTab={activeTab} setActiveTab={setActiveTab} navItems={navItems} />
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Quota Card */}
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : userProject ? (
            <QuotaCard userProject={userProject} />
          ) : (
            <div className="glass rounded-2xl p-6 text-center text-muted-foreground text-sm">
              Nenhum projeto ativo encontrado.
            </div>
          )}

          {/* Dynamic content */}
          {renderContent()}
        </main>
      </div>
    </>
  );

  if (isMobile) {
    // No sidebar provider needed for mobile
    return <div className="flex min-h-screen flex-col bg-background">{mainContent}</div>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">{mainContent}</div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
