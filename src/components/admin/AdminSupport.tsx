import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  user_id: string;
  user_project_id: string | null;
  client_type: string | null;
  title: string;
  description: string;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

const clientTypeBadge = (type: string | null) => {
  switch (type) {
    case 'influencer': return <Badge className="bg-primary/10 text-foreground border-border">Influencer</Badge>;
    case 'subscription': return <Badge className="bg-primary/10 text-foreground border-border">Subscription</Badge>;
    case 'custom': return <Badge className="bg-primary/10 text-foreground border-border">Custom</Badge>;
    case 'editor': return <Badge className="bg-muted text-muted-foreground border-border">Editor</Badge>;
    default: return <Badge variant="outline">{type || '—'}</Badge>;
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} · ${hours}h${mins}`;
};

const AdminSupport = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [resolveTicket, setResolveTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`*, profiles:user_id ( full_name )`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as Ticket[];
      if (rows.length > 0 && rows[0].profiles === undefined) {
        console.warn('AdminSupport: ticket rows are missing joined "profiles" — check the select query');
      }
      return rows;
    },
  });

  const filtered = useMemo(() => {
    if (filter === 'open') return tickets.filter(t => t.status === 'open');
    if (filter === 'resolved') return tickets.filter(t => t.status === 'resolved');
    return tickets;
  }, [tickets, filter]);

  const openCount = tickets.filter(t => t.status === 'open').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  const handleResolve = async () => {
    if (!resolveTicket) return;
    setResolving(true);
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: 'resolved',
        admin_notes: notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', resolveTicket.id);
    setResolving(false);
    if (error) {
      toast.error('Erro ao resolver ticket');
      return;
    }
    queryClient.setQueryData(['admin-support-tickets'], (old: Ticket[] | undefined) =>
      (old ?? []).map(t =>
        t.id === resolveTicket.id
          ? { ...t, status: 'resolved', admin_notes: notes || null, resolved_at: new Date().toISOString() }
          : t
      )
    );
    toast.success('Ticket resolvido');
    setResolveTicket(null);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-foreground font-semibold">{openCount} abertos</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground font-semibold">{resolvedCount} resolvidos</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum ticket encontrado.</p>
      ) : (
        <div className="glass rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ticket => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.profiles?.full_name || '—'}</TableCell>
                  <TableCell>{clientTypeBadge(ticket.client_type)}</TableCell>
                  <TableCell className="max-w-[240px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block cursor-default">{ticket.title}</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs whitespace-pre-wrap">
                          {ticket.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    {ticket.status === 'open' ? (
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30">Aberto</Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-foreground border-border">Resolvido</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(ticket.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {ticket.status === 'open' && (
                      <Button size="sm" variant="outline" onClick={() => { setResolveTicket(ticket); setNotes(''); }}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolver
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!resolveTicket} onOpenChange={(open) => { if (!open) setResolveTicket(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">{resolveTicket?.title}</p>
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-auto">
                {resolveTicket?.description}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notas internas (opcional)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleResolve} disabled={resolving}>
              {resolving ? 'Salvando…' : 'Marcar como resolvido'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupport;
