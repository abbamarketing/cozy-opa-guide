import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Youtube, Instagram, Image, FileImage, FileText, Camera, AlertTriangle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { CustomProject } from '@/types/database';
import SubtaskTemplateEditor, { type SubtaskTemplate } from './SubtaskTemplateEditor';

const projectSchema = z.object({
  project_name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  youtube_videos: z.number().min(0).max(30),
  instagram_videos: z.number().min(0).max(30),
  include_thumbnails: z.boolean(),
  include_covers: z.boolean(),
  include_script: z.boolean(),
  include_capture: z.boolean(),
  capture_lead_days: z.number().min(1).max(90),
  monthly_value: z.number().min(0.01, 'Valor deve ser maior que 0'),
  payment_frequency: z.enum(['monthly', 'quarterly', 'annual']),
  max_revisions: z.number().min(1).max(5),
  deadline: z.enum(['24h', '48h', '72h']),
}).refine(
  (d) => d.youtube_videos > 0 || d.instagram_videos > 0 || d.include_thumbnails || d.include_covers,
  { message: 'Selecione pelo menos um entregável', path: ['youtube_videos'] }
).refine(
  (d) => !d.include_capture || d.youtube_videos > 0 || d.instagram_videos > 0,
  { message: 'Captação requer pelo menos um tipo de vídeo', path: ['include_capture'] }
);

type ProjectFormData = z.infer<typeof projectSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingProject: CustomProject | null;
  clientCount: number;
}

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  annual: 'Anual',
};

const ProjectCreatorModal = ({ open, onClose, onSaved, editingProject, clientCount }: Props) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [subtaskTemplates, setSubtaskTemplates] = useState<SubtaskTemplate[]>([]);
  const isEditing = editingProject && editingProject.id !== '';

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      project_name: '',
      description: '',
      youtube_videos: 0,
      instagram_videos: 0,
      include_thumbnails: false,
      include_covers: false,
      include_script: false,
      include_capture: false,
      capture_lead_days: 30,
      monthly_value: 0,
      payment_frequency: 'monthly',
      max_revisions: 2,
      deadline: '48h',
    },
  });

  const values = watch();

  useEffect(() => {
    if (open && editingProject) {
      reset({
        project_name: editingProject.project_name,
        description: editingProject.description || '',
        youtube_videos: editingProject.youtube_videos,
        instagram_videos: editingProject.instagram_videos,
        include_thumbnails: editingProject.include_thumbnails,
        include_covers: editingProject.include_covers,
        include_script: editingProject.include_script,
        include_capture: editingProject.include_capture,
        capture_lead_days: (editingProject as any).capture_lead_days || 30,
        monthly_value: Number(editingProject.monthly_value),
        payment_frequency: editingProject.payment_frequency,
        max_revisions: editingProject.max_revisions,
        deadline: editingProject.deadline,
      });
      // Load existing subtask templates
      supabase
        .from('project_subtask_templates')
        .select('*')
        .eq('custom_project_id', editingProject.id)
        .order('sort_order')
        .then(({ data }) => {
          if (data) {
            setSubtaskTemplates(data.map((t: any) => ({
              id: t.id,
              name: t.name,
              delivery_types: t.delivery_types || [],
              sort_order: t.sort_order,
              requires_approval: t.requires_approval,
              is_active: t.is_active,
            })));
          }
        });
    } else if (open) {
      reset();
      setSubtaskTemplates([]);
    }
  }, [open, editingProject, reset]);

  const saveSubtaskTemplates = async (projectId: string) => {
    // Delete existing templates for this project
    await supabase
      .from('project_subtask_templates')
      .delete()
      .eq('custom_project_id', projectId);

    // Insert new templates
    if (subtaskTemplates.length > 0) {
      const inserts = subtaskTemplates.map((t, i) => ({
        custom_project_id: projectId,
        name: t.name,
        delivery_types: t.delivery_types,
        sort_order: i,
        requires_approval: t.requires_approval,
        is_active: t.is_active,
      }));
      await supabase.from('project_subtask_templates').insert(inserts as any);
    }
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (!user) return;
    setSaving(true);

    const payload = {
      ...data,
      description: data.description || null,
      created_by: user.id,
    };

    let error;
    let projectId = editingProject?.id;

    if (isEditing) {
      const { created_by, ...updatePayload } = payload;
      ({ error } = await supabase
        .from('custom_projects')
        .update(updatePayload as any)
        .eq('id', editingProject!.id));
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('custom_projects')
        .insert(payload as any)
        .select('id')
        .single();
      error = insertError;
      if (inserted) projectId = inserted.id;
    }

    if (error) {
      toast.error('Erro ao salvar projeto', { description: error.message });
    } else {
      // Save subtask templates
      if (projectId) {
        await saveSubtaskTemplates(projectId);
      }
      toast.success(isEditing ? 'Projeto atualizado!' : 'Projeto criado!');
      onSaved();
    }
    setSaving(false);
  };

  // Available delivery types for subtask editor
  const availableDeliveryTypes = [
    ...(values.youtube_videos > 0 ? [{ value: 'youtube_video', label: 'YouTube' }] : []),
    ...(values.instagram_videos > 0 ? [{ value: 'instagram_video', label: 'Instagram' }] : []),
    ...(values.include_thumbnails ? [{ value: 'thumbnail', label: 'Thumbnail' }] : []),
    ...(values.include_covers ? [{ value: 'cover', label: 'Capa' }] : []),
  ];

  // Deliverables count for preview
  const deliverableCount = [
    values.youtube_videos > 0,
    values.instagram_videos > 0,
    values.include_thumbnails,
    values.include_covers,
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar Projeto' : 'Criar Projeto Personalizado'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as configurações do projeto.'
              : 'Configure um novo projeto personalizado para atribuir a clientes.'}
          </DialogDescription>
        </DialogHeader>

        {isEditing && clientCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
            <p className="text-xs text-yellow-500">
              {clientCount} cliente(s) utiliza(m) este projeto. Mudanças afetarão apenas novos clientes.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* A) Basic Info */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informações Básicas</h3>
            <div className="space-y-2">
              <Label htmlFor="project_name">Nome do Projeto *</Label>
              <Input
                id="project_name"
                placeholder="Ex: Pacote Fitness Influencer"
                className="bg-secondary border-border"
                {...register('project_name')}
              />
              {errors.project_name && <p className="text-xs text-destructive">{errors.project_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Detalhes internos sobre o projeto..."
                className="bg-secondary border-border resize-none"
                rows={3}
                {...register('description')}
              />
            </div>
          </section>

          {/* B) Deliverables */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Entregáveis Mensais</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Youtube className="h-4 w-4" /> Vídeos YouTube</Label>
                  <span className="font-mono-code text-sm text-primary">{values.youtube_videos}</span>
                </div>
                <Controller
                  name="youtube_videos"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      min={0} max={30} step={1}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Vídeos Instagram</Label>
                  <span className="font-mono-code text-sm text-primary">{values.instagram_videos}</span>
                </div>
                <Controller
                  name="instagram_videos"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      min={0} max={30} step={1}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                    />
                  )}
                />
              </div>

              {errors.youtube_videos && <p className="text-xs text-destructive">{errors.youtube_videos.message}</p>}

              <div className="grid grid-cols-2 gap-4">
                {([
                  { name: 'include_thumbnails' as const, label: 'Thumbnails', icon: Image },
                  { name: 'include_covers' as const, label: 'Capas Instagram', icon: FileImage },
                  { name: 'include_script' as const, label: 'Roteiro IA', icon: FileText },
                  { name: 'include_capture' as const, label: 'Captação de Vídeo', icon: Camera },
                ]).map(({ name, label, icon: Icon }) => (
                  <Controller
                    key={name}
                    name={name}
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                        <Label className="flex items-center gap-2 cursor-pointer text-sm">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {label}
                        </Label>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    )}
                  />
                ))}
              </div>
              {errors.include_capture && <p className="text-xs text-destructive">{errors.include_capture.message}</p>}
            </div>
          </section>

          {/* C) Settings */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Configurações</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Mensal (R$) *</Label>
                <Controller
                  name="monthly_value"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      className="bg-secondary border-border font-mono-code"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
                {errors.monthly_value && <p className="text-xs text-destructive">{errors.monthly_value.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Frequência de Cobrança</Label>
                <Controller
                  name="payment_frequency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="annual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Revisões por Entrega</Label>
                  <span className="font-mono-code text-sm text-primary">{values.max_revisions}</span>
                </div>
                <Controller
                  name="max_revisions"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      min={1} max={5} step={1}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>SLA de Entrega</Label>
                <Controller
                  name="deadline"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 horas</SelectItem>
                        <SelectItem value="48h">48 horas</SelectItem>
                        <SelectItem value="72h">72 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </section>

          {/* D) Captação info */}
          {values.include_capture && (
            <section className="space-y-3 rounded-lg border border-border/50 bg-secondary/30 p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Captação Presencial
              </h3>
              <p className="text-xs text-muted-foreground">
                O cliente terá <span className="text-primary font-semibold">1 captação presencial por mês</span> com agendamento completo (data, horário e local).
              </p>
            </section>
          )}

          {/* E) Subtask Templates */}
          {availableDeliveryTypes.length > 0 && (
            <SubtaskTemplateEditor
              templates={subtaskTemplates}
              onChange={setSubtaskTemplates}
              availableTypes={availableDeliveryTypes}
            />
          )}

          {/* F) Preview */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Preview do Projeto</h3>
            <div className="glass rounded-xl p-5 border border-primary/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{values.project_name || 'Nome do Projeto'}</h4>
                  {values.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{values.description}</p>
                  )}
                </div>
                <span className="font-mono-code text-xl font-bold text-primary">
                  R$ {(values.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-xs text-muted-foreground font-normal">/mês</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {values.youtube_videos > 0 && <Badge variant="secondary"><Youtube className="h-3 w-3 mr-1" />{values.youtube_videos} YT/mês</Badge>}
                {values.instagram_videos > 0 && <Badge variant="secondary"><Instagram className="h-3 w-3 mr-1" />{values.instagram_videos} IG/mês</Badge>}
                {values.include_thumbnails && <Badge variant="secondary"><Image className="h-3 w-3 mr-1" />Thumbnails</Badge>}
                {values.include_covers && <Badge variant="secondary"><FileImage className="h-3 w-3 mr-1" />Capas</Badge>}
                {values.include_script && <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />Roteiro IA</Badge>}
                {values.include_capture && <Badge variant="secondary"><Camera className="h-3 w-3 mr-1" />1 Captação/mês</Badge>}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                <span>SLA: {values.deadline}</span>
                <span>Revisões: {values.max_revisions}</span>
                <span>{FREQ_LABELS[values.payment_frequency]}</span>
                {subtaskTemplates.length > 0 && <span>{subtaskTemplates.length} subtask(s)</span>}
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="neon" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? 'Salvar Alterações' : 'Criar Projeto')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectCreatorModal;
