import { useState } from 'react';
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
import { Loader2, RotateCcw } from 'lucide-react';
import type { DeliveryData } from './DeliveryCard';

interface RevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryData;
  onRevisionSent: () => void;
}

const revisionSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(10, 'Descreva a revisão com pelo menos 10 caracteres')
    .max(2000, 'Máximo de 2000 caracteres'),
  timestamp_marker: z
    .string()
    .trim()
    .max(20, 'Máximo de 20 caracteres')
    .optional()
    .or(z.literal('')),
});

type RevisionValues = z.infer<typeof revisionSchema>;

const RevisionModal = ({ open, onOpenChange, delivery, onRevisionSent }: RevisionModalProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remaining = delivery.max_revisions - delivery.revision_count;

  const form = useForm<RevisionValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: { notes: '', timestamp_marker: '' },
  });

  const onSubmit = async (values: RevisionValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // 1. Create revision record
      const { error: revError } = await supabase.from('delivery_revisions' as any).insert({
        delivery_id: delivery.id,
        requested_by: user.id,
        notes: values.notes,
        timestamp_marker: values.timestamp_marker || null,
      });
      if (revError) throw revError;

      // 2. Update delivery
      const { error: delError } = await supabase
        .from('deliveries')
        .update({
          status: 'revision',
          revision_count: delivery.revision_count + 1,
          revision_notes: values.notes,
        })
        .eq('id', delivery.id);
      if (delError) throw delError;

      logger.info('Revisão solicitada', { delivery_id: delivery.id }, 'delivery');
      toast.success('Revisão solicitada com sucesso!');
      form.reset();
      onOpenChange(false);
      onRevisionSent();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar revisão');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Solicitar Revisão
          </DialogTitle>
          <DialogDescription>
            Descreva o que precisa ser alterado em "{delivery.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
          Você tem <span className="font-semibold text-foreground">{remaining}</span>{' '}
          {remaining === 1 ? 'revisão restante' : 'revisões restantes'}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas da revisão *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva detalhadamente o que precisa ser alterado..."
                      rows={4}
                      maxLength={2000}
                    />
                  </FormControl>
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
                      maxLength={20}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar Revisão
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RevisionModal;
