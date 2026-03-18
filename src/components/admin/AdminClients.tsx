import { useState, useEffect, useMemo, Fragment } from 'react';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, MoreHorizontal, Pause, Play, Loader2, Download, Trash2 } from 'lucide-react';
import { downloadCSV } from '@/lib/csv';
import AffiliateManager from './AffiliateManager';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface ClientRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  project_name: string | null;
  plan_value: number | null;
  status: string;
  client_type: string | null;
  subscription_tier: string | null;
}

const SUBSCRIPTION_VALUES: Record<string, number> = {
  standard: 490, pro: 660, business: 1100, premium: 2970, agency: 5590,
};

const CLIENT_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  custom: { label: 'Custom', className: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  subscription: { label: 'Assinatura', className: 'bg-green-500/15 text-green-500 border-green-500/30' },
  influencer: { label: 'Influencer', className: 'bg-violet-500/15 text-violet-500 border-violet-500/30' },
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  pending_payment: { label: 'Pendente Pgto', variant: 'outline' },
  suspended: { label: 'Suspenso', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
};

const PAGE_SIZE = 20;

const AdminClients = () => {
  const isMobile = useIsMobile();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | 'delete' | null;
    userId: string | null;
    clientName: string | null;
    clientType: string | null;
  }>({ type: null, userId: null, clientName: null, clientType: null });

  const hasActiveFilter = (s: string, st: string, t: string) =>
    s.trim() !== '' || st !== 'all' || t !== 'all';

  const fetchClients = async (searchTerm: string, status: string, type: string, currentPage: number) => {
    setLoading(true);

    const { data: clientRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'client');

    // Exclude users who also have 'editor' role (editors get 'client' role by default on signup)
    const { data: editorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'editor');

    const editorUserIds = new Set((editorRoles || []).map((r) => r.user_id));
    const userIds = (clientRoles || [])
      .map((r) => r.user_id)
      .filter((id) => !editorUserIds.has(id));

    if (userIds.length === 0) { setClients([]); setTotalCount(0); setLoading(false); return; }

    const filtering = hasActiveFilter(searchTerm, status, type);

    // Build profiles query — apply server-side name filter & skip pagination when filtering
    let profilesQuery = supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, created_at', { count: 'exact' })
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (searchTerm.trim()) {
      profilesQuery = profilesQuery.ilike('full_name', `%${searchTerm.trim()}%`);
    }

    if (!filtering) {
      profilesQuery = profilesQuery.range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
    }

    const { data: profiles, count: profilesCount } = await profilesQuery;

    setTotalCount(profilesCount || 0);

    const profileUserIds = (profiles || []).map((p: any) => p.user_id);
    if (profileUserIds.length === 0) { setClients([]); setLoading(false); return; }

    const { data: userProjects } = await supabase
      .from('user_projects')
      .select('user_id, status, custom_project_id, client_type, subscription_tier')
      .in('user_id', profileUserIds);

    const projectIds = [...new Set((userProjects || []).filter((up: any) => up.custom_project_id).map((up: any) => up.custom_project_id))];
    const { data: projects } = await supabase
      .from('custom_projects')
      .select('id, project_name, monthly_value')
      .in('id', projectIds.length > 0 ? projectIds : ['none']);

    const projectMap = new Map<string, any>((projects || []).map((p: any) => [p.id, p]));
    const upMap = new Map<string, any>((userProjects || []).map((up: any) => [up.user_id, up]));

    let rows: ClientRow[] = (profiles || []).map((p: any) => {
      const up: any = upMap.get(p.user_id);
      const proj: any = up?.custom_project_id ? projectMap.get(up.custom_project_id) : null;

      const planValue = proj
        ? Number(proj.monthly_value)
        : ((up?.client_type === 'subscription' || up?.client_type === 'influencer') && up?.subscription_tier)
          ? (SUBSCRIPTION_VALUES[up.subscription_tier] ?? null)
          : null;

      const displayName = proj?.project_name
        || ((up?.client_type === 'subscription' || up?.client_type === 'influencer')
            ? `${up?.client_type === 'influencer' ? 'Influencer' : 'Assinatura'} ${up?.subscription_tier ? up.subscription_tier.charAt(0).toUpperCase() + up.subscription_tier.slice(1) : ''}`.trim()
            : null)
        || 'Sem projeto';

      return {
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        project_name: displayName,
        plan_value: planValue,
        status: up?.status || 'no_project',
        client_type: up?.client_type || null,
        subscription_tier: up?.subscription_tier || null,
      };
    });

    // Apply client-side filters for status and type (not available server-side on profiles)
    if (status !== 'all') {
      rows = rows.filter((c) => c.status === status);
    }
    if (type !== 'all') {
      rows = rows.filter((c) => c.client_type === type);
    }

    setClients(rows);
    setLoading(false);
  };

  const debouncedSearch = useDebouncedValue(search, 300);

  const refetch = () => fetchClients(debouncedSearch, statusFilter, typeFilter, page);

  const isFiltering = hasActiveFilter(debouncedSearch, statusFilter, typeFilter);

  useEffect(() => {
    // Reset to page 0 when filters change
    if (isFiltering && page !== 0) {
      setPage(0);
      return; // the page change will trigger the fetch
    }
    fetchClients(debouncedSearch, statusFilter, typeFilter, page);
  }, [page, debouncedSearch, statusFilter, typeFilter]);

  const handleStatusChange = async () => {
    if (!confirmAction.userId || !confirmAction.type) return;

    setActionLoading(confirmAction.userId);

    if (confirmAction.type === 'delete') {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error('Sessão expirada');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-client`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ user_id: confirmAction.userId }),
          },
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || `Erro ${response.status}`);
        }

        toast.success('Cliente Excluído', { description: 'Conta e dados removidos com sucesso.' });
        refetch();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        toast.error('Erro ao excluir cliente', { description: message });
      }
    } else {
      const newStatus = confirmAction.type === 'suspend' ? 'suspended' : 'active';
      const action = confirmAction.type === 'suspend' ? 'suspend' : 'activate';

      if (confirmAction.clientType === 'subscription') {
        // Route through edge function to pause/resume Stripe subscription
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          if (!accessToken) throw new Error('Sessão expirada');

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-subscription`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ userId: confirmAction.userId, action }),
            },
          );

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.error || `Erro ${response.status}`);
          }

          toast.success(
            confirmAction.type === 'suspend' ? 'Cliente Suspendido' : 'Cliente Reativado',
            { description: 'Status e assinatura Stripe atualizados com sucesso' }
          );
          refetch();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido';
          toast.error('Erro ao atualizar status', { description: message });
        }
      } else {
        // Custom/influencer — local update only
        const { error } = await supabase
          .from('user_projects')
          .update({ status: newStatus } as any)
          .eq('user_id', confirmAction.userId);

        if (error) {
          toast.error('Erro ao atualizar status');
        } else {
          toast.success(
            confirmAction.type === 'suspend' ? 'Cliente Suspendido' : 'Cliente Reativado',
            { description: 'Status atualizado com sucesso' }
          );
          refetch();
        }
      }
    }

    setActionLoading(null);
    setConfirmAction({ type: null, userId: null, clientName: null, clientType: null });
  };

  const exportCSV = () => {
    downloadCSV(
      clients.map((c) => ({
        Nome: c.full_name || 'Sem nome',
        Plano: c.project_name || '—',
        'Valor Mensal': c.plan_value ? `R$ ${c.plan_value.toFixed(2)}` : '—',
        Status: STATUS_MAP[c.status]?.label || c.status,
        Cadastro: format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR }),
      })),
      `clientes-${format(new Date(), 'yyyy-MM-dd')}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmAction.type !== null}
        onOpenChange={(open) => !open && setConfirmAction({ type: null, userId: null, clientName: null, clientType: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction.type === 'suspend'
                ? 'Suspender Cliente?'
                : confirmAction.type === 'delete'
                ? 'Excluir Cliente Permanentemente?'
                : 'Reativar Cliente?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === 'suspend'
                ? `O cliente "${confirmAction.clientName || ''}" não poderá mais acessar o sistema.`
                : confirmAction.type === 'delete'
                ? `ATENÇÃO: Esta ação é irreversível. Todos os dados do cliente "${confirmAction.clientName || ''}" (entregas, briefings, mensagens) serão permanentemente excluídos.`
                : `O cliente "${confirmAction.clientName || ''}" voltará a ter acesso total.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              className={confirmAction.type === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmAction.type === 'suspend'
                ? 'Suspender'
                : confirmAction.type === 'delete'
                ? 'Excluir Permanentemente'
                : 'Reativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            maxLength={100}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="pending_payment">Pendente Pgto</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="subscription">Assinatura</SelectItem>
              <SelectItem value="influencer">Influencer</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={clients.length === 0}
            onClick={exportCSV}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter indicator */}
      {isFiltering && !loading && (
        <p className="text-xs text-muted-foreground">
          Mostrando {clients.length} resultado{clients.length !== 1 ? 's' : ''}
          {debouncedSearch.trim() ? ` para "${debouncedSearch.trim()}"` : ''}
        </p>
      )}

      {/* Mobile: Card List */}
      {isMobile ? (
        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : clients.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            clients.map((c) => {
              const st = STATUS_MAP[c.status] || { label: 'Sem projeto', variant: 'secondary' as const };
              return (
                <Card key={c.user_id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.full_name || 'Sem nome'}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-muted-foreground truncate">{c.project_name || 'Sem projeto'}</p>
                        {c.client_type && CLIENT_TYPE_BADGE[c.client_type] && (
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${CLIENT_TYPE_BADGE[c.client_type].className}`}>
                            {CLIENT_TYPE_BADGE[c.client_type].label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant={st.variant} className="shrink-0 text-[10px]">{st.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{c.plan_value ? `R$ ${c.plan_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</span>
                    <span>{format(new Date(c.created_at), 'dd/MM/yy', { locale: ptBR })}</span>
                  </div>
                  {c.client_type === 'influencer' && (
                    <AffiliateManager userId={c.user_id} fullName={c.full_name} />
                  )}
                  <div className="flex justify-end gap-1">
                    {c.status !== 'active' && c.status !== 'no_project' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={actionLoading === c.user_id}
                        onClick={() => setConfirmAction({ type: 'activate', userId: c.user_id, clientName: c.full_name, clientType: c.client_type })}
                      >
                        <Play className="h-3 w-3" /> Ativar
                      </Button>
                    )}
                    {c.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive"
                        disabled={actionLoading === c.user_id}
                        onClick={() => setConfirmAction({ type: 'suspend', userId: c.user_id, clientName: c.full_name, clientType: c.client_type })}
                      >
                        <Pause className="h-3 w-3" /> Suspender
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive"
                      disabled={actionLoading === c.user_id}
                      onClick={() => setConfirmAction({ type: 'delete', userId: c.user_id, clientName: c.full_name, clientType: c.client_type })}
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Desktop: Table */
        <Card className="glass border-border/40 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Nome</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((c) => {
                  const st = STATUS_MAP[c.status] || { label: 'Sem projeto', variant: 'secondary' as const };
                   return (
                    <Fragment key={c.user_id}>
                    <TableRow className="border-border/30">
                      <TableCell className="font-medium">{c.full_name || 'Sem nome'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          <span>{c.project_name || '—'}</span>
                          {c.client_type && CLIENT_TYPE_BADGE[c.client_type] && (
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 ${CLIENT_TYPE_BADGE[c.client_type].className}`}>
                              {CLIENT_TYPE_BADGE[c.client_type].label}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {c.plan_value ? `R$ ${c.plan_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={actionLoading === c.user_id}>
                              {actionLoading === c.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {c.status !== 'active' && c.status !== 'no_project' && (
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ type: 'activate', userId: c.user_id, clientName: c.full_name, clientType: c.client_type })}
                              >
                                <Play className="mr-2 h-4 w-4" /> Ativar
                              </DropdownMenuItem>
                            )}
                            {c.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ type: 'suspend', userId: c.user_id, clientName: c.full_name, clientType: c.client_type })}
                                className="text-destructive"
                              >
                                <Pause className="mr-2 h-4 w-4" /> Suspender
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'delete', userId: c.user_id, clientName: c.full_name, clientType: c.client_type })}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {c.client_type === 'influencer' && (
                      <TableRow className="border-border/20 hover:bg-transparent">
                        <TableCell colSpan={6} className="pt-0 pb-2">
                          <AffiliateManager userId={c.user_id} fullName={c.full_name} />
                        </TableCell>
                      </TableRow>
                    )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination — hidden when filtering */}
      {!isFiltering && totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= totalCount}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminClients;
