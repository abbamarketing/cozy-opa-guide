import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  X,
  FileVideo,
  Music,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

/* ─── Validation ─── */
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'audio/mpeg'];
const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.mp3'];
const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks

const driveLinkSchema = z
  .string()
  .trim()
  .url({ message: 'URL inválida' })
  .refine(
    (url) =>
      url.includes('drive.google.com') ||
      url.includes('docs.google.com') ||
      url.includes('google.com/file'),
    { message: 'Insira um link válido do Google Drive' },
  );

interface FileUploadProps {
  userProjectId: string;
  deliveryId: string;
  currentFileUrl?: string | null;
  currentDriveLink?: string | null;
  onUploaded: (url: string) => void;
  onDriveLinkSaved: (link: string) => void;
}

const FileUpload = ({
  userProjectId,
  deliveryId,
  currentFileUrl,
  currentDriveLink,
  onUploaded,
  onDriveLinkSaved,
}: FileUploadProps) => {
  const { user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [driveLink, setDriveLink] = useState(currentDriveLink || '');
  const [driveLinkError, setDriveLinkError] = useState('');
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const abortRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  // Abort XHR upload on unmount
  useEffect(() => {
    return () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
        xhrRef.current = null;
      }
    };
  }, []);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return `Tipo inválido. Aceitos: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    if (f.size > MAX_SIZE) {
      return 'Arquivo excede 500MB. Use o Google Drive para arquivos maiores.';
    }
    return null;
  };

  const generatePreview = (f: File) => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (f.type.startsWith('video/')) {
      const url = URL.createObjectURL(f);
      setVideoPreview(url);
    } else {
      setVideoPreview(null);
    }
  };

  const selectFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setFile(f);
    setUploadComplete(false);
    generatePreview(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- generatePreview is stable
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) selectFile(f);
    },
    [selectFile],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async () => {
    if (!file || !user) return;
    setIsUploading(true);
    setProgress(0);
    abortRef.current = false;

    const ext = file.name.split('.').pop() || 'mp4';
    const filePath = `${userProjectId}/${deliveryId}/${Date.now()}.${ext}`;

    try {
      // For files under chunk size, upload directly
      if (file.size <= CHUNK_SIZE) {
        const { error } = await supabase.storage.from('ready-videos').upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          duplex: 'half',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- duplex option not in storage types
        } as any);

        if (error) throw error;
        setProgress(100);
      } else {
        // Chunked upload simulation — Supabase doesn't support native chunked,
        // so we upload the full file but track progress via XMLHttpRequest
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('Não autenticado');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const uploadUrl = `${supabaseUrl}/storage/v1/object/ready-videos/${filePath}`;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.setRequestHeader('x-upsert', 'true');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload falhou: ${xhr.statusText}`));
            }
          };

          xhr.onerror = () => reject(new Error('Erro de rede'));
          xhr.onabort = () => reject(new Error('Upload cancelado'));

          // Store ref for cancel
          xhrRef.current = xhr;

          xhr.send(file);
        });
      }

      if (abortRef.current) return;

      const { data: urlData } = supabase.storage
        .from('ready-videos')
        .getPublicUrl(filePath);

      // Update delivery with file URL
      await supabase
        .from('deliveries')
        .update({ file_url: urlData.publicUrl })
        .eq('id', deliveryId);

      setUploadComplete(true);
      toast.success('Upload concluído!');
      onUploaded(urlData.publicUrl);
    } catch (err: unknown) {
      if (!abortRef.current) {
        const message = err instanceof Error ? err.message : 'Erro no upload';
        toast.error(message);
      }
    } finally {
      setIsUploading(false);
      xhrRef.current = null;
    }
  };

  const cancelUpload = () => {
    abortRef.current = true;
    if (xhrRef.current) xhrRef.current.abort();
    setIsUploading(false);
    setProgress(0);
    toast.info('Upload cancelado');
  };

  const clearFile = () => {
    setFile(null);
    setUploadComplete(false);
    setProgress(0);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  /* ─── Drive Link ─── */
  const handleSaveDriveLink = async () => {
    const result = driveLinkSchema.safeParse(driveLink);
    if (!result.success) {
      setDriveLinkError(result.error.errors[0].message);
      return;
    }
    setDriveLinkError('');
    setIsSavingDrive(true);

    const { error } = await supabase
      .from('deliveries')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drive_link not in generated types
      .update({ drive_link: driveLink.trim() } as any)
      .eq('id', deliveryId);

    if (error) {
      toast.error('Erro ao salvar link');
    } else {
      toast.success('Link do Drive salvo!');
      onDriveLinkSaved(driveLink.trim());
    }
    setIsSavingDrive(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* ─── Upload Area ─── */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Upload de Arquivo
        </h4>
        <p className="text-[10px] text-muted-foreground/70">
          Aceitos: {ACCEPTED_EXTENSIONS.join(', ')} · Máx: 500MB
        </p>

        {!file ? (
          <div
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border/50 bg-muted/10 hover:border-border'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Arraste e solte seu arquivo aqui
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">ou</p>
            <label className="mt-2 cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>Selecionar arquivo</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".mp4,.mov,.mp3,video/mp4,video/quicktime,audio/mpeg"
                onChange={handleFileInput}
              />
            </label>
          </div>
        ) : (
          <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-3">
            {/* Preview */}
            {videoPreview && (
              <div className="relative overflow-hidden rounded-md bg-black">
                <video
                  src={videoPreview}
                  className="w-full h-32 object-contain"
                  muted
                  preload="metadata"
                  onLoadedData={(e) => {
                    (e.target as HTMLVideoElement).currentTime = 1;
                  }}
                />
              </div>
            )}

            {/* File info */}
            <div className="flex items-center gap-2">
              {file.type.startsWith('video') ? (
                <FileVideo className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Music className="h-4 w-4 text-primary shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-card-foreground">
                  {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
              {uploadComplete && (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              )}
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={clearFile}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Progress */}
            {isUploading && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{progress}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-destructive text-[10px]"
                    onClick={cancelUpload}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Upload button */}
            {!isUploading && !uploadComplete && (
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={uploadFile}
              >
                <Upload className="h-3.5 w-3.5" /> Fazer Upload
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Size warning */}
      {file && file.size > MAX_SIZE && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Arquivo muito grande</p>
            <p className="text-destructive/80">
              Use o Google Drive para arquivos maiores que 500MB.
            </p>
          </div>
        </div>
      )}

      {/* Current file */}
      {currentFileUrl && !file && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-card-foreground flex-1 truncate">
            Arquivo atual enviado
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => window.open(currentFileUrl, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ─── Google Drive ─── */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ou link do Google Drive
        </h4>

        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://drive.google.com/..."
            value={driveLink}
            onChange={(e) => {
              setDriveLink(e.target.value);
              setDriveLinkError('');
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            maxLength={2048}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDriveLink}
            disabled={!driveLink.trim() || isSavingDrive}
          >
            {isSavingDrive ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              'Salvar'
            )}
          </Button>
        </div>

        {driveLinkError && (
          <p className="text-[10px] text-destructive">{driveLinkError}</p>
        )}

        {currentDriveLink && !driveLink && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
            <a
              href={currentDriveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline truncate"
            >
              {currentDriveLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
