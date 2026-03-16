import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addHours } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

interface ClientOption {
  user_project_id: string;
  user_id: string;
  full_name: string;
}

interface EditorOption {
  id: string;
  display_name: string;
}

interface AdminNewDemandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const DELIVERY_TYPES = [
  { value: 'youtube_video', label: 'YouTube Video' },
  { value: 'instagram_video', label: 'Instagram Reel' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'cover', label: 'Cover Art' },
];

const AdminNewDemandModal = ({ open, onOpenChange, onCreated }: AdminNewDemandModalProps) => {
  const [title, setTitle] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [clientId, setClientId] = useState('');
  const [editorId, setEditorId] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [editors, setEditors] = useState<EditorOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([
      supabase
        .from('user_projects')
        .select('id, user_id')
        .eq('status', 'active'),
      supabase.from('editors').select('id, display_name, user_id').eq('status', 'available'),
    ]).then(async ([upRes, edRes]) => {
      const userProjects = upRes.data || [];
      const userIds = [...new Set(userProjects.map((up: any) => up.user_id))];
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name || 'Sem nome']));
      }
      setClients(
        userProjects.map((up: any) => ({
          user_project_id: up.id,
          user_id: up.user_id,
          full_name: profileMap.get(up.user_id) || 'Sem nome',
        }))
      );
      setEditors((edRes.data || []).map((e: any) => ({ id: e.id, display_name: e.display_name })));
      setLoadingOptions(false);
    });
  }, [open]);

  const reset = () => {
    setTitle('');
    setDeliveryType('');
    setClientId('');
    setEditorId('');
    setDueDate(undefined);
    setDescription('');
    setInternalNotes('');
  };

  const minDate = addHours(new Date(), 24);

  const isValid =
    title.trim().length >= 5 &&
    deliveryType &&
    clientId &&
    editorId &&
    dueDate &&
    description.trim().length >= 50;

  const handleCreate = async () => {
    if (!isValid || !dueDate) return;
    setSaving(true);

    const client = clients.find((c) => c.user_project_id === clientId);
    if (!client) { toast.error('Cliente não encontrado'); setSaving(false); return; }

    const { error } = await supabase.from('deliveries').insert({
      title: title.trim(),
      delivery_type: deliveryType as any,
      user_project_id: clientId,
      editor_id: editorId,
      status: 'in_progress' as any,
      due_date: dueDate.toISOString(),
      sla_deadline: dueDate.toISOString(),
      description: description.trim(),
      client_notes: internalNotes.trim() || null,
      is_exception: true,
      exception_notes: 'Criado pelo admin',
    });

    if (error) {
      toast.error('Erro ao criar demanda: ' + error.message);
      setSaving(false);
      return;
    }

    // Notify editor
    const editor = editors.find((e) => e.id === editorId);
    await supabase.from('notifications').insert({
      user_id: (await supabase.from('editors').select('user_id').eq('id', editorId).single()).data?.user_id || '',
      type: 'new_assignment',
      title: 'Nova Demanda Admin',
      message: `Nova demanda atribuída pelo admin: "${title.trim()}"`,
      link: '/editor',
    });

    // Notify client
    await supabase.from('notifications').insert({
      user_id: client.user_id,
      type: 'delivery_ready',
      title: 'Nova Entrega Iniciada',
      message: `Uma nova entrega foi iniciada para você: "${title.trim()}"`,
      link: '/dashboard',
    });

    toast.success('Demanda criada com sucesso');
    reset();
    onOpenChange(false);
    onCreated();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Demanda</DialogTitle>
          <DialogDescription>
            Crie uma entrega diretamente, atribuindo editor e cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="demand-title">Título</Label>
            <Input
              id="demand-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Vídeo institucional Q1"
              maxLength={120}
            />
            {title.length > 0 && title.length < 5 && (
              <p className="text-[10px] text-destructive">Mínimo 5 caracteres</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipo de entrega</Label>
            <Select value={deliveryType} onValueChange={setDeliveryType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId} disabled={loadingOptions}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingOptions ? 'Carregando...' : 'Selecione o cliente'} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.user_project_id} value={c.user_project_id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Editor */}
          <div className="space-y-1.5">
            <Label>Editor</Label>
            <Select value={editorId} onValueChange={setEditorId} disabled={loadingOptions}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingOptions ? 'Carregando...' : 'Selecione o editor'} />
              </SelectTrigger>
              <SelectContent>
                {editors.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label>Data de entrega</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < minDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description / Script */}
          <div className="space-y-1.5">
            <Label htmlFor="demand-desc">Roteiro e instruções para o editor</Label>
            <Textarea
              id="demand-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o vídeo, tom, referências, texto a inserir..."
              rows={5}
              maxLength={2000}
            />
            <p className={`text-[10px] ${description.length < 50 ? 'text-muted-foreground' : 'text-[hsl(var(--queue-green))]'}`}>
              {description.length}/50 caracteres mínimos
            </p>
          </div>

          {/* Internal notes */}
          <div className="space-y-1.5">
            <Label htmlFor="demand-notes">Notas internas (admin only)</Label>
            <Textarea
              id="demand-notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Observações internas que não serão visíveis ao cliente..."
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!isValid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Demanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNewDemandModal;
