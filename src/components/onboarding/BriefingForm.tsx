import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play, ArrowRight, ArrowLeft, Loader2, Upload, X, Palette } from 'lucide-react';
import { toast } from 'sonner';

const briefingSchema = z.object({
  brand_name: z
    .string()
    .trim()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hex (ex: #86efac)'),
});

type BriefingFormData = z.infer<typeof briefingSchema>;

interface BriefingFormProps {
  onComplete?: () => void;
}

const BriefingForm = ({ onComplete }: BriefingFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [currentStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BriefingFormData>({
    resolver: zodResolver(briefingSchema),
    defaultValues: {
      brand_name: '',
      primary_color: '#86efac',
    },
  });

  const primaryColor = watch('primary_color');

  const handleFile = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande', { description: 'Máximo 2MB' });
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      toast.error('Formato inválido', { description: 'Use PNG, JPG ou SVG' });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
  };

  const onSubmit = async (data: BriefingFormData) => {
    if (!user) return;
    setSaving(true);

    let logoUrl: string | null = null;

    // Upload logo if present
    if (logoFile) {
      const ext = logoFile.name.split('.').pop();
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(path, logoFile);

      if (uploadError) {
        toast.error('Erro ao enviar logo', { description: uploadError.message });
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(path);
      logoUrl = urlData.publicUrl;
    }

    // Save briefing
    const { error } = await supabase.from('onboarding_briefings').insert({
      user_id: user.id,
      brand_name: data.brand_name,
      primary_color: data.primary_color,
      logo_url: logoUrl,
      secondary_color: '#0EA5E9',
      legend_style: 'minimalist',
      jump_cuts: true,
      remove_silences: true,
      use_emojis: true,
      use_icons: true,
      brand_colors: [data.primary_color, '#0EA5E9'],
      completed: false,
    } as any);

    if (error) {
      toast.error('Erro ao salvar briefing', { description: error.message });
    } else {
      toast.success('Briefing salvo!');
      if (onComplete) {
        onComplete();
      } else {
        navigate('/dashboard');
      }
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-xl gradient-neon flex items-center justify-center">
            <Play className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">
            Abba<span className="text-primary">Video</span>
          </span>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Passo {currentStep} de 3</span>
            <span>{Math.round((currentStep / 3) * 100)}%</span>
          </div>
          <Progress value={(currentStep / 3) * 100} className="h-1.5" />
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-border/50">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Configure sua marca</h1>
            <p className="text-sm text-muted-foreground">
              Informações básicas para começar (você pode adicionar mais detalhes depois)
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Brand Name */}
            <div className="space-y-2">
              <Label htmlFor="brand_name">Nome da marca/canal *</Label>
              <Input
                id="brand_name"
                placeholder="Ex: Fitness com João"
                className="bg-secondary border-border"
                {...register('brand_name')}
              />
              {errors.brand_name && (
                <p className="text-xs text-destructive">{errors.brand_name.message}</p>
              )}
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" /> Cor principal *
              </Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setValue('primary_color', e.target.value)}
                    className="h-12 w-12 rounded-xl border border-border cursor-pointer bg-transparent"
                  />
                </div>
                <Input
                  placeholder="#86efac"
                  className="bg-secondary border-border font-mono-code flex-1"
                  {...register('primary_color')}
                />
                <div
                  className="h-12 w-24 rounded-xl border border-border"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              {errors.primary_color && (
                <p className="text-xs text-destructive">{errors.primary_color.message}</p>
              )}
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo (opcional)</Label>
              {logoPreview ? (
                <div className="relative glass rounded-xl p-4 flex items-center gap-4">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-lg object-contain bg-secondary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{logoFile?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {logoFile ? (logoFile.size / 1024).toFixed(0) : 0} KB
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={removeLogo}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`glass rounded-xl p-8 text-center cursor-pointer transition-all border-2 border-dashed ${
                    dragging ? 'border-primary bg-primary/5' : 'border-border/50'
                  }`}
                  onClick={() => document.getElementById('logo-input')?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arraste e solte ou <span className="text-primary">clique para selecionar</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou SVG • Máx. 2MB</p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Você pode adicionar depois se preferir
                  </p>
                  <input
                    id="logo-input"
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg"
                    onChange={onFileSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button type="submit" variant="neon" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BriefingForm;
