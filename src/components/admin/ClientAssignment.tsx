import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2, Youtube, Instagram, Image, FileImage, FileText, Camera, Package } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CustomProject } from '@/types/database';

interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  assigned_project_id: string | null;
  created_at: string;
}

const ClientAssignment = () => {
  const isMobile = useIsMobile();
  const [clients, setClients] = useState<(ClientProfile & { email?: string })[]>([]);
  const [activeClients, setActiveClients] = useState<(ClientProfile & { email?: string; project_name?: string; status?: string })[]>([]);
  const [projects, setProjects] = useState<CustomProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<(ClientProfile & { email?: string }) | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [sendEmail, setSendEmail] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all client profiles (role = client via user_roles)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'client');

    const clientUserIds = rolesData?.map((r) => r.user_id) || [];

    if (clientUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', clientUserIds);

      const profiles = (profilesData || []) as unknown as ClientProfile[];

      // Split into unassigned and assigned
      const unassigned = profiles.filter((p) => !p.assigned_project_id);
      const assigned = profiles.filter((p) => p.assigned_project_id);

      setClients(unassigned);

      // For assigned clients, get project info and status
      if (assigned.length > 0) {
        const { data: userProjects } = await supabase
          .from('user_projects')
          .select('user_id, status, custom_project_id')
          .in('user_id', assigned.map((a) => a.user_id));

        const { data: allProjects } = await supabase
          .from('custom_projects')
          .select('id, project_name');

        const projectMap = new Map((allProjects || []).map((p: any) => [p.id, p.project_name]));
        const upMap = new Map((userProjects || []).map((up: any) => [up.user_id, up]));

        setActiveClients(assigned.map((a) => {
          const up = upMap.get(a.user_id);
          return {
            ...a,
            project_name: up ? (projectMap.get(up.custom_project_id) as string) || 'N/A' : 'N/A',
            status: up?.status || 'unknown',
          };
        }));
      } else {
        setActiveClients([]);
      }
    }

    // Fetch active projects for the select
    const { data: projectsData } = await supabase
      .from('custom_projects')
      .select('*')
      .eq('active', true)
      .order('project_name');

    setProjects((projectsData as unknown as CustomProject[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleAssign = async () => {
    if (!selectedClient || !selectedProject) return;
    setAssigning(true);

    // 1. Create user_project
    const { error: insertError } = await supabase
      .from('user_projects')
      .insert({
        user_id: selectedClient.user_id,
        custom_project_id: selectedProject.id,
        status: 'pending_payment',
        youtube_reserved: 0,
        instagram_reserved: 0,
        thumbnails_reserved: 0,
        covers_reserved: 0,
        youtube_approved: 0,
        instagram_approved: 0,
        thumbnails_approved: 0,
        covers_approved: 0,
      } as any);

    if (insertError) {
      toast.error('Erro ao atribuir projeto', { description: insertError.message });
      setAssigning(false);
      return;
    }

    // 2. Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ assigned_project_id: selectedProject.id } as any)
      .eq('user_id', selectedClient.user_id);

    if (updateError) {
      toast.error('Erro ao atualizar perfil', { description: updateError.message });
      setAssigning(false);
      return;
    }

    logger.info('Projeto atribuído a cliente', { project: selectedProject.project_name, client: selectedClient.full_name }, 'admin');
    toast.success('Projeto atribuído com sucesso!', {
      description: `${selectedProject.project_name} → ${selectedClient.full_name || 'Cliente'}`,
    });

    setModalOpen(false);
    setSelectedClient(null);
    setSelectedProjectId('');
    setAssigning(false);
    fetchData();
  };

  const openModal = (client: ClientProfile & { email?: string }) => {
    setSelectedClient(client);
    setSelectedProjectId('');
    setSendEmail(true);
    setModalOpen(true);
  };

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    pending_payment: { label: 'Pendente Pagamento', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    active: { label: 'Ativo', className: 'bg-primary/20 text-primary border-primary/30' },
    suspended: { label: 'Suspenso', className: 'bg-destructive/20 text-destructive border-destructive/30' },
    cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground border-border' },
  };

  return (
    <div className="space-y-8">
      {/* Unassigned Clients */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Aguardando Projeto</h2>
          {clients.length > 0 && (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30">{clients.length}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Clientes cadastrados que ainda não têm um projeto atribuído.</p>

        {isMobile ? (
          <div className="space-y-2">
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Carregando...</p>
            ) : clients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente aguardando.</p>
            ) : (
              clients.map((c) => (
                <Card key={c.id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.full_name || 'Sem nome'}</p>
                      <p className="text-[11px] text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    <Button variant="neon" size="sm" className="shrink-0 text-xs" onClick={() => openModal(c)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />Atribuir
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Nome</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : clients.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum cliente aguardando atribuição.</TableCell></TableRow>
              ) : (
                clients.map((c) => (
                  <TableRow key={c.id} className="border-border/30">
                    <TableCell className="font-medium">{c.full_name || 'Sem nome'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30">Aguardando Projeto</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="neon" size="sm" onClick={() => openModal(c)}>
                        <UserPlus className="h-4 w-4 mr-2" />Atribuir Projeto
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </section>

      {/* Active Clients */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Clientes Ativos</h2>
        {isMobile ? (
          <div className="space-y-2">
            {activeClients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum cliente ativo.</p>
            ) : (
              activeClients.map((c) => {
                const st = STATUS_LABELS[c.status || ''] || STATUS_LABELS.pending_payment;
                return (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.full_name || 'Sem nome'}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.project_name}</p>
                      </div>
                      <Badge className={`shrink-0 text-[10px] ${st.className}`}>{st.label}</Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
        <div className="glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Nome</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeClients.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum cliente ativo.</TableCell></TableRow>
              ) : (
                activeClients.map((c) => {
                  const st = STATUS_LABELS[c.status || ''] || STATUS_LABELS.pending_payment;
                  return (
                    <TableRow key={c.id} className="border-border/30">
                      <TableCell className="font-medium">{c.full_name || 'Sem nome'}</TableCell>
                      <TableCell className="text-sm">{c.project_name}</TableCell>
                      <TableCell><Badge className={st.className}>{st.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        )}
      </section>

      {/* Assignment Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-lg glass border-border/50">
          <DialogHeader>
            <DialogTitle>Atribuir Projeto a {selectedClient?.full_name || 'Cliente'}</DialogTitle>
            <DialogDescription>Escolha um projeto personalizado para atribuir a este cliente.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client info */}
            <div className="glass rounded-xl p-4 space-y-1">
              <p className="text-sm"><span className="text-muted-foreground">Nome:</span> {selectedClient?.full_name || 'N/A'}</p>
              <p className="text-sm"><span className="text-muted-foreground">Cadastro:</span> {selectedClient ? format(new Date(selectedClient.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}</p>
            </div>

            {/* Project select */}
            <div className="space-y-2">
              <Label>Escolher Projeto</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione um projeto..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project preview */}
            {selectedProject && (
              <div className="glass rounded-xl p-5 border border-primary/20 space-y-4">
                <h4 className="font-semibold text-lg">{selectedProject.project_name}</h4>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Package className="h-3 w-3" /> Entregáveis</p>
                  <div className="space-y-1 text-sm">
                    {selectedProject.youtube_videos > 0 && (
                      <p className="flex items-center gap-2"><Youtube className="h-4 w-4 text-muted-foreground" />{selectedProject.youtube_videos} vídeos YouTube/mês</p>
                    )}
                    {selectedProject.instagram_videos > 0 && (
                      <p className="flex items-center gap-2"><Instagram className="h-4 w-4 text-muted-foreground" />{selectedProject.instagram_videos} vídeos Instagram/mês</p>
                    )}
                    {selectedProject.include_thumbnails && (
                      <p className="flex items-center gap-2"><Image className="h-4 w-4 text-muted-foreground" />Thumbnails incluídas</p>
                    )}
                    {selectedProject.include_covers && (
                      <p className="flex items-center gap-2"><FileImage className="h-4 w-4 text-muted-foreground" />Capas Instagram incluídas</p>
                    )}
                    {selectedProject.include_script && (
                      <p className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Roteiros IA incluídos</p>
                    )}
                    {selectedProject.include_capture && (
                      <p className="flex items-center gap-2"><Camera className="h-4 w-4 text-muted-foreground" />Captação de vídeo incluída</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-6 text-sm">
                  <p>💰 <span className="font-mono-code text-primary font-bold">R$ {Number(selectedProject.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>/mês</p>
                  <p>⚡ SLA: {selectedProject.deadline}</p>
                  <p>🔄 Até {selectedProject.max_revisions} revisões</p>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="flex items-center gap-2">
              <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(c) => setSendEmail(!!c)} />
              <Label htmlFor="sendEmail" className="text-sm text-muted-foreground cursor-pointer">
                Enviar email de boas-vindas com detalhes do projeto
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button variant="neon" disabled={!selectedProjectId || assigning} onClick={handleAssign}>
                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><UserPlus className="h-4 w-4 mr-2" />Atribuir Projeto</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientAssignment;
