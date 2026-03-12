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
import { Search, MoreHorizontal, Eye, Pause, Play, Loader2, Download } from 'lucide-react';
import { downloadCSV } from '@/lib/csv';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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

const AdminClients = () => {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'activate' | null;
    userId: string | null;
    clientName: string | null;
  }>({ type: null, userId: null, clientName: null });

  const fetchClients = async () => {
    setLoading(true);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'client');

    const userIds = (roles || []).map((r) => r.user_id);
    if (userIds.length === 0) { setClients([]); setLoading(false); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, created_at')
      .in('user_id', userIds);

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

    const newStatus = confirmAction.type === 'suspend' ? 'suspended' : 'active';
    setActionLoading(confirmAction.userId);

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

    setActionLoading(null);
    setConfirmAction({ type: null, userId: null, clientName: null });
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
              {confirmAction.type === 'suspend' ? 'Suspender Cliente?' : 'Reativar Cliente?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction.type === 'suspend'
                ? `O cliente "${confirmAction.clientName || ''}" não poderá mais acessar o sistema ou criar novas solicitações. As entregas em andamento continuarão normais.`
                : `O cliente "${confirmAction.clientName || ''}" voltará a ter acesso total ao sistema e poderá criar novas solicitações.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange}>
              {confirmAction.type === 'suspend' ? 'Suspender' : 'Reativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            maxLength={100}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
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
          className="gap-1.5"
          disabled={filtered.length === 0}
          onClick={() => {
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
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>

      {/* Table */}
      <Card className="glass border-border/40 overflow-hidden">
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
                          {c.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'suspend', userId: c.user_id, clientName: c.full_name })}
                              className="text-destructive"
                            >
                              <Pause className="mr-2 h-4 w-4" /> Suspender
                            </DropdownMenuItem>
                          )}
                          {c.status === 'suspended' && (
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: 'activate', userId: c.user_id, clientName: c.full_name })}
                            >
                              <Play className="mr-2 h-4 w-4" /> Reativar
                            </DropdownMenuItem>
                          )}
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
    </div>
  );
};

export default AdminClients;
