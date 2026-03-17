import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'pending' | 'paid';

const AdminCommissions = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [payingId, setPayingId] = useState<string | null>(null);

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['admin_commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select(`
          *,
          affiliate_codes (
            code,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile names for each unique user_id
      const userIds = [...new Set((data ?? []).map((c: any) => c.affiliate_codes?.user_id).filter(Boolean))];
      
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name || 'Sem nome']));
        }
      }

      return (data ?? []).map((c: any) => ({
        ...c,
        influencer_name: profileMap[c.affiliate_codes?.user_id] || 'Desconhecido',
        affiliate_code: c.affiliate_codes?.code || '—',
      }));
    },
  });

  const filtered = commissions.filter((c: any) => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  const totalPending = commissions
    .filter((c: any) => c.status === 'pending')
    .reduce((sum: number, c: any) => sum + (c.amount_cents ?? 0), 0);

  const totalPaid = commissions
    .filter((c: any) => c.status === 'paid')
    .reduce((sum: number, c: any) => sum + (c.amount_cents ?? 0), 0);

  const markAsPaid = async (id: string) => {
    setPayingId(id);
    const { error } = await supabase
      .from('affiliate_commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao marcar como pago');
    } else {
      toast.success('Comissão marcada como paga');
      queryClient.invalidateQueries({ queryKey: ['admin_commissions'] });
    }
    setPayingId(null);
  };

  const formatMonth = (month: string) => {
    const d = new Date(month + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">Comissões de Afiliados</h2>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Total pendente</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-amber-400">R${(totalPending / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Total pago</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-emerald-500">R${(totalPaid / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma comissão encontrada.</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Influencer</TableHead>
                <TableHead>Mês</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.influencer_name}</span>
                      <Badge variant="outline" className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-[10px] px-1.5 py-0 h-4">
                        Influencer
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{c.affiliate_code}</span>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{formatMonth(c.month)}</TableCell>
                  <TableCell className="text-sm font-medium">R${(c.amount_cents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={c.status === 'paid'
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]'
                      }
                    >
                      {c.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        disabled={payingId === c.id}
                        onClick={() => markAsPaid(c.id)}
                      >
                        {payingId === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Marcar como pago
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminCommissions;
