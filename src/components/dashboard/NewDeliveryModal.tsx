import { useState, useMemo, useRef } from 'react';
import { addBusinessHours, countWeekdayHours } from '@/lib/business-hours';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useDeliveries } from '@/hooks/useDeliveries';
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
import { Progress } from '@/components/ui/progress';
import { Loader2, Video, Camera, Image, Layers, Upload, Link, Clock, X, AlertTriangle } from 'lucide-react';
import type { UserProjectData } from '@/hooks/useUserProject';

interface NewDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProject: UserProjectData;
  onCreated: () => void;
}

type DeliveryType = 'youtube_video' | 'instagram_video' | 'thumbnail' | 'cover';
type RawMaterialTab = 'upload' | 'link';

const ACCEPTED_VIDEO_TYPES = '.mp4,.mov,.avi,.mkv';
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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
  const { createDelivery } = useDeliveries(userProject.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiScript, setAiScript] = useState(false);
  const [scriptContent, setScriptContent] = useState('');

  // Raw material state
  const [rawTab, setRawTab] = useState<RawMaterialTab>('upload');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [rawFileUrl, setRawFileUrl] = useState<string | null>(null);
  const [rawDriveLink, setRawDriveLink] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extra fields
  const [clientNotes, setClientNotes] = useState('');
  const [isException, setIsException] = useState(false);
  const [exceptionNotes, setExceptionNotes] = useState('');

  const project = userProject.custom_project;
  const isSubscription = userProject.client_type === 'subscription';

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

  // Check if raw material is provided
  const hasRawMaterial = isVideo
    ? (rawTab === 'upload' && rawFileUrl) || (rawTab === 'link' && rawDriveLink.trim().length > 0)
    : true; // non-video types don't require raw material

  // Build quota info — subscription clients only see short videos
  const quotas = useMemo<QuotaInfo[]>(() => {
    const isSubscription = userProject.client_type === 'subscription';

    if (isSubscription) {
      const used = userProject.instagram_reserved + userProject.instagram_approved;
      const total = (userProject as any).monthly_quota ?? (project?.instagram_videos ?? 0);
      return [{
        type: 'instagram_video' as DeliveryType,
        label: 'Reels / Shorts / TikToks',
        icon: Video,
        total,
        used,
        available: total - used,
      }];
    }

    // Custom / other — show all available types
    const result: QuotaInfo[] = [];
    if (project && project.youtube_videos > 0) {
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
    if (project && project.instagram_videos > 0) {
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

  // Deadline calculation
  const getDeadlineHours = () => {
    return project.deadline === '24h' ? 24 : project.deadline === '48h' ? 48 : 72;
  };

  // Handle file upload
  const handleFileSelect = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande', { description: 'O tamanho máximo é 500MB' });
      return;
    }
    setRawFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${Date.now()}-${file.name}`;

      // Simulate progress since supabase doesn't provide upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const { error } = await supabase.storage.from('raw-files').upload(path, file);
      clearInterval(progressInterval);

      if (error) {
        toast.error('Erro no upload', { description: error.message });
        setRawFile(null);
        setUploadProgress(0);
      } else {
        setUploadProgress(100);
        // Get signed URL for private bucket
        const { data: urlData } = await supabase.storage.from('raw-files').createSignedUrl(path, 60 * 60 * 24 * 365);
        setRawFileUrl(urlData?.signedUrl || path);
        toast.success('Arquivo enviado com sucesso!');
      }
    } catch {
      toast.error('Erro ao enviar arquivo');
      setRawFile(null);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setRawFile(null);
    setRawFileUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetForm = () => {
    form.reset();
    setScriptContent('');
    setAiScript(false);
    setRawTab('upload');
    setRawFile(null);
    setRawFileUrl(null);
    setRawDriveLink('');
    setUploadProgress(0);
    setClientNotes('');
    setIsException(false);
    setExceptionNotes('');
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;

    // Validate raw material for videos
    if (isVideo && !hasRawMaterial) {
      toast.error('Envie o arquivo bruto ou insira um link para continuar');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate deadline based on client type
      let dueDate: string;
      let priorityLevel = 1;

      if ((userProject as any).client_type === 'subscription' && (userProject as any).sla_hours) {
        const deadline = countWeekdayHours(new Date(), (userProject as any).sla_hours);
        dueDate = deadline.toISOString();
        priorityLevel = (userProject as any).priority_level ?? 1;
      } else {
        dueDate = addBusinessHours(new Date(), getDeadlineHours()).toISOString();
        // Para clientes custom, usar o priority_level configurado no projeto
        priorityLevel = (userProject as any).priority_level ?? 1;
      }

      let fullDescription = values.description;
      if (project.include_script && scriptContent.trim()) {
        fullDescription += `\n\n---\n${aiScript ? 'Ideias para roteiro IA' : 'Roteiro'}:\n${scriptContent}`;
      }

      const insertData: Record<string, any> = {
        user_project_id: userProject.id,
        delivery_type: values.delivery_type,
        title: values.title,
        description: fullDescription,
        status: (userProject as any).client_type === 'subscription' ? 'queue' : 'pending',
        due_date: dueDate,
        priority_level: priorityLevel,
        max_revisions: project.max_revisions,
      };

      // Raw material fields
      if (isVideo) {
        if (rawTab === 'upload' && rawFileUrl) {
          insertData.raw_file_url = rawFileUrl;
        }
        if (rawTab === 'link' && rawDriveLink.trim()) {
          insertData.raw_drive_link = rawDriveLink.trim();
        }
      }

      // Client notes
      if (clientNotes.trim()) {
        insertData.client_notes = clientNotes.trim();
      }

      // Exception
      if (isException) {
        insertData.is_exception = true;
        if (exceptionNotes.trim()) {
          insertData.exception_notes = exceptionNotes.trim();
        }
      }

      await createDelivery.mutateAsync(insertData);

      logger.info('Entrega criada', { delivery_type: values.delivery_type, title: values.title }, 'delivery');
      toast.success('Solicitação criada com sucesso!');
      onOpenChange(false);
      resetForm();
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
                      {field.value.length}/5000 (min 20)
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
                      {aiScript ? 'IA' : 'Manual'}
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

            {/* 5. Arquivo bruto (vídeos) */}
            {isVideo && (
              <div className="space-y-3 rounded-lg border border-border/50 p-3">
                <Label className="text-sm font-medium">
                  Enviar arquivo bruto <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Sem arquivo bruto, o editor não poderá iniciar a edição.
                </p>

                {/* Tabs */}
                <div className="flex gap-1 rounded-lg bg-secondary p-1">
                  <button
                    type="button"
                    onClick={() => setRawTab('upload')}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      rawTab === 'upload'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Upload className="mr-1.5 inline h-3.5 w-3.5" />
                    Upload direto
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawTab('link')}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      rawTab === 'link'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Link className="mr-1.5 inline h-3.5 w-3.5" />
                    Link externo
                  </button>
                </div>

                {/* Upload tab */}
                {rawTab === 'upload' && (
                  <div className="space-y-2">
                    {rawFile ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                          <Video className="h-4 w-4 shrink-0 text-primary" />
                          <span className="flex-1 truncate text-sm">{rawFile.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {(rawFile.size / (1024 * 1024)).toFixed(1)}MB
                          </span>
                          {!isUploading && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={clearFile}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        {(isUploading || uploadProgress > 0) && (
                          <Progress value={uploadProgress} className="h-1.5" />
                        )}
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Selecionar vídeo (.mp4, .mov, .avi, .mkv)
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_VIDEO_TYPES}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                      }}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Link tab */}
                {rawTab === 'link' && (
                  <Input
                    value={rawDriveLink}
                    onChange={(e) => setRawDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/... ou link do Dropbox"
                    maxLength={500}
                  />
                )}

                {/* Warning if no material */}
                {!hasRawMaterial && (
                  <p className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Arquivo obrigatório para enviar a solicitação
                  </p>
                )}
              </div>
            )}

            {/* 6. Observações específicas */}
            <div className="space-y-2">
              <Label htmlFor="client_notes" className="text-sm">
                Observações específicas
              </Label>
              <Textarea
                id="client_notes"
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Observações específicas para este vídeo (diferente do seu briefing padrão?)"
                rows={2}
                maxLength={2000}
              />
            </div>

            {/* 7. Exceção */}
            <div className="space-y-3 rounded-lg border border-border/50 p-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">É uma exceção?</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Este vídeo tem instruções diferentes do seu briefing padrão?
                  </p>
                </div>
                <Switch checked={isException} onCheckedChange={setIsException} />
              </div>
              {isException && (
                <Textarea
                  value={exceptionNotes}
                  onChange={(e) => setExceptionNotes(e.target.value)}
                  placeholder="Descreva as diferenças em relação ao seu briefing padrão..."
                  rows={3}
                  maxLength={2000}
                />
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting || isUploading || (isVideo && !hasRawMaterial)}
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
