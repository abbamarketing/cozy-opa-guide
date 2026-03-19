import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, Video, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const addEditorSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().trim().email('Email inválido').max(255),
});

interface EditorCard {
  id: string;
  display_name: string;
  user_id: string;
  status: string;
  active_deliveries: number;
  total_deliveries: number;
  on_time_deliveries: number;
}

const AdminEditors = () => {
  const [editors, setEditors] = useState<EditorCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editorToDelete, setEditorToDelete] = useState<EditorCard | null>(null);

  const fetchEditors = async () => {
    setLoading(true);

    const { data: editorsList } = await supabase
      .from('editors')
      .select('id, display_name, user_id, status');

    if (!editorsList) { setLoading(false); return; }

    // Get delivery stats per editor
    const { data: allDeliveries } = await supabase
      .from('deliveries')
      .select('editor_id, status, due_date, delivered_at')
      .in('editor_id', editorsList.map((e) => e.id));

    const cards: EditorCard[] = editorsList.map((e) => {
      const mine = (allDeliveries || []).filter((d) => d.editor_id === e.id);
      const active = mine.filter((d) => ['pending', 'in_progress', 'revision'].includes(d.status)).length;
      const completed = mine.filter((d) => d.status === 'approved');
      const onTime = completed.filter((d) => {
        if (!d.due_date || !d.delivered_at) return true;
        return new Date(d.delivered_at) <= new Date(d.due_date);
      }).length;

      return {
        id: e.id,
        display_name: e.display_name,
        user_id: e.user_id,
        status: e.status,
        active_deliveries: active,
        total_deliveries: mine.length,
        on_time_deliveries: onTime,
      };
    });

    setEditors(cards);
    setLoading(false);
  };

  useEffect(() => { fetchEditors(); }, []);

  const handleCreate = async () => {
    const result = addEditorSchema.safeParse({ name, email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((e) => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setCreating(true);

    try {
      // WARNING: supabase.auth.signUp() from the client will HIJACK the current admin session.
      // This is a known Supabase limitation — the newly created user becomes the authenticated user.
      // Use the `create-editor` edge function instead, which uses the service role key server-side
      // to create the user without affecting the admin session.
      // See: supabase/functions/create-editor/index.ts
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Sessão admin não encontrada');

      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-editor', {
        body: {
          name: result.data.name,
          email: result.data.email,
          password: `Editor_${Date.now()}!`,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (fnError) throw new Error(fnError.message || 'Erro ao criar editor');
      if (fnData?.error) throw new Error(fnData.error);

      toast.success('Editor criado com sucesso!', {
        description: `${result.data.name} receberá um email para confirmar a conta.`,
      });

      setModalOpen(false);
      setName('');
      setEmail('');
      fetchEditors();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar editor';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEditor = async () => {
    if (!editorToDelete) return;
    try {
      // Desatribuir entregas ativas
      const { error: unassignError } = await supabase
        .from('deliveries')
        .update({ editor_id: null })
        .eq('editor_id', editorToDelete.id)
        .in('status', ['pending', 'in_progress', 'revision']);
      if (unassignError) throw new Error(`Erro ao desatribuir entregas: ${unassignError.message}`);

      // Remover editor
      const { error: deleteEditorError } = await supabase.from('editors').delete().eq('id', editorToDelete.id);
      if (deleteEditorError) throw new Error(`Erro ao remover editor: ${deleteEditorError.message}`);

      // Remover role
      const { error: deleteRoleError } = await supabase.from('user_roles').delete().eq('user_id', editorToDelete.user_id);
      if (deleteRoleError) throw new Error(`Erro ao remover permissões: ${deleteRoleError.message}`);

      toast.success('Editor removido. Entregas ativas foram desatribuídas.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao remover editor';
      toast.error(message);
    } finally {
      setEditorToDelete(null);
      fetchEditors();
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Editores</h2>
          <p className="text-sm text-muted-foreground">{editors.length} editor{editors.length !== 1 ? 'es' : ''} cadastrado{editors.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Editor
        </Button>
      </div>

      {/* Editor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {editors.map((e) => {
          const initials = e.display_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
          const completedCount = e.total_deliveries - e.active_deliveries;
          const onTimeRate = completedCount > 0 ? Math.round((e.on_time_deliveries / completedCount) * 100) : 100;

          return (
            <Card key={e.id} className="glass border-border/40 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-card-foreground">{e.display_name}</p>
                  <Badge variant={e.status === 'available' ? 'default' : 'secondary'} className="text-[10px]">
                    {e.status === 'available' ? 'Disponível' : e.status === 'busy' ? 'Ocupado' : 'Inativo'}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setEditorToDelete(e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground">Ativas</p>
                  <div className="flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-card-foreground">{e.active_deliveries}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground">No prazo</p>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-card-foreground">{onTimeRate}%</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Editor Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Editor</DialogTitle>
            <DialogDescription>Preencha os dados para criar uma conta de editor.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="editor@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Editor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Editor Confirmation */}
      <AlertDialog open={!!editorToDelete} onOpenChange={(open) => !open && setEditorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover editor?</AlertDialogTitle>
            <AlertDialogDescription>
              Remover {editorToDelete?.display_name}? Esta ação é irreversível.
              O editor perderá acesso ao sistema e suas entregas ativas serão desatribuídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEditor} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEditors;
