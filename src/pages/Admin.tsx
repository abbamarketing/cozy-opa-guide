import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Film, BarChart3, FolderKanban, ScrollText, Menu, CalendarDays } from 'lucide-react';
import abbaLogo from '@/assets/abba-logo.png';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import AdminOverview from '@/components/admin/AdminOverview';
import ClientAssignment from '@/components/admin/ClientAssignment';
import AdminClients from '@/components/admin/AdminClients';
import AdminDeliveries from '@/components/admin/AdminDeliveries';
import EditorManagement from '@/components/admin/EditorManagement';
import AdminMetrics from '@/components/admin/AdminMetrics';
import ProjectManager from '@/components/admin/ProjectManager';
import LogViewer from '@/components/admin/LogViewer';
import AdminCalendar from '@/components/admin/AdminCalendar';
import AdminTour, { restartAdminTour } from '@/components/admin/AdminTour';

import NotificationBell from '@/components/shared/NotificationBell';

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'entregas', label: 'Entregas', icon: Package },
  { id: 'editores', label: 'Editores', icon: Film },
  { id: 'metricas', label: 'Métricas', icon: BarChart3 },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban },
  { id: 'calendario', label: 'Calendário', icon: CalendarDays },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

const Admin = () => {
  const { signOut } = useAuth();
  const { isGod } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
    setMenuOpen(false);
  };

  const activeTabConfig = TABS.find((t) => t.id === activeTab) || TABS[0];
  const ActiveIcon = activeTabConfig.icon;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <AdminOverview />;
      case 'clientes': return <div className="space-y-10"><ClientAssignment /><AdminClients /></div>;
      case 'entregas': return <AdminDeliveries />;
      case 'editores': return <EditorManagement />;
      case 'metricas': return <AdminMetrics />;
      case 'projetos': return <ProjectManager />;
      case 'calendario': return <AdminCalendar />;
      case 'logs': return <LogViewer />;
      default: return <AdminOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminTour ready={true} />
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex items-center gap-2 border-b border-border/50 px-4 py-4">
                    <img src={abbaLogo} alt="AbbaVideo" className="h-7 w-7 rounded-lg" />
                    <span className="text-sm font-bold">
                      Abba<span className="text-primary">Video</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">Admin</span>
                  </div>
                  <nav className="flex flex-col gap-0.5 p-2">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setTab(tab.id)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                  <div className="absolute bottom-0 left-0 right-0 border-t border-border/50 p-3">
                    <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-destructive">
                      Sair
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <img src={abbaLogo} alt="AbbaVideo" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold hidden md:inline">
              Abba<span className="text-primary">Video</span>
            </span>
            {isMobile && (
              <div className="flex items-center gap-1.5 ml-1">
                <ActiveIcon className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-foreground">{activeTabConfig.label}</span>
              </div>
            )}
            {isGod() ? (
              <span className="text-[10px] font-bold uppercase tracking-widest bg-abba-lime text-[#111] px-2 py-0.5 rounded-full ml-1">GOD</span>
            ) : (
              <span className="text-xs text-muted-foreground font-sans ml-1 hidden md:inline">Admin</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={restartAdminTour} className="hidden md:flex text-xs">Reiniciar Tour</Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="hidden md:flex">Sair</Button>
          </div>
        </div>
      </header>

      {/* Desktop tabs */}
      {!isMobile && (
        <div className="container mx-auto px-6 pt-6">
          <div className="flex gap-1 mb-6 glass rounded-xl p-1 w-full overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`${isMobile ? 'px-4 py-4' : 'container mx-auto px-6 pb-6'}`}>
        {renderContent()}
      </div>
    </div>
  );
};

export default Admin;
