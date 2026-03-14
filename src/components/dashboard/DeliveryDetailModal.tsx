import { useEffect, useState, useCallback } from 'react';
import { format, differenceInHours, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useDeliveries } from '@/hooks/useDeliveries';
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
  Circle,
  Loader2,
  Wrench,
} from 'lucide-react';
import type { DeliveryData } from './DeliveryCard';
import { typeConfig, statusConfig } from './DeliveryCard';
import RevisionModal from './RevisionModal';
import DeliveryChat from '@/components/shared/DeliveryChat';
import SubtaskList from '@/components/shared/SubtaskList';
import DeliveryChecklist from './DeliveryChecklist';
import ApprovalCelebration from './ApprovalCelebration';

interface DeliveryDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryData | null;
  onUpdated: () => void;
  userProject?: any;
}

interface RevisionRecord {
  id: string;
  notes: string;
  timestamp_marker: string | null;
  created_at: string;
}

const DeliveryDetailModal = ({ open, onOpenChange, delivery, onUpdated, userProject }: DeliveryDetailModalProps) => {
  const { user } = useAuth();
  const { updateDelivery } = useDeliveries(delivery?.user_project_id ?? '');
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!delivery || !open) return;
    const fetchRevisions = async () => {
      const { data } = await supabase
        .from('delivery_revisions')
        .select('*')
        .eq('delivery_id', delivery.id)
        .order('created_at', { ascending: false });
      if (data) setRevisions(data);
    };
    fetchRevisions();
  }, [delivery, open]);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
  }, []);

  if (!delivery) return null;

  const config = typeConfig[delivery.delivery_type] || typeConfig.youtube_video;
  const status = statusConfig[delivery.status] || statusConfig.pending;
  const Icon = config.icon;
  const canReview = delivery.status === 'review';
  const isApproved = delivery.status === 'approved';
  const canRevise = canReview && delivery.revision_count < delivery.max_revisions;
  const isVideoType = delivery.delivery_type === 'youtube_video' || delivery.delivery_type === 'instagram_video';

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
      await updateDelivery.mutateAsync({
        id: delivery.id,
        updates: { status: 'approved', approved_at: new Date().toISOString() },
      });

      // Notificação para o editor
      if (delivery.editor_id) {
        await supabase.from('notifications').insert({
          user_id: delivery.editor_id,
          type: 'delivery_approved',
          title: 'Entrega aprovada',
          message: `"${delivery.title}" foi aprovada pelo cliente.`,
          link: '/editor',
        });
      }

      logger.info('Entrega aprovada', { delivery_id: delivery.id, title: delivery.title }, 'delivery');
      setShowCelebration(true);
      toast.success('Entrega aprovada com sucesso! 🎉');
      setTimeout(() => {
        onOpenChange(false);
        onUpdated();
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar');
    } finally {
      setIsApproving(false);
    }
  };

  const timeline: { label: string; date: string | null }[] = [
    { label: 'Criado', date: delivery.created_at },
    { label: 'Entregue', date: delivery.delivered_at },
    { label: 'Aprovado', date: delivery.approved_at },
  ];

  return (
    <>
      <ApprovalCelebration show={showCelebration} onComplete={handleCelebrationComplete} />

      <Dialog open={open && !showRevisionModal} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden p-0">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-4 sm:p-6 space-y-5">
              {/* Header */}
              <DialogHeader>
                <div className="flex items-start gap-2">
                  <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base sm:text-lg leading-snug break-words">{delivery.title}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] shrink-0">{config.label}</Badge>
                      <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Info */}
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

              {/* Subtasks */}
              <SubtaskList deliveryId={delivery.id} role="client" />

              <Separator className="bg-border/50" />

              {/* Checklist - only for review status */}
              {canReview && (
                <>
                  <DeliveryChecklist userProjectId={delivery.user_project_id} />
                  <Separator className="bg-border/50" />
                </>
              )}

              {/* Files */}
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

              {/* Revisions */}
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

              {/* Chat */}
              <div className="space-y-3">
                <DeliveryChat
                  deliveryId={delivery.id}
                  showTimestampInput={isVideoType}
                />
              </div>

              <Separator className="bg-border/50" />

              {/* Timeline */}
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
                        <Wrench className="h-3.5 w-3.5" /> Solicitar Ajustes
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
          userProject={userProject}
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
