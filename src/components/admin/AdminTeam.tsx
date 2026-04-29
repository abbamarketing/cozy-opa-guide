import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, Pencil, Trash2, UserCog, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- team_members not in generated types
const db = supabase as any;

interface TeamMemberRow {
  id: string;
  user_id: string;
  display_role: string;
  permissions: Record<string, unknown>;
  notes: string | null;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
  // joined from profiles
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface ProfileResult {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

const ADMIN_TABS = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'entregas', label: 'Entregas' },
  { id: 'editores', label: 'Editores' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'projetos', label: 'Projetos' },
  { id: 'calendario', label: 'Calendário' },
  { id: 'comissoes', label: 'Comissões' },
  { id: 'suporte', label: 'Suporte' },
  { id: 'logs', label: 'Logs' },
];

const ACTION_PERMISSIONS = [
  { key: 'can_create_delivery', label: 'Criar entregas' },
  { key: 'can_edit_delivery', label: 'Editar entregas' },
  { key: 'can_delete_delivery', label: 'Excluir entregas' },
  { key: 'can_manage_clients', label: 'Gerenciar clientes' },
  { key: 'can_manage_editors', label: 'Gerenciar editores' },
  { key: 'can_view_financials', label: 'Ver financeiro' },
  { key: 'can_manage_projects', label: 'Gerenciar projetos' },
  { key: 'can_export_data', label: 'Exportar dados' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin Restrito' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'manager', label: 'Manager' },
];

const DEFAULT_FORM = {
  email: '',
  display_role: 'viewer',
  admin_tabs: ['overview'] as string[],
  can_create_delivery: false,
  can_edit_delivery: false,
  can_delete_delivery: false,
  can_manage_clients: false,
  can_manage_editors: false,
  can_view_financials: false,
  can_manage_projects: false,
  can_export_data: false,
  notes: '',
  // Used only when creating a new editor account from scratch
  new_editor_name: '',
  new_editor_email: '',
  new_editor_password: '',
};

type FormState = typeof DEFAULT_FORM;

const AdminTeam = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [emailSearch, setEmailSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberRow | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data: teamData, error } = await db
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !teamData) {
      setLoading(false);
      return;
    }

    // Fetch profiles for all members
    const userIds = teamData.map((m: TeamMemberRow) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    // Fetch emails from auth.users via a supabase admin call is not possible client-side,
    // so we use the profiles table data that we have
    const profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    (profiles || []).forEach((p: { user_id: string; full_name: string | null; avatar_url: string | null }) => {
      profileMap[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
    });

    const rows: TeamMemberRow[] = teamData.map((m: TeamMemberRow) => ({
      ...m,
      full_name: profileMap[m.user_id]?.full_name ?? null,
      avatar_url: profileMap[m.user_id]?.avatar_url ?? null,
      email: null,
    }));

    setMembers(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const searchProfiles = async (query: string) => {
    if (query.length < 3) { setSearchResults([]); return; }
    setSearchLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .ilike('full_name', `%${query}%`)
      .limit(5);

    setSearchResults(
      (data || []).map((p: { user_id: string; full_name: string | null; avatar_url: string | null }) => ({
        id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        email: null,
      }))
    );
    setSearchLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setEmailSearch('');
    setSearchResults([]);
    setSelectedProfile(null);
    setModalOpen(true);
  };

  const openEdit = (member: TeamMemberRow) => {
    setEditingId(member.id);
    const perms = member.permissions as Record<string, unknown>;
    setForm({
      email: member.email ?? '',
      display_role: member.display_role,
      admin_tabs: (perms.admin_tabs as string[]) ?? ['overview'],
      can_create_delivery: !!(perms.can_create_delivery),
      can_edit_delivery: !!(perms.can_edit_delivery),
      can_delete_delivery: !!(perms.can_delete_delivery),
      can_manage_clients: !!(perms.can_manage_clients),
      can_manage_editors: !!(perms.can_manage_editors),
      can_view_financials: !!(perms.can_view_financials),
      can_manage_projects: !!(perms.can_manage_projects),
      can_export_data: !!(perms.can_export_data),
      notes: member.notes ?? '',
    });
    setSelectedProfile({ id: member.user_id, full_name: member.full_name, avatar_url: member.avatar_url, email: null });
    setEmailSearch(member.full_name ?? '');
    setSearchResults([]);
    setModalOpen(true);
  };

  const toggleTab = (tabId: string) => {
    setForm(prev => ({
      ...prev,
      admin_tabs: prev.admin_tabs.includes(tabId)
        ? prev.admin_tabs.filter(t => t !== tabId)
        : [...prev.admin_tabs, tabId],
    }));
  };

  const toggleAction = (key: string) => {
    setForm(prev => ({ ...prev, [key]: !prev[key as keyof FormState] }));
  };

  const handleSave = async () => {
    if (!editingId && !selectedProfile) {
      toast.error('Selecione um usuário');
      return;
    }

    setSaving(true);
    const permissions = {
      admin_tabs: form.admin_tabs,
      can_create_delivery: form.can_create_delivery,
      can_edit_delivery: form.can_edit_delivery,
      can_delete_delivery: form.can_delete_delivery,
      can_manage_clients: form.can_manage_clients,
      can_manage_editors: form.can_manage_editors,
      can_view_financials: form.can_view_financials,
      can_manage_projects: form.can_manage_projects,
      can_export_data: form.can_export_data,
    };

    if (editingId) {
      const { error } = await db
        .from('team_members')
        .update({
          display_role: form.display_role,
          permissions,
          notes: form.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) {
        toast.error('Erro ao salvar: ' + error.message);
      } else {
        toast.success('Membro atualizado');
        setModalOpen(false);
        fetchMembers();
      }
    } else {
      const { error } = await db
        .from('team_members')
        .insert({
          user_id: selectedProfile!.id,
          display_role: form.display_role,
          permissions,
          notes: form.notes || null,
          invited_by: user?.id ?? null,
        });

      if (error) {
        toast.error('Erro ao adicionar: ' + error.message);
      } else {
        toast.success('Membro adicionado');
        setModalOpen(false);
        fetchMembers();
      }
    }
    setSaving(false);
  };

  const handleToggleActive = async (member: TeamMemberRow) => {
    const { error } = await db
      .from('team_members')
      .update({ is_active: !member.is_active, updated_at: new Date().toISOString() })
      .eq('id', member.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(member.is_active ? 'Membro desativado' : 'Membro ativado');
      fetchMembers();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await db.from('team_members').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Erro ao remover membro');
    } else {
      toast.success('Membro removido');
      setDeleteTarget(null);
      fetchMembers();
    }
  };

  const ROLE_LABEL: Record<string, string> = {
    admin: 'Admin Restrito',
    editor: 'Editor',
    viewer: 'Viewer',
    manager: 'Manager',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Equipe</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie membros e permissões de acesso ao painel</p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          <Plus className="h-4 w-4" />
          Novo Membro
        </Button>
      </div>

      <Card className="bg-card border border-border rounded-[var(--radius)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <UserCog className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Nenhum membro cadastrado</p>
            <Button variant="outline" onClick={openCreate} className="mt-2 gap-2 text-sm">
              <Plus className="h-3.5 w-3.5" />
              Adicionar primeiro membro
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Usuário</TableHead>
                <TableHead className="text-muted-foreground">Papel</TableHead>
                <TableHead className="text-muted-foreground hidden md:table-cell">Abas permitidas</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const tabs = ((member.permissions as Record<string, unknown>).admin_tabs as string[]) ?? [];
                return (
                  <TableRow
                    key={member.id}
                    className="border-border cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => openEdit(member)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {member.full_name ?? 'Sem nome'}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {member.user_id.slice(0, 8)}…
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs border-border text-foreground">
                        {ROLE_LABEL[member.display_role] ?? member.display_role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {tabs.slice(0, 4).map(t => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t}
                          </Badge>
                        ))}
                        {tabs.length > 4 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{tabs.length - 4}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.is_active ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {member.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title={member.is_active ? 'Desativar' : 'Ativar'}
                          onClick={() => handleToggleActive(member)}
                        >
                          {member.is_active
                            ? <ToggleRight className="h-4 w-4" />
                            : <ToggleLeft className="h-4 w-4" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Editar"
                          onClick={() => openEdit(member)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Remover"
                          onClick={() => setDeleteTarget(member)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border border-border rounded-[var(--radius)] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? 'Editar Membro' : 'Novo Membro'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {editingId
                ? 'Altere o papel, permissões e observações do membro.'
                : 'Busque pelo nome do usuário e configure as permissões.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* User search (only on create) */}
            {!editingId && (
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Usuário</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    placeholder="Buscar por nome..."
                    value={emailSearch}
                    onChange={e => {
                      setEmailSearch(e.target.value);
                      setSelectedProfile(null);
                      searchProfiles(e.target.value);
                    }}
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {searchResults.length > 0 && !selectedProfile && (
                  <div className="border border-border rounded-[var(--radius)] bg-background overflow-hidden">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-secondary transition-colors"
                        onClick={() => {
                          setSelectedProfile(p);
                          setEmailSearch(p.full_name ?? p.id);
                          setSearchResults([]);
                        }}
                      >
                        <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                          {(p.full_name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{p.full_name ?? 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 12)}…</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedProfile && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-[var(--radius)] border border-border">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-foreground">
                      {(selectedProfile.full_name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground">{selectedProfile.full_name}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-auto">{selectedProfile.id.slice(0, 12)}…</span>
                  </div>
                )}
              </div>
            )}

            {/* Role */}
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Papel</Label>
              <Select value={form.display_role} onValueChange={v => setForm(prev => ({ ...prev, display_role: v }))}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border">
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value} className="text-foreground focus:bg-secondary">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admin tabs */}
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Abas visíveis no painel</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ADMIN_TABS.map(tab => (
                  <label
                    key={tab.id}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <Checkbox
                      checked={form.admin_tabs.includes(tab.id)}
                      onCheckedChange={() => toggleTab(tab.id)}
                      className="border-border"
                    />
                    <span className="text-sm text-foreground group-hover:text-foreground/80 transition-colors">
                      {tab.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action permissions */}
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Permissões de ação</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ACTION_PERMISSIONS.map(action => (
                  <label
                    key={action.key}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <Checkbox
                      checked={!!(form[action.key as keyof FormState])}
                      onCheckedChange={() => toggleAction(action.key)}
                      className="border-border"
                    />
                    <span className="text-sm text-foreground group-hover:text-foreground/80 transition-colors">
                      {action.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Observações</Label>
              <Textarea
                className="bg-background border-border text-foreground placeholder:text-muted-foreground resize-none"
                placeholder="Notas internas sobre este membro..."
                rows={3}
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingId ? 'Salvar alterações' : 'Adicionar membro'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border border-border rounded-[var(--radius)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover membro</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja remover{' '}
              <strong className="text-foreground">{deleteTarget?.full_name ?? 'este membro'}</strong> da equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTeam;
