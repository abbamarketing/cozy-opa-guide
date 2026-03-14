import { useState, useEffect, useMemo } from 'react';
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
}

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | 'delete' | null;
    userId: string | null;
    clientName: string | null;
  }>({ type: null, userId: null, clientName: null });

  const fetchClients = async () => {
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

    if (userIds.length === 0) { setClients([]); setLoading(false); return; }

    const { data: profiles, count: profilesCount } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, created_at', { count: 'exact' })
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setTotalCount(profilesCount || 0);

    const { data: userProjects } = await supabase
      .from('user_projects')
      .select('user_id, status, custom_project_id')
      .in('user_id', userIds);

    const projectIds = [...new Set((userProjects || []).map((up: any) => up.custom_project_id))];
    const { data: projects } = await supabase
      .from('custom_projects')
      .select('id, project_name, monthly_value')
      .in('id', projectIds.length > 0 ? projectIds : ['none']);

    const projectMap = new Map((projects || []).map((p: any) => [p.id, p]));
    const upMap = new Map((userProjects || []).map((up: any) => [up.user_id, up]));

    const rows: ClientRow[] = (profiles || []).map((p: any) => {
      const up = upMap.get(p.user_id);
      const proj = up ? projectMap.get(up.custom_project_id) : null;
      return {
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        project_name: proj?.project_name || null,
        plan_value: proj ? Number(proj.monthly_value) : null,
        status: up?.status || 'no_project',
      };
    });

    setClients(rows);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const debouncedSearch = useDebouncedValue(search, 300);

  const filtered = useMemo(() => {
    let result = clients;
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((c) => c.full_name?.toLowerCase().includes(q));
    }
    return result;
  }, [clients, statusFilter, debouncedSearch]);

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
        fetchClients();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        toast.error('Erro ao excluir cliente', { description: message });
      }
    } else {
      const newStatus = confirmAction.type === 'suspend' ? 'suspended' : 'active';

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
        fetchClients();
      }
    }

    setActionLoading(null);
    setConfirmAction({ type: null, userId: null, clientName: null });
  };

  const exportCSV = () => {
    downloadCSV(
      filtered.map((c) => ({
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
        onOpenChange={(open) => !open && setConfirmAction({ type: null, userId: null, clientName: null })}
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={filtered.length === 0}
            onClick={exportCSV}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </div>

      {/* Mobile: Card List */}
      {isMobile ? (
        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            filtered.map((c) => {
              const st = STATUS_MAP[c.status] || { label: 'Sem projeto', variant: 'secondary' as const };
              return (
                <Card key={c.user_id} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.full_name || 'Sem nome'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.project_name || 'Sem projeto'}</p>
                    </div>
                    <Badge variant={st.variant} className="shrink-0 text-[10px]">{st.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{c.plan_value ? `R$ ${c.plan_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</span>
                    <span>{format(new Date(c.created_at), 'dd/MM/yy', { locale: ptBR })}</span>
                  </div>
                  <div className="flex justify-end gap-1">
                    {c.status !== 'active' && c.status !== 'no_project' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={actionLoading === c.user_id}
                        onClick={() => setConfirmAction({ type: 'activate', userId: c.user_id, clientName: c.full_name })}
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
                        onClick={() => setConfirmAction({ type: 'suspend', userId: c.user_id, clientName: c.full_name })}
                      >
                        <Pause className="h-3 w-3" /> Suspender
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive"
                      disabled={actionLoading === c.user_id}
                      onClick={() => setConfirmAction({ type: 'delete', userId: c.user_id, clientName: c.full_name })}
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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const st = STATUS_MAP[c.status] || { label: 'Sem projeto', variant: 'secondary' as const };
                  return (
                    <TableRow key={c.user_id} className="border-border/30">
                      <TableCell className="font-medium">{c.full_name || 'Sem nome'}</TableCell>
                      <TableCell className="text-sm">{c.project_name || '—'}</TableCell>
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
                                onClick={() => setConfirmAction({ type: 'activate', userId: c.user_id, clientName: c.full_name })}
                              >
                                <Play className="mr-2 h-4 w-4" /> Ativar
                              </DropdownMenuItem>
                            )}
                            {c.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ type: 'suspend', userId: c.user_id, clientName: c.full_name })}
                                className="text-destructive"
                              >
                                <Pause className="mr-2 h-4 w-4" /> Suspender
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'delete', userId: c.user_id, clientName: c.full_name })}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminClients;
