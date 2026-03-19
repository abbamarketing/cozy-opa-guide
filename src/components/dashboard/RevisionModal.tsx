import { useState } from 'react';
import { countWeekdayHours } from '@/lib/business-hours';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, Volume2, Palette, Scissors, FileText, Timer, Pin } from 'lucide-react';
import type { DeliveryData } from './DeliveryCard';

interface RevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryData;
  onRevisionSent: () => void;
  userProject: Record<string, unknown> | null | undefined;
}

const FEEDBACK_CATEGORIES = [
  { id: 'audio', label: 'Áudio', icon: Volume2, placeholder: 'Ex: Volume da música muito alto nos primeiros 30s' },
  { id: 'visual', label: 'Visual', icon: Palette, placeholder: 'Ex: Cor do texto no minuto 1:20 está diferente da identidade' },
  { id: 'cortes', label: 'Cortes', icon: Scissors, placeholder: 'Ex: Transição brusca em 2:15, suavizar' },
  { id: 'texto', label: 'Texto/Legenda', icon: FileText, placeholder: 'Ex: Erro de digitação na legenda em 0:45' },
  { id: 'ritmo', label: 'Ritmo', icon: Timer, placeholder: 'Ex: Parte entre 3:00-4:00 está lenta, acelerar' },
  { id: 'outro', label: 'Outro', icon: Pin, placeholder: 'Descreva o ajuste necessário em detalhe...' },
];

const revisionSchema = z.object({
  category: z.string().min(1, 'Selecione uma categoria'),
  notes: z
    .string()
    .trim()
    .min(15, 'Descreva a revisão com pelo menos 15 caracteres para garantir clareza')
    .max(2000, 'Máximo de 2000 caracteres'),
  timestamp_marker: z
    .string()
    .trim()
    .regex(/^(\d{1,2}:)?\d{1,2}:\d{2}$/, 'Use o formato M:SS ou H:MM:SS (ex: 1:23 ou 0:45)')
    .optional()
    .or(z.literal('')),
});

type RevisionValues = z.infer<typeof revisionSchema>;

const RevisionModal = ({ open, onOpenChange, delivery, onRevisionSent, userProject }: RevisionModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remaining = (delivery.max_revisions != null)
    ? delivery.max_revisions - (delivery.revision_count ?? 0)
    : null;

  const form = useForm<RevisionValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: { notes: '', timestamp_marker: '', category: '' },
  });

  const selectedCategory = form.watch('category');
  const activeCat = FEEDBACK_CATEGORIES.find((c) => c.id === selectedCategory);

  const onSubmit = async (values: RevisionValues) => {
    if (!user) return;
    if (remaining !== null && remaining <= 0) return;
    setIsSubmitting(true);

    const catLabel = FEEDBACK_CATEGORIES.find((c) => c.id === values.category)?.label || '';
    const formattedNotes = `[${catLabel}] ${values.notes}`;

    try {
      const { error: revError } = await supabase.from('delivery_revisions').insert({
        delivery_id: delivery.id,
        requested_by: user.id,
        notes: formattedNotes,
        timestamp_marker: values.timestamp_marker || null,
        category: values.category,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic insert payload
      } as any);
      if (revError) throw revError;

      const updateData: Record<string, unknown> = {
        status: 'revision',
        revision_count: delivery.revision_count + 1,
        revision_notes: formattedNotes,
      };

      // Recalcular SLA deadline para clientes de assinatura
      if (userProject?.client_type === 'subscription' && userProject?.sla_hours) {
        const newDeadline = countWeekdayHours(new Date(), userProject.sla_hours);
        updateData.sla_deadline = newDeadline.toISOString();
      }

      const { error: delError } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', delivery.id);
      if (delError) throw delError;

      logger.info('Revisão solicitada', { delivery_id: delivery.id, category: values.category }, 'delivery');
      toast.success('Revisão solicitada com sucesso!');
      form.reset();
      onOpenChange(false);
      onRevisionSent();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao solicitar revisão';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Solicitar Ajustes
          </DialogTitle>
          <DialogDescription>
            Selecione a categoria e descreva exatamente o que precisa ser alterado em "{delivery.title}"
          </DialogDescription>
        </DialogHeader>

        {remaining !== null ? (
          remaining > 0 ? (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
              Você tem <span className="font-semibold text-foreground">{remaining}</span>{' '}
              {remaining === 1 ? 'revisão restante' : 'revisões restantes'}
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Limite de revisões atingido. Entre em contato com o suporte para solicitar mais revisões.
            </div>
          )
        ) : (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
            Revisões ilimitadas
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category selector */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria do ajuste *</FormLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => field.onChange(cat.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
                            field.value === cat.id
                              ? 'bg-primary text-primary-foreground ring-1 ring-primary/30'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <CatIcon className="h-3 w-3" /> {cat.label}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição detalhada do ajuste *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={activeCat?.placeholder || 'Descreva detalhadamente o que precisa ser alterado...'}
                      rows={4}
                      maxLength={2000}
                    />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground">
                    Seja específico: inclua timestamps, descrição do problema e resultado esperado
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timestamp_marker"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marcador de tempo (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: 1:23"
                      maxLength={10}
                      className="font-mono"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">Ex: 0:45 ou 1:23 ou 1:02:30</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting || (remaining !== null && remaining <= 0)} className="w-full gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar Solicitação de Ajuste
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RevisionModal;
