import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface DeliverySubmitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  deliveryTitle: string;
  onSubmitted: () => void;
}

export default function DeliverySubmitModal({
  open,
  onOpenChange,
  deliveryId,
  deliveryTitle,
  onSubmitted,
}: DeliverySubmitModalProps) {
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('O link do vídeo é obrigatório');
      return false;
    }
    try {
      const parsed = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setUrlError('Use um link com https://');
        return false;
      }
    } catch {
      setUrlError('URL inválida. Use um link completo (ex: https://drive.google.com/...)');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateUrl(fileUrl)) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          file_url: fileUrl.trim(),
          revision_notes: notes.trim() || null,
          status: 'review' as any,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (error) throw error;

      logger.info('Editor entregou vídeo', { delivery_id: deliveryId }, 'editor');
      toast.success('Entrega confirmada! O cliente foi notificado.');
      setFileUrl('');
      setNotes('');
      onOpenChange(false);
      onSubmitted();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao confirmar entrega');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!submitting) {
      onOpenChange(open);
      if (!open) {
        setFileUrl('');
        setNotes('');
        setUrlError('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Entrega</DialogTitle>
          <DialogDescription className="line-clamp-1">
            {deliveryTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="file-url">Link do vídeo *</Label>
            <Input
              id="file-url"
              placeholder="https://drive.google.com/..."
              value={fileUrl}
              onChange={(e) => {
                setFileUrl(e.target.value);
                if (urlError) setUrlError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className={urlError ? 'border-destructive' : ''}
            />
            {urlError && (
              <p className="text-xs text-destructive">{urlError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="editor-notes">
              Notas para o cliente{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="editor-notes"
              placeholder="Ex: Vídeo com legenda automática, versão 1..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              className="resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {notes.length}/500
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Confirmar Entrega
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
