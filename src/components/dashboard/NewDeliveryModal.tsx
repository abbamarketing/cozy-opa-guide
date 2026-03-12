import { useState, useMemo } from 'react';
import { addBusinessHours } from '@/lib/business-hours';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Camera, Image, Layers, Upload, Link, Clock } from 'lucide-react';
import type { UserProjectData } from '@/hooks/useUserProject';

interface NewDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProject: UserProjectData;
  onCreated: () => void;
}

type DeliveryType = 'youtube_video' | 'instagram_video' | 'thumbnail' | 'cover';
type MaterialOption = 'upload' | 'drive' | 'later';

const driveUrlRegex = /^https:\/\/(drive\.google\.com|docs\.google\.com)\/.+/;

const formSchema = z.object({
  delivery_type: z.enum(['youtube_video', 'instagram_video', 'thumbnail', 'cover'], {
    required_error: 'Selecione o tipo de entrega',
  }),
  title: z
    .string()
    .trim()
    .min(5, 'O título deve ter pelo menos 5 caracteres')
    .max(100, 'Máximo de 100 caracteres'),
  description: z
    .string()
    .trim()
    .min(20, 'Por favor, forneça mais detalhes sobre o que você deseja (mínimo 20 caracteres)')
    .max(5000, 'Máximo de 5000 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

interface QuotaInfo {
  type: DeliveryType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  total: number;
  used: number;
  available: number;
}

const NewDeliveryModal = ({
  open,
  onOpenChange,
  userProject,
  onCreated,
}: NewDeliveryModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiScript, setAiScript] = useState(false);
  const [scriptContent, setScriptContent] = useState('');
  const [materialOption, setMaterialOption] = useState<MaterialOption>('later');
  const [driveLink, setDriveLink] = useState('');
  const [driveLinkError, setDriveLinkError] = useState('');

  const project = userProject.custom_project;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      delivery_type: undefined,
      title: '',
      description: '',
    },
  });

  const selectedType = form.watch('delivery_type');
  const isVideo = selectedType === 'youtube_video' || selectedType === 'instagram_video';

  // Build quota info
  const quotas = useMemo<QuotaInfo[]>(() => {
    const result: QuotaInfo[] = [];
    if (project.youtube_videos > 0) {
      const used = userProject.youtube_reserved + userProject.youtube_approved;
      result.push({
        type: 'youtube_video',
        label: 'Vídeo YouTube',
        icon: Video,
        total: project.youtube_videos,
        used,
        available: project.youtube_videos - used,
      });
    }
    if (project.instagram_videos > 0) {
      const used = userProject.instagram_reserved + userProject.instagram_approved;
      result.push({
        type: 'instagram_video',
        label: 'Vídeo Instagram',
        icon: Camera,
        total: project.instagram_videos,
        used,
        available: project.instagram_videos - used,
      });
    }
    if (project.include_thumbnails) {
      const used = userProject.thumbnails_reserved + userProject.thumbnails_approved;
      result.push({
        type: 'thumbnail',
        label: 'Thumbnail',
        icon: Image,
        total: project.youtube_videos,
        used,
        available: project.youtube_videos - used,
      });
    }
    if (project.include_covers) {
      const used = userProject.covers_reserved + userProject.covers_approved;
      result.push({
        type: 'cover',
        label: 'Capa',
        icon: Layers,
        total: project.instagram_videos,
        used,
        available: project.instagram_videos - used,
      });
    }
    return result;
  }, [userProject, project]);

  // Deadline calculation - always use project default
  const getDeadlineHours = () => {
    return project.deadline === '24h' ? 24 : project.deadline === '48h' ? 48 : 72;
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    // Validate drive link if selected
    if (isVideo && materialOption === 'drive') {
      if (!driveLink.trim()) {
        setDriveLinkError('Insira o link do Google Drive');
        return;
      }
      if (!driveUrlRegex.test(driveLink.trim())) {
        setDriveLinkError('Link inválido. Use um link do Google Drive');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const dueDate = addBusinessHours(new Date(), getDeadlineHours()).toISOString();

      // Build description with extras
      let fullDescription = values.description;
      if (project.include_script && scriptContent.trim()) {
        fullDescription += `\n\n---\n${aiScript ? '💡 Ideias para roteiro IA' : '📝 Roteiro'}:\n${scriptContent}`;
      }
      if (isVideo && materialOption === 'drive' && driveLink.trim()) {
        fullDescription += `\n\n📁 Material: ${driveLink.trim()}`;
      }
      if (isVideo && materialOption === 'later') {
        fullDescription += '\n\n📁 Material: será enviado depois';
      }

      // 1. Create delivery
      const insertData: Record<string, any> = {
        user_project_id: userProject.id,
        delivery_type: values.delivery_type,
        title: values.title,
        description: fullDescription,
        status: 'pending',
        due_date: dueDate,
        max_revisions: project.max_revisions,
      };

      // Store drive link in dedicated column
      if (isVideo && materialOption === 'drive' && driveLink.trim()) {
        insertData.drive_link = driveLink.trim();
      }

      const { error: deliveryError } = await supabase.from('deliveries').insert(insertData as any);

      if (deliveryError) throw deliveryError;

      // Quota is now automatically reserved by the database trigger (reserve_quota_on_create)

      logger.info('Entrega criada', { delivery_type: values.delivery_type, title: values.title }, 'delivery');
      toast.success('Solicitação criada com sucesso!');
      onOpenChange(false);
      form.reset();
      setScriptContent('');
      setDriveLink('');
      setMaterialOption('later');
      setAiScript(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
          <DialogDescription>Preencha os detalhes da sua entrega</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* 1. Tipo de Entrega */}
            <FormField
              control={form.control}
              name="delivery_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Entrega</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-2"
                    >
                      {quotas.map((q) => {
                        const disabled = q.available <= 0;
                        const Icon = q.icon;
                        return (
                          <label
                            key={q.type}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                              disabled
                                ? 'cursor-not-allowed border-border/30 opacity-40'
                                : field.value === q.type
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-border/80'
                            }`}
                          >
                            <RadioGroupItem
                              value={q.type}
                              disabled={disabled}
                              className="sr-only"
                            />
                            <Icon className="h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-card-foreground">
                                {q.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {q.available} disponíve{q.available !== 1 ? 'is' : 'l'}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 2. Título */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Vídeo sobre como fazer X"
                      maxLength={100}
                    />
                  </FormControl>
                  <div className="flex justify-between">
                    <FormMessage />
                    <span className="text-[10px] text-muted-foreground">
                      {field.value.length}/100
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* 3. Descrição/Briefing */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Briefing</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva o que você quer neste vídeo, o objetivo, público-alvo..."
                      rows={4}
                      maxLength={5000}
                    />
                  </FormControl>
                  <div className="flex justify-between">
                    <FormMessage />
                    <span className="text-[10px] text-muted-foreground">
                      {field.value.length}/5000 (min 50)
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* 4. Roteiro (condicional) */}
            {project.include_script && (
              <div className="space-y-3 rounded-lg border border-border/50 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Roteiro</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {aiScript ? '✨ IA' : '📝 Manual'}
                    </span>
                    <Switch checked={aiScript} onCheckedChange={setAiScript} />
                  </div>
                </div>
                <Textarea
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  placeholder={
                    aiScript
                      ? 'Descreva suas ideias iniciais para o roteiro...'
                      : 'Cole ou escreva o roteiro aqui...'
                  }
                  rows={3}
                  maxLength={10000}
                />
              </div>
            )}

            {/* 5. Material bruto (condicional - vídeos) */}
            {isVideo && (
              <div className="space-y-3 rounded-lg border border-border/50 p-3">
                <Label className="text-sm">Material Bruto</Label>
                <RadioGroup
                  value={materialOption}
                  onValueChange={(v) => {
                    setMaterialOption(v as MaterialOption);
                    setDriveLinkError('');
                  }}
                  className="space-y-2"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-card-foreground">
                    <RadioGroupItem value="drive" />
                    <Link className="h-3.5 w-3.5 text-muted-foreground" />
                    Link do Google Drive
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-card-foreground">
                    <RadioGroupItem value="later" />
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    Vou enviar depois
                  </label>
                </RadioGroup>

                {materialOption === 'drive' && (
                  <div>
                    <Input
                      value={driveLink}
                      onChange={(e) => {
                        setDriveLink(e.target.value);
                        setDriveLinkError('');
                      }}
                      placeholder="https://drive.google.com/..."
                      maxLength={500}
                    />
                    {driveLinkError && (
                      <p className="mt-1 text-xs text-destructive">{driveLinkError}</p>
                    )}
                  </div>
                )}
              </div>
            )}


            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Solicitação
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewDeliveryModal;
