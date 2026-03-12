import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Play, LayoutDashboard, FolderKanban, Users, Settings, ScrollText } from 'lucide-react';
import ClientAssignment from '@/components/admin/ClientAssignment';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import ProjectManager from '@/components/admin/ProjectManager';
import LogViewer from '@/components/admin/LogViewer';

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'config', label: 'Configurações', icon: Settings },
];

const Admin = () => {
  const { signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-neon flex items-center justify-center">
              <Play className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">
              Video<span className="text-primary">Flow</span>
            </span>
            <span className="text-xs text-muted-foreground font-mono-code ml-1">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>Sair</Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 glass rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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

        {/* Content */}
        {activeTab === 'projetos' && <ProjectManager />}
        {activeTab === 'overview' && (
          <div className="glass rounded-2xl p-12 text-center">
            <h1 className="text-3xl font-bold mb-4">Painel Administrativo</h1>
            <p className="text-muted-foreground">Selecione uma aba para começar.</p>
          </div>
        )}
        {activeTab === 'clientes' && <ClientAssignment />}
        {activeTab === 'config' && (
          <div className="glass rounded-2xl p-12 text-center">
            <h1 className="text-2xl font-bold mb-4">Configurações</h1>
            <p className="text-muted-foreground">Em construção.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
