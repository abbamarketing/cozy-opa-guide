import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play, ArrowRight, ArrowLeft, Loader2, Upload, X, Palette } from 'lucide-react';
import { toast } from 'sonner';

export interface BriefingFormData {
  brand_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  // Steps 2 & 3 fields (to be added)
  brand_description: string;
  target_audience: string;
  content_style: string;
  reference_channels: string[];
  preferred_music_style: string;
  legend_style: string;
  jump_cuts: boolean;
  remove_silences: boolean;
  use_emojis: boolean;
  use_icons: boolean;
  additional_notes: string;
}

const INITIAL_DATA: BriefingFormData = {
  brand_name: '',
  primary_color: '#86efac',
  secondary_color: '#0EA5E9',
  logo_url: null,
  brand_description: '',
  target_audience: '',
  content_style: '',
  reference_channels: [],
  preferred_music_style: '',
  legend_style: 'minimalist',
  jump_cuts: true,
  remove_silences: true,
  use_emojis: true,
  use_icons: true,
  additional_notes: '',
};

interface BriefingFormProps {
  onComplete?: () => void;
}

const BriefingForm = ({ onComplete }: BriefingFormProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BriefingFormData>(INITIAL_DATA);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof BriefingFormData>(field: K, value: BriefingFormData[K]) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

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
    update('logo_url', null);
  };

  const canAdvanceStep1 = () => {
    return formData.brand_name.trim().length >= 3 &&
      /^#[0-9A-Fa-f]{6}$/.test(formData.primary_color) &&
      /^#[0-9A-Fa-f]{6}$/.test(formData.secondary_color);
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Upload logo if selected but not yet uploaded
      if (logoFile && !formData.logo_url && user) {
        const ext = logoFile.name.split('.').pop();
        const path = `${user.id}/logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('brand-logos')
          .upload(path, logoFile);
        if (uploadError) {
          toast.error('Erro ao enviar logo', { description: uploadError.message });
          return;
        }
        const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(path);
        update('logo_url', urlData.publicUrl);
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate(-1);
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  // Final submit (Step 3 — placeholder for now, will be implemented in future prompt)
  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('onboarding_briefings').insert({
      user_id: user.id,
      brand_name: formData.brand_name,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      logo_url: formData.logo_url,
      brand_description: formData.brand_description || null,
      target_audience: formData.target_audience || null,
      content_style: formData.content_style || null,
      reference_channels: formData.reference_channels.length > 0 ? formData.reference_channels : null,
      preferred_music_style: formData.preferred_music_style || null,
      legend_style: formData.legend_style,
      jump_cuts: formData.jump_cuts,
      remove_silences: formData.remove_silences,
      use_emojis: formData.use_emojis,
      use_icons: formData.use_icons,
      additional_notes: formData.additional_notes || null,
      brand_colors: [formData.primary_color, formData.secondary_color],
      completed: true,
      completed_at: new Date().toISOString(),
    } as any);

    if (error) {
      toast.error('Erro ao salvar briefing', { description: error.message });
    } else {
      toast.success('Briefing salvo com sucesso!');
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
          {/* Step 1 — Identidade da Marca */}
          {currentStep === 1 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Identidade da Marca</h1>
                <p className="text-sm text-muted-foreground">
                  Defina as cores e o visual da sua marca
                </p>
              </div>

              <div className="space-y-6">
                {/* Brand Name */}
                <div className="space-y-2">
                  <Label htmlFor="brand_name">Nome da marca *</Label>
                  <Input
                    id="brand_name"
                    placeholder="Ex: Fitness com João"
                    className="bg-secondary border-border"
                    value={formData.brand_name}
                    onChange={(e) => update('brand_name', e.target.value)}
                  />
                  {formData.brand_name.length > 0 && formData.brand_name.trim().length < 3 && (
                    <p className="text-xs text-destructive">Nome deve ter no mínimo 3 caracteres</p>
                  )}
                </div>

                {/* Primary Color */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Cor primária *
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => update('primary_color', e.target.value)}
                      className="h-12 w-12 rounded-xl border border-border cursor-pointer bg-transparent"
                    />
                    <Input
                      placeholder="#86efac"
                      className="bg-secondary border-border font-mono flex-1"
                      value={formData.primary_color}
                      onChange={(e) => update('primary_color', e.target.value)}
                    />
                    <div
                      className="h-12 w-16 rounded-xl border border-border shrink-0"
                      style={{ backgroundColor: formData.primary_color }}
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Cor secundária *
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => update('secondary_color', e.target.value)}
                      className="h-12 w-12 rounded-xl border border-border cursor-pointer bg-transparent"
                    />
                    <Input
                      placeholder="#0EA5E9"
                      className="bg-secondary border-border font-mono flex-1"
                      value={formData.secondary_color}
                      onChange={(e) => update('secondary_color', e.target.value)}
                    />
                    <div
                      className="h-12 w-16 rounded-xl border border-border shrink-0"
                      style={{ backgroundColor: formData.secondary_color }}
                    />
                  </div>
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
                      <div className="flex-1 min-w-0">
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
              </div>
            </>
          )}

          {/* Step 2 placeholder */}
          {currentStep === 2 && (
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">Estilo de Conteúdo</h1>
              <p className="text-muted-foreground">Passo 2 em breve</p>
            </div>
          )}

          {/* Step 3 placeholder */}
          {currentStep === 3 && (
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">Preferências de Edição</h1>
              <p className="text-muted-foreground">Passo 3 em breve</p>
              <Button className="mt-6" onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Finalizar'}
              </Button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button type="button" variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            {currentStep < 3 && (
              <Button
                onClick={handleNext}
                disabled={currentStep === 1 && !canAdvanceStep1()}
              >
                Próximo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BriefingForm;
