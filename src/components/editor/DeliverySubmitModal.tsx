import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Send, Link2, Upload, FileVideo, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const ACCEPTED_EXT = '.mp4,.mov,.avi,.webm';
const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

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
  const [tab, setTab] = useState<'link' | 'upload'>('link');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const sanitizeFileName = (name: string) =>
    name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Formato não suportado. Use .mp4, .mov, .avi ou .webm');
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 500 MB');
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const uploadFile = async (): Promise<string> => {
    if (!selectedFile) throw new Error('Nenhum arquivo selecionado');

    const safeName = sanitizeFileName(selectedFile.name);
    const path = `${deliveryId}/${Date.now()}-${safeName}`;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Não autenticado');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/delivery-files/${path}`;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', selectedFile!.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload falhou: ${xhr.statusText || 'erro desconhecido'}`));
        }
      };

      xhr.onerror = () => reject(new Error('Erro de rede durante upload'));
      xhr.onabort = () => reject(new Error('Upload cancelado'));
      xhr.send(selectedFile);
    });

    setUploadProgress(100);

    const { data: urlData } = supabase.storage
      .from('delivery-files')
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (tab === 'link') {
      if (!validateUrl(fileUrl)) return;
    } else {
      if (!selectedFile) {
        toast.error('Selecione um arquivo para enviar');
        return;
      }
    }

    setSubmitting(true);
    try {
      let finalUrl = fileUrl.trim();

      if (tab === 'upload') {
        finalUrl = await uploadFile();
      }

      const { error } = await supabase
        .from('deliveries')
        .update({
          file_url: finalUrl,
          revision_notes: notes.trim() || null,
          status: 'review' as any,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (error) throw error;

      logger.info('Editor entregou vídeo', { delivery_id: deliveryId, method: tab }, 'editor');
      toast.success('Entrega confirmada! O cliente foi notificado.');
      resetForm();
      onOpenChange(false);
      onSubmitted();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao confirmar entrega');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFileUrl('');
    setNotes('');
    setUrlError('');
    setSelectedFile(null);
    setUploadProgress(0);
    setTab('link');
  };

  const handleClose = (open: boolean) => {
    if (!submitting) {
      onOpenChange(open);
      if (!open) resetForm();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'link' | 'upload')}>
            <TabsList className="w-full">
              <TabsTrigger value="link" className="flex-1 gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Link externo
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload de arquivo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link">
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
            </TabsContent>

            <TabsContent value="upload">
              <div className="space-y-3">
                {!selectedFile ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      dragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Arraste o arquivo ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .mp4, .mov, .avi, .webm — máx 500 MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_EXT}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileVideo className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                      </div>
                      {!submitting && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => { setSelectedFile(null); setUploadProgress(0); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {submitting && uploadProgress > 0 && (
                      <div className="space-y-1">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-[10px] text-muted-foreground text-right">
                          {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

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
