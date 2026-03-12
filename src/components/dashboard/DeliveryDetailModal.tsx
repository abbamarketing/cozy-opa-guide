import { useEffect, useState } from 'react';
import { format, differenceInHours, addDays } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  Check,
  RotateCcw,
  Clock,
  User,
  Calendar,
  FileText,
  Video,
  Camera,
  Image,
  Layers,
  Circle,
  Loader2,
} from 'lucide-react';
import type { DeliveryData } from './DeliveryCard';
import { typeConfig, statusConfig } from './DeliveryCard';
import RevisionModal from './RevisionModal';

interface DeliveryDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryData | null;
  onUpdated: () => void;
}

interface RevisionRecord {
  id: string;
  notes: string;
  timestamp_marker: string | null;
  created_at: string;
}

const DeliveryDetailModal = ({ open, onOpenChange, delivery, onUpdated }: DeliveryDetailModalProps) => {
  const { user } = useAuth();
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!delivery || !open) return;
    const fetchRevisions = async () => {
      const { data } = await supabase
        .from('delivery_revisions' as any)
        .select('*')
        .eq('delivery_id', delivery.id)
        .order('created_at', { ascending: false });
      if (data) setRevisions(data as any);
    };
    fetchRevisions();
  }, [delivery, open]);

  if (!delivery) return null;

  const config = typeConfig[delivery.delivery_type] || typeConfig.youtube_video;
  const status = statusConfig[delivery.status] || statusConfig.pending;
  const Icon = config.icon;
  const canReview = delivery.status === 'review';
  const isApproved = delivery.status === 'approved';
  const canRevise = canReview && delivery.revision_count < delivery.max_revisions;

  // Download available for 90 days after approval
  const downloadExpiry = delivery.approved_at
    ? addDays(new Date(delivery.approved_at), 90)
    : null;

  const deadlineHours = delivery.due_date
    ? differenceInHours(new Date(delivery.due_date), new Date())
    : null;

  const handleApprove = async () => {
    if (!user) return;
    setIsApproving(true);
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', delivery.id);
      if (error) throw error;

      // Increment approved, decrement reserved
      const fieldMap: Record<string, { approved: string; reserved: string }> = {
        youtube_video: { approved: 'youtube_approved', reserved: 'youtube_reserved' },
        instagram_video: { approved: 'instagram_approved', reserved: 'instagram_reserved' },
        thumbnail: { approved: 'thumbnails_approved', reserved: 'thumbnails_reserved' },
        cover: { approved: 'covers_approved', reserved: 'covers_reserved' },
      };
      const fields = fieldMap[delivery.delivery_type];
      if (fields) {
        // Fetch current values
        const { data: up } = await supabase
          .from('user_projects')
          .select(`${fields.approved}, ${fields.reserved}`)
          .eq('id', delivery.user_project_id)
          .single();

        if (up) {
          await supabase
            .from('user_projects')
            .update({
              [fields.approved]: ((up as any)[fields.approved] || 0) + 1,
              [fields.reserved]: Math.max(0, ((up as any)[fields.reserved] || 0) - 1),
            })
            .eq('id', delivery.user_project_id);
        }
      }

      toast.success('Entrega aprovada com sucesso! 🎉');
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar');
    } finally {
      setIsApproving(false);
    }
  };

  // Timeline events
  const timeline: { label: string; date: string | null }[] = [
    { label: 'Criado', date: delivery.created_at },
    { label: 'Entregue', date: delivery.delivered_at },
    { label: 'Aprovado', date: delivery.approved_at },
  ];

  return (
    <>
      <Dialog open={open && !showRevisionModal} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden p-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6 space-y-5">
              {/* Header */}
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <DialogTitle className="flex-1">{delivery.title}</DialogTitle>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </DialogHeader>

              {/* Section 1: Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Informações
                </h3>

                {delivery.description && (
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">
                    {delivery.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* Deadline */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <div>
                      <p className="text-[10px] uppercase">Prazo</p>
                      <p className="text-card-foreground">
                        {delivery.due_date
                          ? format(new Date(delivery.due_date), "dd/MM 'às' HH'h'", { locale: ptBR })
                          : '—'}
                      </p>
                      {deadlineHours !== null && (
                        <p className={`text-[10px] ${
                          deadlineHours < 0 ? 'text-destructive' :
                          deadlineHours <= 12 ? 'text-[hsl(45,93%,47%)]' : 'text-primary'
                        }`}>
                          {deadlineHours < 0 ? 'Atrasado' : `${deadlineHours}h restantes`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <div>
                      <p className="text-[10px] uppercase">Editor</p>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="bg-primary/20 text-[8px] text-primary">
                            {delivery.editor_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-card-foreground text-xs">
                          {delivery.editor_name || 'Não atribuído'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Created */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <div>
                      <p className="text-[10px] uppercase">Criado em</p>
                      <p className="text-card-foreground">
                        {format(new Date(delivery.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Section 2: Files */}
              {(delivery.file_url || delivery.thumbnail_url) && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Arquivos
                    </h3>

                    {delivery.thumbnail_url && (
                      <div className="overflow-hidden rounded-lg border border-border/50">
                        <img
                          src={delivery.thumbnail_url}
                          alt="Preview"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}

                    {delivery.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => window.open(delivery.file_url!, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar Arquivo
                      </Button>
                    )}

                    {isApproved && downloadExpiry && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        Download disponível até{' '}
                        {format(downloadExpiry, 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Separator className="bg-border/50" />
                </>
              )}

              {/* Section 3: Revisions */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Revisões ({delivery.revision_count}/{delivery.max_revisions})
                </h3>

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

              <Separator className="bg-border/50" />

              {/* Section 4: Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Timeline
                </h3>
                <div className="space-y-2">
                  {timeline
                    .filter((t) => t.date)
                    .map((t) => (
                      <div key={t.label} className="flex items-center gap-2 text-xs">
                        <Circle className="h-2 w-2 fill-primary text-primary" />
                        <span className="text-muted-foreground">{t.label}</span>
                        <span className="text-card-foreground">
                          {format(new Date(t.date!), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {canReview && (
                  <>
                    {delivery.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => window.open(delivery.file_url!, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={isApproving}
                      onClick={handleApprove}
                    >
                      {isApproving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Aprovar Entrega
                    </Button>
                    {canRevise && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowRevisionModal(true)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Revisão
                      </Button>
                    )}
                  </>
                )}

                {isApproved && delivery.file_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => window.open(delivery.file_url!, '_blank')}
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar Vídeo
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Revision sub-modal */}
      {delivery && (
        <RevisionModal
          open={showRevisionModal}
          onOpenChange={setShowRevisionModal}
          delivery={delivery}
          onRevisionSent={() => {
            setShowRevisionModal(false);
            onOpenChange(false);
            onUpdated();
          }}
        />
      )}
    </>
  );
};

export default DeliveryDetailModal;
