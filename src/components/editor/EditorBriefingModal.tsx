import { useEffect, useState, useCallback } from 'react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Video,
  Camera,
  Image,
  Layers,
  Clock,
  Circle,
  Download,
  Upload,
  FileText,
  ExternalLink,
  Loader2,
  Palette,
  Type,
  CheckSquare,
  History,
} from 'lucide-react';
import type { DeliveryData } from '@/components/dashboard/DeliveryCard';
import { typeConfig, statusConfig } from '@/components/dashboard/DeliveryCard';
import FileUpload from '@/components/editor/FileUpload';
import DeliveryChat from '@/components/shared/DeliveryChat';

interface EditorBriefingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryData | null;
  onUpdated: () => void;
}

interface BriefingData {
  brand_name: string;
  brand_description: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  brand_colors: any;
  brand_fonts: any;
  legend_style: string | null;
  content_style: string | null;
  target_audience: string | null;
  reference_channels: string[] | null;
  preferred_music_style: string | null;
  jump_cuts: boolean | null;
  remove_silences: boolean | null;
  use_emojis: boolean | null;
  use_icons: boolean | null;
  intro_url: string | null;
  outro_url: string | null;
  additional_notes: string | null;
}

interface RevisionRecord {
  id: string;
  notes: string;
  timestamp_marker: string | null;
  created_at: string;
}

const EditorBriefingModal = ({ open, onOpenChange, delivery, onUpdated }: EditorBriefingModalProps) => {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [clientNote, setClientNote] = useState('');
  const [isDelivering, setIsDelivering] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchData = useCallback(async () => {
    if (!delivery) return;

    const { data: up } = await supabase
      .from('user_projects')
      .select('user_id')
      .eq('id', delivery.user_project_id)
      .single();

    if (up) {
      const { data: b } = await supabase
        .from('onboarding_briefings')
        .select('*')
        .eq('user_id', up.user_id)
        .limit(1)
        .single();
      if (b) setBriefing(b as any);
    }

    const { data: revs } = await supabase
      .from('delivery_revisions' as any)
      .select('*')
      .eq('delivery_id', delivery.id)
      .order('created_at', { ascending: false });
    if (revs) setRevisions(revs as any);
  }, [delivery]);

  useEffect(() => {
    if (open && delivery) {
      fetchData();
      setSelectedStatus(delivery.status);
      setClientNote('');
    }
  }, [open, delivery, fetchData]);

  if (!delivery) return null;

  const config = typeConfig[delivery.delivery_type] || typeConfig.youtube_video;
  const status = statusConfig[delivery.status] || statusConfig.pending;
  const Icon = config.icon;

  const handleMarkAsDelivered = async () => {
    if (!delivery.file_url) {
      toast.error('Anexe um arquivo antes de marcar como entregue.');
      return;
    }
    setIsDelivering(true);

    const updateData: Record<string, any> = {
      status: 'review',
      delivered_at: new Date().toISOString(),
    };
    if (clientNote.trim()) {
      updateData.revision_notes = clientNote.trim();
    }

    const { error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', delivery.id);

    if (error) {
      toast.error('Erro ao entregar: ' + error.message);
    } else {
      toast.success('Entrega marcada como concluída! 🎉');
      onOpenChange(false);
      onUpdated();
    }
    setIsDelivering(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'review' && !delivery.file_url) {
      toast.error('Anexe um arquivo antes de marcar como entregue.');
      return;
    }
    setSelectedStatus(newStatus);
    const updateData: Record<string, any> = { status: newStatus };
    if (newStatus === 'review') {
      updateData.delivered_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', delivery.id);
    if (error) {
      toast.error('Erro ao alterar status');
    } else {
      toast.success('Status atualizado');
      onUpdated();
    }
  };

  // Colors palette
  const colors: { hex: string; label: string }[] = [];
  if (briefing?.primary_color) colors.push({ hex: briefing.primary_color, label: 'Primária' });
  if (briefing?.secondary_color) colors.push({ hex: briefing.secondary_color, label: 'Secundária' });
  if (Array.isArray(briefing?.brand_colors)) {
    briefing.brand_colors.forEach((c: any, i: number) => {
      if (typeof c === 'string' && !colors.find((x) => x.hex === c)) {
        colors.push({ hex: c, label: `Cor ${i + 1}` });
      }
    });
  }

  const fonts = Array.isArray(briefing?.brand_fonts) ? briefing.brand_fonts : [];

  const editPrefs = [
    { key: 'jump_cuts', label: 'Jump cuts', checked: briefing?.jump_cuts },
    { key: 'remove_silences', label: 'Remover silêncios', checked: briefing?.remove_silences },
    { key: 'use_emojis', label: 'Usar emojis', checked: briefing?.use_emojis },
    { key: 'use_icons', label: 'Usar ícones', checked: briefing?.use_icons },
  ];

  const timeline: { label: string; date: string | null }[] = [
    { label: 'Criado', date: delivery.created_at },
    { label: 'Entregue', date: delivery.delivered_at },
    { label: 'Aprovado', date: delivery.approved_at },
  ];

  const deadlineHours = delivery.due_date
    ? differenceInHours(new Date(delivery.due_date), new Date())
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-4">
            {/* Header */}
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Icon className="h-5 w-5 text-primary" />
                <DialogTitle className="flex-1">{delivery.title}</DialogTitle>
                <Select value={selectedStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="review">Entregue</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </DialogHeader>

            {/* Deadline bar */}
            {delivery.due_date && (
              <div className="flex items-center gap-2 text-xs rounded-lg bg-muted/40 px-3 py-2">
                <Clock className={`h-3.5 w-3.5 ${
                  deadlineHours !== null && deadlineHours < 0 ? 'text-destructive' :
                  deadlineHours !== null && deadlineHours <= 12 ? 'text-[hsl(45,93%,47%)]' : 'text-primary'
                }`} />
                <span className="text-muted-foreground">
                  Prazo: {format(new Date(delivery.due_date), "dd/MM 'às' HH'h'", { locale: ptBR })}
                </span>
                {deadlineHours !== null && (
                  <Badge variant="outline" className="ml-auto text-[10px] border-0">
                    {deadlineHours < 0 ? 'Atrasado' : `${deadlineHours}h restantes`}
                  </Badge>
                )}
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="briefing" className="w-full">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="briefing" className="text-xs">Briefing</TabsTrigger>
                <TabsTrigger value="brand" className="text-xs">Marca</TabsTrigger>
                <TabsTrigger value="files" className="text-xs">Arquivos</TabsTrigger>
                <TabsTrigger value="deliver" className="text-xs">Entregas</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
              </TabsList>

              {/* TAB 1: Briefing */}
              <TabsContent value="briefing" className="space-y-4 mt-4">
                {delivery.description && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</h4>
                    <p className="text-sm text-card-foreground whitespace-pre-wrap">{delivery.description}</p>
                  </div>
                )}

                {delivery.revision_notes && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roteiro / Notas</h4>
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                      <p className="text-sm text-card-foreground whitespace-pre-wrap">{delivery.revision_notes}</p>
                    </div>
                  </div>
                )}

                {briefing?.additional_notes && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notas Especiais</h4>
                    <p className="text-sm text-card-foreground whitespace-pre-wrap">{briefing.additional_notes}</p>
                  </div>
                )}

                {briefing?.reference_channels && briefing.reference_channels.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referências</h4>
                    <div className="flex flex-wrap gap-2">
                      {briefing.reference_channels.map((ch, i) => (
                        <a
                          key={i}
                          href={ch.startsWith('http') ? ch : `https://${ch}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> {ch}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {briefing?.content_style && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estilo de Conteúdo</h4>
                    <p className="text-sm text-card-foreground">{briefing.content_style}</p>
                  </div>
                )}

                {briefing?.preferred_music_style && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Música</h4>
                    <p className="text-sm text-card-foreground">{briefing.preferred_music_style}</p>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: Marca */}
              <TabsContent value="brand" className="space-y-4 mt-4">
                {briefing ? (
                  <>
                    {/* Logo */}
                    {briefing.logo_url && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Palette className="h-3 w-3" /> Logo
                        </h4>
                        <div className="flex items-center justify-center rounded-lg border border-border/40 bg-muted/10 p-6">
                          <img
                            src={briefing.logo_url}
                            alt="Logo"
                            className="max-h-24 max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Color palette */}
                    {colors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paleta de Cores</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {colors.slice(0, 6).map((c, i) => (
                            <div key={i} className="flex flex-col items-center rounded-lg border border-border/40 p-3 space-y-1.5">
                              <div
                                className="h-10 w-10 rounded-full border border-border/50"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span className="text-[10px] font-mono text-muted-foreground">{c.hex}</span>
                              <span className="text-[10px] text-muted-foreground">{c.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fonts */}
                    {fonts.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Type className="h-3 w-3" /> Fontes
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {fonts.map((f: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {typeof f === 'string' ? f : f.name || JSON.stringify(f)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Legend style */}
                    {briefing.legend_style && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estilo de Legenda</h4>
                        <p className="text-sm text-card-foreground capitalize">{briefing.legend_style}</p>
                      </div>
                    )}

                    {/* Edit preferences */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CheckSquare className="h-3 w-3" /> Preferências de Edição
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {editPrefs.map((p) => (
                          <div key={p.key} className="flex items-center gap-2">
                            <Checkbox checked={!!p.checked} disabled className="h-3.5 w-3.5" />
                            <span className="text-xs text-card-foreground">{p.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground/60 py-4 text-center">
                    Briefing não encontrado
                  </p>
                )}
              </TabsContent>

              {/* TAB 3: Arquivos */}
              <TabsContent value="files" className="space-y-4 mt-4">
                {delivery.thumbnail_url && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material Bruto</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => window.open(delivery.thumbnail_url!, '_blank')}
                    >
                      <Download className="h-3.5 w-3.5" /> Download Material Bruto
                    </Button>
                  </div>
                )}

                {briefing?.intro_url && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Intro</h4>
                    <a
                      href={briefing.intro_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {briefing.intro_url}
                    </a>
                  </div>
                )}

                {briefing?.outro_url && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outro</h4>
                    <a
                      href={briefing.outro_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {briefing.outro_url}
                    </a>
                  </div>
                )}

                {!delivery.thumbnail_url && !briefing?.intro_url && !briefing?.outro_url && (
                  <p className="text-xs text-muted-foreground/60 py-4 text-center">
                    Nenhum arquivo disponível
                  </p>
                )}
              </TabsContent>

              {/* TAB 4: Entregas */}
              <TabsContent value="deliver" className="space-y-4 mt-4">
                <FileUpload
                  userProjectId={delivery.user_project_id}
                  deliveryId={delivery.id}
                  currentFileUrl={delivery.file_url}
                  currentDriveLink={null}
                  onUploaded={() => onUpdated()}
                  onDriveLinkSaved={() => onUpdated()}
                />

                <Separator className="bg-border/50" />

                {/* Note for client */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações para o cliente (opcional)</h4>
                  <Textarea
                    value={clientNote}
                    onChange={(e) => setClientNote(e.target.value)}
                    placeholder="Ex: Fiz ajustes no áudio conforme pedido..."
                    rows={3}
                    className="text-sm"
                  />
                </div>

                {/* Deliver button */}
                <Button
                  className="w-full gap-2"
                  disabled={isDelivering || !delivery.file_url}
                  onClick={handleMarkAsDelivered}
                >
                  {isDelivering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Marcar como Entregue
                </Button>
              </TabsContent>

              {/* TAB 5: Histórico */}
              <TabsContent value="history" className="space-y-4 mt-4">
                {/* Timeline */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <History className="h-3 w-3" /> Timeline
                  </h4>
                  <div className="space-y-2 pl-2 border-l-2 border-border/40 ml-1">
                    {timeline
                      .filter((t) => t.date)
                      .map((t) => (
                        <div key={t.label} className="flex items-center gap-2 text-xs relative">
                          <Circle className="h-2.5 w-2.5 fill-primary text-primary absolute -left-[7.5px]" />
                          <span className="text-muted-foreground ml-3">{t.label}</span>
                          <span className="text-card-foreground">
                            {format(new Date(t.date!), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Revisions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Revisões ({delivery.revision_count}/{delivery.max_revisions})
                  </h4>

                  {revisions.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60">Nenhuma revisão solicitada</p>
                  ) : (
                    <div className="space-y-2">
                      {revisions.map((rev) => (
                        <div
                          key={rev.id}
                          className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>
                              {format(new Date(rev.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                            {rev.timestamp_marker && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                ⏱ {rev.timestamp_marker}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-card-foreground">{rev.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EditorBriefingModal;
