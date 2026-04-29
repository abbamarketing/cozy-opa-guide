import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Loader2, Video, CheckCircle, Clock, Eye, Pencil, Power,
  Copy, AlertTriangle, User, BarChart3, Package, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/* ─── Schemas ─── */
const addEditorSchema = z.object({
  name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().trim().email('Email inválido').max(255),
});

/* ─── Types ─── */
interface EditorData {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  portfolio_url: string | null;
  specialty: string | null;
  avatar_url: string | null;
  email: string | null;
  active_deliveries: number;
  completed_deliveries: number;
  total_deliveries: number;
  on_time_rate: number;
}

interface DeliveryRow {
  id: string;
  title: string;
  status: string;
  delivery_type: string;
  due_date: string | null;
  delivered_at: string | null;
  created_at: string;
  client_name: string | null;
}

/* ─── Helpers ─── */
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const special = '!@#$%';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  return pwd;
};

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const parseFunctionErrorMessage = async (error: unknown) => {
  let message = 'Erro ao criar editor';

  if (error && typeof error === 'object' && 'message' in error) {
    message = String((error as { message?: unknown }).message || message);
  }

  const context =
    error && typeof error === 'object' && 'context' in error
      ? (error as { context?: unknown }).context
      : null;

  if (context && typeof (context as { json?: unknown }).json === 'function') {
    const payload = await (context as { json: () => Promise<Record<string, unknown>> }).json().catch(() => null);
    if (payload?.error && typeof payload.error === 'string') {
      message = payload.error;
    }
  }

  return message;
};

/* ─── Component ─── */
const EditorManagement = () => {
  const [editors, setEditors] = useState<EditorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailEditor, setDetailEditor] = useState<EditorData | null>(null);
  const [editEditor, setEditEditor] = useState<EditorData | null>(null);
  const [detailDeliveries, setDetailDeliveries] = useState<DeliveryRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState(generatePassword());
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Remove states
  const [blockedEditor, setBlockedEditor] = useState<{ editor: EditorData; count: number; titles: string[] } | null>(null);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [confirmRemoveEditor, setConfirmRemoveEditor] = useState<EditorData | null>(null);
  const [removing, setRemoving] = useState(false);

  const fetchEditors = useCallback(async () => {
    setLoading(true);

    const { data: editorsList } = await supabase
      .from('editors')
      .select('id, display_name, user_id, status, portfolio_url, specialty')
      .order('display_name');

    if (!editorsList) { setLoading(false); return; }

    // Get profiles for avatar/email
    const userIds = editorsList.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, avatar_url, full_name')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    // Get delivery stats
    const { data: allDeliveries } = await supabase
      .from('deliveries')
      .select('editor_id, status, due_date, delivered_at')
      .in('editor_id', editorsList.map((e) => e.id));

    const now = new Date();
    const cards: EditorData[] = editorsList.map((e) => {
      const prof = profileMap.get(e.user_id);
      const mine = (allDeliveries || []).filter((d) => d.editor_id === e.id);
      const activeList = mine.filter((d) =>
        ['pending', 'in_progress', 'revision'].includes(d.status)
      );
      const active = activeList.length;
      const completed = mine.filter((d) => d.status === 'approved');
      // SLA pool: completed + currently active. Active counts only when it has a due_date.
      const completedOnTime = completed.filter((d) => {
        if (!d.due_date || !d.delivered_at) return true;
        return new Date(d.delivered_at) <= new Date(d.due_date);
      }).length;
      const activeWithDue = activeList.filter((d) => d.due_date);
      const activeOnTime = activeWithDue.filter((d) => new Date(d.due_date as string) >= now).length;
      const slaPool = completed.length + activeWithDue.length;
      const onTime = completedOnTime + activeOnTime;

      return {
        id: e.id,
        user_id: e.user_id,
        display_name: e.display_name,
        status: e.status,
        portfolio_url: e.portfolio_url,
        specialty: e.specialty,
        avatar_url: prof?.avatar_url || null,
        email: null,
        active_deliveries: active,
        completed_deliveries: completed.length,
        total_deliveries: mine.length,
        on_time_rate: slaPool > 0 ? Math.round((onTime / slaPool) * 100) : 100,
      };
    });

    setEditors(cards);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEditors(); }, [fetchEditors]);

  /* ─── Create Editor ─── */
  const handleCreate = async () => {
    const result = addEditorSchema.safeParse({ name: addName, email: addEmail });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => { fieldErrors[e.path[0] as string] = e.message; });
      setAddErrors(fieldErrors);
      return;
    }
    setAddErrors({});
    setCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-editor', {
        body: { name: result.data.name, email: result.data.email, password: addPassword },
      });

      if (error) {
        throw new Error(await parseFunctionErrorMessage(error));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Editor criado com sucesso!', {
        description: `Credenciais: ${result.data.email} / ${addPassword}`,
      });

      setAddModalOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPassword(generatePassword());
      fetchEditors();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar editor';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  /* ─── Toggle Status ─── */
  const handleToggleStatus = async (editor: EditorData) => {
    const newStatus = editor.status === 'available' ? 'inactive' : 'available';
    const { error } = await supabase
      .from('editors')
      .update({ status: newStatus })
      .eq('id', editor.id);

    if (error) toast.error('Erro ao atualizar status');
    else {
      toast.success(newStatus === 'available' ? 'Editor ativado' : 'Editor desativado');
      fetchEditors();
    }
  };

  /* ─── Remove Editor ─── */
  const handleRemoveEditor = async (editor: EditorData) => {
    const { count: inProd, data: inProdData } = await supabase
      .from('deliveries')
      .select('title', { count: 'exact' })
      .eq('editor_id', editor.id)
      .eq('status', 'in_progress');

    if ((inProd ?? 0) > 0) {
      setBlockedEditor({
        editor,
        count: inProd ?? 0,
        titles: (inProdData || []).map((d) => d.title),
      });
      setBlockedModalOpen(true);
      return;
    }

    setConfirmRemoveEditor(editor);
  };

  const confirmRemove = async (editor: EditorData) => {
    setRemoving(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-editor', {
        body: { editor_id: editor.id },
      });
      if (error) throw new Error(await parseFunctionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      toast.success('Editor excluído');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir editor';
      toast.error(message);
    } finally {
      setConfirmRemoveEditor(null);
      setRemoving(false);
      fetchEditors();
    }
  };

  /* ─── View Details ─── */
  const openDetails = async (editor: EditorData) => {
    setDetailEditor(editor);
    setDetailLoading(true);

    try {
      const { data } = await supabase
        .from('deliveries')
        .select('id, title, status, delivery_type, due_date, delivered_at, created_at, user_project_id')
        .eq('editor_id', editor.id)
        .order('created_at', { ascending: false });

      if (data) {
        // Get client names
        const upIds = [...new Set(data.map((d) => d.user_project_id))];
        const { data: ups } = await supabase
          .from('user_projects')
          .select('id, user_id')
          .in('id', upIds);

        const userIds = [...new Set((ups || []).map((u) => u.user_id))];
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const upUserMap = new Map((ups || []).map((u) => [u.id, u.user_id]));
        const nameMap = new Map((profs || []).map((p) => [p.user_id, p.full_name]));

        setDetailDeliveries(
          data.map((d) => ({
            ...d,
            client_name: nameMap.get(upUserMap.get(d.user_project_id) || '') || null,
          }))
        );
      }
    } catch (err) {
      toast.error('Erro ao carregar detalhes do editor');
    } finally {
      setDetailLoading(false);
    }
  };

  /* ─── Edit Editor ─── */
  const openEdit = (editor: EditorData) => {
    setEditEditor(editor);
    setEditName(editor.display_name);
    setEditEmail('');
    setEditPassword('');
  };

  const handleChangePassword = async () => {
    if (!editEditor) return;
    if (editPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    setSavingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-editor-password', {
        body: { editor_id: editEditor.id, password: editPassword },
      });
      if (error) throw new Error(await parseFunctionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      toast.success('Senha atualizada', { description: `Nova senha: ${editPassword}` });
      setEditPassword('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editEditor) return;
    setSaving(true);

    const { error } = await supabase
      .from('editors')
      .update({ display_name: editName.trim() })
      .eq('id', editEditor.id);

    if (error) {
      toast.error('Erro ao salvar');
    } else {
      // Also update profile name
      await supabase
        .from('profiles')
        .update({ full_name: editName.trim() })
        .eq('user_id', editEditor.user_id);

      toast.success('Editor atualizado');
      setEditEditor(null);
      fetchEditors();
    }
    setSaving(false);
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between"><Skeleton className="h-8 w-40" /><Skeleton className="h-9 w-36" /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Editores</h2>
          <p className="text-sm text-muted-foreground">
            {editors.length} editor{editors.length !== 1 ? 'es' : ''} · {editors.filter((e) => e.status === 'available').length} ativo{editors.filter((e) => e.status === 'available').length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { setAddModalOpen(true); setAddPassword(generatePassword()); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Editor
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {editors.map((e) => (
          <Card key={e.id} className="glass border-border/40 p-5 space-y-4">
            {/* Top */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={e.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">{getInitials(e.display_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-card-foreground truncate">{e.display_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant={e.status === 'available' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {e.status === 'available' ? 'Ativo' : e.status === 'busy' ? 'Ocupado' : 'Inativo'}
                  </Badge>
                  {e.specialty && (
                    <span className="text-[10px] text-muted-foreground truncate">{e.specialty}</span>
                  )}
                </div>
              </div>
              <Switch
                checked={e.status === 'available'}
                onCheckedChange={() => handleToggleStatus(e)}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/20 p-2 text-center">
                <p className="text-lg font-bold text-primary">{e.active_deliveries}</p>
                <p className="text-[9px] uppercase text-muted-foreground">Ativas</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-2 text-center">
                <p className="text-lg font-bold text-card-foreground">{e.completed_deliveries}</p>
                <p className="text-[9px] uppercase text-muted-foreground">Concluídas</p>
              </div>
              <div className="rounded-lg bg-muted/20 p-2 text-center">
                <p className={`text-lg font-bold ${e.on_time_rate >= 80 ? 'text-primary' : e.on_time_rate >= 50 ? 'text-[hsl(45,93%,47%)]' : 'text-destructive'}`}>
                  {e.on_time_rate}%
                </p>
                <p className="text-[9px] uppercase text-muted-foreground">No prazo</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => openDetails(e)}>
                <Eye className="h-3.5 w-3.5" /> Detalhes
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => openEdit(e)}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-destructive hover:text-destructive"
                onClick={() => handleRemoveEditor(e)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* ═══ Add Modal ═══ */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Editor</DialogTitle>
            <DialogDescription>Crie uma conta de acesso para o novo editor.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input
                placeholder="Nome do editor"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                maxLength={100}
              />
              {addErrors.name && <p className="text-xs text-destructive">{addErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="editor@email.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                maxLength={255}
              />
              {addErrors.email && <p className="text-xs text-destructive">{addErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label>Senha temporária</Label>
              <div className="flex gap-2">
                <Input value={addPassword} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddPassword(generatePassword())}
                  title="Gerar nova senha"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">O editor deverá alterar após o primeiro login.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setAddModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Editor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Details Modal ═══ */}
      <Dialog open={!!detailEditor} onOpenChange={() => setDetailEditor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6 space-y-5">
              {detailEditor && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={detailEditor.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {getInitials(detailEditor.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <DialogTitle>{detailEditor.display_name}</DialogTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={detailEditor.status === 'available' ? 'default' : 'secondary'}>
                            {detailEditor.status === 'available' ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {detailEditor.specialty && (
                            <span className="text-xs text-muted-foreground">{detailEditor.specialty}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Performance */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Ativas', value: detailEditor.active_deliveries, icon: Package, color: 'text-primary' },
                      { label: 'Concluídas', value: detailEditor.completed_deliveries, icon: CheckCircle, color: 'text-primary' },
                      { label: 'Total', value: detailEditor.total_deliveries, icon: BarChart3, color: 'text-card-foreground' },
                      { label: 'No prazo', value: `${detailEditor.on_time_rate}%`, icon: Clock, color: detailEditor.on_time_rate >= 80 ? 'text-primary' : 'text-destructive' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg bg-muted/20 p-3 text-center">
                        <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[9px] uppercase text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Deliveries */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Entregas Atuais
                    </h3>
                    {detailLoading ? (
                      <Skeleton className="h-20 rounded-lg" />
                    ) : (
                      <>
                        {detailDeliveries.filter((d) => ['pending', 'in_progress', 'revision'].includes(d.status)).length === 0 ? (
                          <p className="text-xs text-muted-foreground/60">Nenhuma entrega ativa</p>
                        ) : (
                          <div className="space-y-2">
                            {detailDeliveries
                              .filter((d) => ['pending', 'in_progress', 'revision'].includes(d.status))
                              .map((d) => {
                                const h = d.due_date ? differenceInHours(new Date(d.due_date), new Date()) : null;
                                return (
                                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                                    <div>
                                      <p className="text-sm font-medium text-card-foreground">{d.title}</p>
                                      <p className="text-[10px] text-muted-foreground">{d.client_name || '—'}</p>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                                      {h !== null && (
                                        <p className={`text-[10px] mt-0.5 ${h < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                          {h < 0 ? 'Atrasado' : `${h}h`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        <Separator className="bg-border/50" />

                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Histórico
                        </h3>
                        {detailDeliveries.filter((d) => d.status === 'approved').length === 0 ? (
                          <p className="text-xs text-muted-foreground/60">Nenhuma entrega concluída</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border/40">
                                <TableHead className="text-xs">Título</TableHead>
                                <TableHead className="text-xs">Cliente</TableHead>
                                <TableHead className="text-xs">Entregue</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailDeliveries
                                .filter((d) => d.status === 'approved')
                                .slice(0, 10)
                                .map((d) => (
                                  <TableRow key={d.id} className="border-border/30">
                                    <TableCell className="text-sm">{d.title}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{d.client_name || '—'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {d.delivered_at ? format(new Date(d.delivered_at), 'dd/MM/yy', { locale: ptBR }) : '—'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Modal ═══ */}
      <Dialog open={!!editEditor} onOpenChange={() => setEditEditor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Editor</DialogTitle>
            <DialogDescription>Altere as informações do editor.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2 rounded-lg border border-border/40 p-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Alterar senha
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Mínimo 8 caracteres"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="font-mono text-sm"
                  maxLength={64}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditPassword(generatePassword())}
                  title="Gerar senha"
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={handleChangePassword}
                disabled={savingPassword || editPassword.length < 8}
              >
                {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Salvar nova senha
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditEditor(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Blocked Remove Modal ═══ */}
      <Dialog open={blockedModalOpen} onOpenChange={setBlockedModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remoção Bloqueada</DialogTitle>
            <DialogDescription>
              Este editor tem <strong>{blockedEditor?.count}</strong> entrega(s) em produção. Conclua ou reatribua antes de remover.
            </DialogDescription>
          </DialogHeader>
          {blockedEditor && blockedEditor.titles.length > 0 && (
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              {blockedEditor.titles.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockedModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Confirm Remove Modal ═══ */}
      <Dialog open={!!confirmRemoveEditor} onOpenChange={(open) => { if (!open) setConfirmRemoveEditor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Remoção</DialogTitle>
            <DialogDescription>
              Remover <strong>"{confirmRemoveEditor?.display_name}"</strong> como editor? Entregas na fila serão liberadas para reatribuição.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveEditor(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={() => confirmRemoveEditor && confirmRemove(confirmRemoveEditor)}
            >
              {removing ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorManagement;
