import { useSearchParams } from 'react-router-dom';
import { Play, LayoutDashboard, Users, Package, Film, BarChart3, FolderKanban, ScrollText, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import AdminOverview from '@/components/admin/AdminOverview';
import ClientAssignment from '@/components/admin/ClientAssignment';
import AdminClients from '@/components/admin/AdminClients';
import AdminDeliveries from '@/components/admin/AdminDeliveries';
import EditorManagement from '@/components/admin/EditorManagement';
import AdminMetrics from '@/components/admin/AdminMetrics';
import ProjectManager from '@/components/admin/ProjectManager';
import LogViewer from '@/components/admin/LogViewer';

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'entregas', label: 'Entregas', icon: Package },
  { id: 'editores', label: 'Editores', icon: Film },
  { id: 'metricas', label: 'Métricas', icon: BarChart3 },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

const Admin = () => {
  const { signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setTab = (tab: string) => setSearchParams({ tab });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-neon flex items-center justify-center">
              <Play className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">
              Video<span className="text-primary">Flow</span>
            </span>
            <span className="text-xs text-muted-foreground font-mono ml-1">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="flex gap-1 mb-8 glass rounded-xl p-1 w-fit overflow-x-auto">
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

        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'clientes' && (
          <div className="space-y-10">
            <ClientAssignment />
            <AdminClients />
          </div>
        )}
        {activeTab === 'entregas' && <AdminDeliveries />}
        {activeTab === 'editores' && <EditorManagement />}
        {activeTab === 'metricas' && <AdminMetrics />}
        {activeTab === 'projetos' && <ProjectManager />}
        {activeTab === 'logs' && <LogViewer />}
      </div>
    </div>
  );
};

export default Admin;
