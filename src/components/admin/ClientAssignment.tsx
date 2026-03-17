import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { UserPlus, Loader2, Youtube, Instagram, Image, FileImage, FileText, Camera, Package, Star } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { computeMonthlyQuota } from '@/lib/business-hours';
import type { CustomProject } from '@/types/database';

const INFLUENCER_TIERS: Record<string, { sla_hours: number; subscription_tier: string; label: string }> = {
  standard: { sla_hours: 72, subscription_tier: 'standard', label: 'Standard — 7 vídeos/mês · SLA 72h' },
  pro:      { sla_hours: 48, subscription_tier: 'pro',      label: 'Pro — 11 vídeos/mês · SLA 48h' },
  business: { sla_hours: 24, subscription_tier: 'business', label: 'Business — 22 vídeos/mês · SLA 24h' },
  premium:  { sla_hours: 8,  subscription_tier: 'premium',  label: 'Premium — 66 vídeos/mês · SLA 8h' },
  agency:   { sla_hours: 4,  subscription_tier: 'agency',   label: 'Agency — 132 vídeos/mês · SLA 4h' },
};

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
  const [assignmentMode, setAssignmentMode] = useState<'custom' | 'influencer'>('custom');
  const [selectedTier, setSelectedTier] = useState<string>('');
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

  const handleAssignInfluencer = async () => {
    if (!selectedClient || !selectedTier) return;
    setAssigning(true);

    const tierConfig = INFLUENCER_TIERS[selectedTier];
    if (!tierConfig) { setAssigning(false); return; }

    const periodStart = new Date();
    const periodEnd = new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    const quota = computeMonthlyQuota(tierConfig.sla_hours, periodStart, periodEnd);

    // We need a custom_project_id — use the first active project as placeholder
    const placeholderProjectId = projects[0]?.id;
    if (!placeholderProjectId) {
      toast.error('Nenhum projeto ativo encontrado para usar como base');
      setAssigning(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('user_projects')
      .insert({
        user_id: selectedClient.user_id,
        custom_project_id: placeholderProjectId,
        client_type: 'influencer',
        status: 'active',
        subscription_tier: tierConfig.subscription_tier,
        monthly_quota: quota,
        sla_hours: tierConfig.sla_hours,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        youtube_reserved: 0, youtube_approved: 0,
        instagram_reserved: 0, instagram_approved: 0,
        thumbnails_reserved: 0, thumbnails_approved: 0,
        covers_reserved: 0, covers_approved: 0,
      } as any);

    if (insertError) {
      toast.error('Erro ao criar projeto influencer', { description: insertError.message });
      setAssigning(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ assigned_project_id: placeholderProjectId } as any)
      .eq('user_id', selectedClient.user_id);

    if (updateError) {
      toast.error('Erro ao atualizar perfil', { description: updateError.message });
      setAssigning(false);
      return;
    }

    logger.info('Influencer atribuído', { tier: selectedTier, client: selectedClient.full_name }, 'admin');
    toast.success('Influencer configurado!', {
      description: `${tierConfig.subscription_tier.charAt(0).toUpperCase() + tierConfig.subscription_tier.slice(1)} → ${selectedClient.full_name || 'Cliente'}`,
    });

    setModalOpen(false);
    setSelectedClient(null);
    setSelectedTier('');
    setAssigning(false);
    fetchData();
  };

  const handleAssign = async () => {
    if (!selectedClient || !selectedProject) return;
    setAssigning(true);

    // 1. Create user_project
    const { error: insertError } = await supabase
      .from('user_projects')
      .insert({
        user_id: selectedClient.user_id,
        custom_project_id: selectedProject.id,
        client_type: 'custom',
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
    setSelectedTier('');
    setAssignmentMode('custom');
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
        <div className="glass rounded-xl overflow-x-auto">
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
        <div className="glass rounded-xl overflow-x-auto">
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
        <DialogContent className="w-[95vw] max-w-lg glass border-border/50 max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Atribuir Projeto a {selectedClient?.full_name || 'Cliente'}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Escolha um projeto personalizado para atribuir a este cliente.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6">
            {/* Client info */}
            <div className="glass rounded-xl p-3 sm:p-4 space-y-1">
              <p className="text-xs sm:text-sm"><span className="text-muted-foreground">Nome:</span> {selectedClient?.full_name || 'N/A'}</p>
              <p className="text-xs sm:text-sm"><span className="text-muted-foreground">Cadastro:</span> {selectedClient ? format(new Date(selectedClient.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}</p>
            </div>

            {/* Assignment mode toggle */}
            <div className="space-y-2">
              <Label className="text-sm">Tipo de Cliente</Label>
              <Select value={assignmentMode} onValueChange={(v) => { setAssignmentMode(v as 'custom' | 'influencer'); setSelectedProjectId(''); setSelectedTier(''); }}>
                <SelectTrigger className="bg-secondary border-border h-11 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom — Projeto personalizado</SelectItem>
                  <SelectItem value="influencer">Influencer — Plano por tier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignmentMode === 'custom' ? (
              <>
                {/* Project select */}
                <div className="space-y-2">
                  <Label className="text-sm">Escolher Projeto</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="bg-secondary border-border h-11 sm:h-10 text-sm">
                      <SelectValue placeholder="Selecione um projeto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-sm py-2.5">{p.project_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project preview */}
                {selectedProject && (
                  <div className="glass rounded-xl p-4 sm:p-5 border border-primary/20 space-y-3 sm:space-y-4">
                    <h4 className="font-semibold text-base sm:text-lg">{selectedProject.project_name}</h4>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Package className="h-3 w-3" /> Entregáveis</p>
                      <div className="space-y-1.5 text-xs sm:text-sm">
                        {selectedProject.youtube_videos > 0 && (
                          <p className="flex items-center gap-2"><Youtube className="h-4 w-4 shrink-0 text-muted-foreground" />{selectedProject.youtube_videos} vídeos YouTube/mês</p>
                        )}
                        {selectedProject.instagram_videos > 0 && (
                          <p className="flex items-center gap-2"><Instagram className="h-4 w-4 shrink-0 text-muted-foreground" />{selectedProject.instagram_videos} vídeos Instagram/mês</p>
                        )}
                        {selectedProject.include_thumbnails && (
                          <p className="flex items-center gap-2"><Image className="h-4 w-4 shrink-0 text-muted-foreground" />Thumbnails incluídas</p>
                        )}
                        {selectedProject.include_covers && (
                          <p className="flex items-center gap-2"><FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />Capas Instagram incluídas</p>
                        )}
                        {selectedProject.include_script && (
                          <p className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" />Roteiros IA incluídos</p>
                        )}
                        {selectedProject.include_capture && (
                          <p className="flex items-center gap-2"><Camera className="h-4 w-4 shrink-0 text-muted-foreground" />Captação de vídeo incluída</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
                      <p><span className="font-mono-code text-primary font-bold">R$ {Number(selectedProject.monthly_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span className="text-muted-foreground">/mês</span></p>
                      <p className="text-center">SLA: {selectedProject.deadline}</p>
                      <p className="text-right">Até {selectedProject.max_revisions} revisões</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Influencer tier select */}
                <div className="space-y-2">
                  <Label className="text-sm">Escolher Plano</Label>
                  <Select value={selectedTier} onValueChange={setSelectedTier}>
                    <SelectTrigger className="bg-secondary border-border h-11 sm:h-10 text-sm">
                      <SelectValue placeholder="Selecione um tier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INFLUENCER_TIERS).map(([key, tier]) => (
                        <SelectItem key={key} value={key} className="text-sm py-2.5">{tier.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTier && (
                  <div className="glass rounded-xl p-4 sm:p-5 border border-violet-500/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-violet-500" />
                      <h4 className="font-semibold text-sm sm:text-base">Influencer — {INFLUENCER_TIERS[selectedTier].subscription_tier.charAt(0).toUpperCase() + INFLUENCER_TIERS[selectedTier].subscription_tier.slice(1)}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">SLA: {INFLUENCER_TIERS[selectedTier].sla_hours}h · Faturamento externo · Sem Stripe</p>
                  </div>
                )}
              </>
            )}

            {/* Options */}
            <div className="flex items-start gap-3 py-1">
              <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(c) => setSendEmail(!!c)} className="mt-0.5 h-5 w-5" />
              <Label htmlFor="sendEmail" className="text-xs sm:text-sm text-muted-foreground cursor-pointer leading-tight">
                Enviar email de boas-vindas com detalhes do projeto
              </Label>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
              <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setModalOpen(false)}>Cancelar</Button>
              {assignmentMode === 'custom' ? (
                <Button variant="neon" className="h-11 sm:h-10" disabled={!selectedProjectId || assigning} onClick={handleAssign}>
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><UserPlus className="h-4 w-4 mr-2" />Atribuir Projeto</>
                  )}
                </Button>
              ) : (
                <Button variant="neon" className="h-11 sm:h-10" disabled={!selectedTier || assigning} onClick={handleAssignInfluencer}>
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <><Star className="h-4 w-4 mr-2" />Criar Influencer</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientAssignment;
