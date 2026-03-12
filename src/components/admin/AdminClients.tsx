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
import { Search, MoreHorizontal, Eye, Pause, Play, Loader2 } from 'lucide-react';
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

  const fetchClients = async () => {
    setLoading(true);

    // Get client user_ids
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

  const filtered = useMemo(() => {
    let result = clients;
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.full_name?.toLowerCase().includes(q));
    }
    return result;
  }, [clients, statusFilter, search]);

  const handleSuspend = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from('user_projects')
      .update({ status: 'suspended' } as any)
      .eq('user_id', userId);

    if (error) toast.error('Erro ao suspender');
    else { toast.success('Cliente suspenso'); fetchClients(); }
    setActionLoading(null);
  };

  const handleReactivate = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from('user_projects')
      .update({ status: 'active' } as any)
      .eq('user_id', userId);

    if (error) toast.error('Erro ao reativar');
    else { toast.success('Cliente reativado'); fetchClients(); }
    setActionLoading(null);
  };

  return (
    <div className="space-y-4">
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
                            <DropdownMenuItem onClick={() => handleSuspend(c.user_id)} className="text-destructive">
                              <Pause className="mr-2 h-4 w-4" /> Suspender
                            </DropdownMenuItem>
                          )}
                          {c.status === 'suspended' && (
                            <DropdownMenuItem onClick={() => handleReactivate(c.user_id)}>
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
