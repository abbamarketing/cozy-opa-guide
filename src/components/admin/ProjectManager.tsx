import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Copy, Power, Youtube, Instagram, Image, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import ProjectCreatorModal from './ProjectCreatorModal';
import type { CustomProject } from '@/types/database';
import { useIsMobile } from '@/hooks/use-mobile';

const ProjectManager = () => {
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState<CustomProject[]>([]);
  const [clientCounts, setClientCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<CustomProject | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('custom_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar projetos');
    } else {
      setProjects((data as unknown as CustomProject[]) || []);

      const { data: userProjects } = await supabase
        .from('user_projects')
        .select('custom_project_id');

      if (userProjects) {
        const counts: Record<string, number> = {};
        userProjects.forEach((up: any) => {
          counts[up.custom_project_id] = (counts[up.custom_project_id] || 0) + 1;
        });
        setClientCounts(counts);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleToggleActive = async (project: CustomProject) => {
    const { error } = await supabase
      .from('custom_projects')
      .update({ active: !project.active } as any)
      .eq('id', project.id);

    if (error) toast.error('Erro ao atualizar status');
    else { toast.success(project.active ? 'Projeto desativado' : 'Projeto ativado'); fetchProjects(); }
  };

  const handleDuplicate = (project: CustomProject) => {
    setEditingProject({ ...project, id: '', project_name: `${project.project_name} (Cópia)` });
    setModalOpen(true);
  };

  const handleEdit = (project: CustomProject) => { setEditingProject(project); setModalOpen(true); };
  const handleCreate = () => { setEditingProject(null); setModalOpen(true); };
  const handleModalClose = () => { setModalOpen(false); setEditingProject(null); };
  const handleSaved = () => { handleModalClose(); fetchProjects(); };

  const renderDeliverables = (p: CustomProject) => {
    const items: React.ReactNode[] = [];
    if (p.youtube_videos > 0) items.push(
      <span key="yt" className="inline-flex items-center gap-1 text-xs"><Youtube className="h-3 w-3" />{p.youtube_videos}</span>
    );
    if (p.instagram_videos > 0) items.push(
      <span key="ig" className="inline-flex items-center gap-1 text-xs"><Instagram className="h-3 w-3" />{p.instagram_videos}</span>
    );
    if (p.include_thumbnails) items.push(
      <span key="th" className="inline-flex items-center gap-1 text-xs"><Image className="h-3 w-3" />Thumb</span>
    );
    if (p.include_covers) items.push(
      <span key="cv" className="inline-flex items-center gap-1 text-xs"><FileImage className="h-3 w-3" />Capa</span>
    );
    return <div className="flex flex-wrap gap-2">{items}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Projetos Personalizados</h2>
          <p className="text-sm text-muted-foreground">Gerencie os projetos que serão atribuídos aos clientes.</p>
        </div>
        <Button variant="neon" onClick={handleCreate} className="w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Criar Novo Projeto
        </Button>
      </div>

      {/* Mobile: Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">Carregando...</p>
          ) : projects.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">Nenhum projeto criado.</p>
          ) : (
            projects.map((p) => (
              <Card key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{p.project_name}</p>
                    {p.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                    )}
                  </div>
                  <Badge variant={p.active ? 'default' : 'secondary'} className={`shrink-0 text-[10px] ${p.active ? 'bg-primary/20 text-primary border-primary/30' : ''}`}>
                    {p.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {renderDeliverables(p)}

                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-primary font-medium">
                    R$ {Number(p.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-muted-foreground">{clientCounts[p.id] || 0} cliente(s)</span>
                </div>

                <div className="flex gap-1 border-t border-border/30 pt-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1" onClick={() => handleEdit(p)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-xs gap-1" onClick={() => handleDuplicate(p)}>
                    <Copy className="h-3 w-3" /> Duplicar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => handleToggleActive(p)}>
                    <Power className={`h-3 w-3 ${p.active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Desktop: Table */
        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Projeto</TableHead>
                <TableHead>Entregáveis</TableHead>
                <TableHead>Valor/mês</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum projeto criado ainda.</TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow key={p.id} className="border-border/30">
                    <TableCell>
                      <div>
                        <p className="font-medium">{p.project_name}</p>
                        {p.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{renderDeliverables(p)}</TableCell>
                    <TableCell className="font-mono-code text-primary">
                      R$ {Number(p.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell><span className="font-mono-code">{clientCounts[p.id] || 0}</span></TableCell>
                    <TableCell>
                      <Badge variant={p.active ? 'default' : 'secondary'} className={p.active ? 'bg-primary/20 text-primary border-primary/30' : ''}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(p)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggleActive(p)} title={p.active ? 'Desativar' : 'Ativar'}>
                          <Power className={`h-4 w-4 ${p.active ? 'text-primary' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectCreatorModal
        open={modalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        editingProject={editingProject}
        clientCount={editingProject ? (clientCounts[editingProject.id] || 0) : 0}
      />
    </div>
  );
};

export default ProjectManager;
