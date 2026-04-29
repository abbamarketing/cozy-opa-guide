import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useUserProject } from '@/hooks/useUserProject';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Palette, Upload, ImageIcon, Type, X } from 'lucide-react';

interface BrandData {
  brand_name: string;
  brand_description: string;
  primary_color: string;
  secondary_color: string;
  target_audience: string;
  content_style: string;
  legend_style: string;
  preferred_music_style: string;
  reference_channels: string[];
  jump_cuts: boolean;
  remove_silences: boolean;
  use_emojis: boolean;
  use_icons: boolean;
  additional_notes: string;
  logo_url: string;
  intro_url: string;
  outro_url: string;
  brand_fonts: { primary: string; secondary: string };
}

const defaultBrand: BrandData = {
  brand_name: '',
  brand_description: '',
  primary_color: '#86efac',
  secondary_color: '#0EA5E9',
  target_audience: '',
  content_style: '',
  legend_style: 'minimalist',
  preferred_music_style: '',
  reference_channels: [],
  jump_cuts: true,
  remove_silences: true,
  use_emojis: true,
  use_icons: true,
  additional_notes: '',
  logo_url: '',
  intro_url: '',
  outro_url: '',
  brand_fonts: { primary: '', secondary: '' },
};

const LOGO_ACCEPTED = '.png,.jpg,.jpeg,.svg';
const LOGO_MAX_SIZE = 5 * 1024 * 1024;

interface BrandProfileProps {
  briefingId?: string | null;
  onSaved?: (id: string) => void;
}

export default function BrandProfile({ briefingId: briefingIdProp, onSaved }: BrandProfileProps = {}) {
  const { user } = useAuth();
  const { userProject } = useUserProject();
  const [brand, setBrand] = useState<BrandData>(defaultBrand);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [channelsInput, setChannelsInput] = useState('');
  const [briefingId, setBriefingId] = useState<string | null>(briefingIdProp ?? null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadBrand();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadBrand depends on user/briefingIdProp which are deps below
  }, [user, briefingIdProp]);

  const loadBrand = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('onboarding_briefings')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const fonts = (data.brand_fonts as Record<string, unknown>) || {};
      setBriefingId(data.id);
      setBrand({
        brand_name: data.brand_name || '',
        brand_description: data.brand_description || '',
        primary_color: data.primary_color || '#86efac',
        secondary_color: data.secondary_color || '#0EA5E9',
        target_audience: data.target_audience || '',
        content_style: data.content_style || '',
        legend_style: data.legend_style || 'minimalist',
        preferred_music_style: data.preferred_music_style || '',
        reference_channels: data.reference_channels || [],
        jump_cuts: data.jump_cuts ?? true,
        remove_silences: data.remove_silences ?? true,
        use_emojis: data.use_emojis ?? true,
        use_icons: data.use_icons ?? true,
        additional_notes: data.additional_notes || '',
        logo_url: data.logo_url || '',
        intro_url: data.intro_url || '',
        outro_url: data.outro_url || '',
        brand_fonts: {
          primary: Array.isArray(fonts) ? (fonts[0] || '') : (fonts.primary || ''),
          secondary: Array.isArray(fonts) ? (fonts[1] || '') : (fonts.secondary || ''),
        },
      });
      setChannelsInput((data.reference_channels || []).join(', '));
    }
    setLoading(false);
  };

  const update = (key: keyof BrandData, value: string | boolean | Record<string, string>) =>
    setBrand((prev) => ({ ...prev, [key]: value }));

  const updateFont = (key: 'primary' | 'secondary', value: string) =>
    setBrand((prev) => ({
      ...prev,
      brand_fonts: { ...prev.brand_fonts, [key]: value },
    }));

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    if (file.size > LOGO_MAX_SIZE) {
      toast.error('Logo muito grande. Máximo: 5MB');
      return;
    }
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use .png, .jpg ou .svg');
      return;
    }

    setUploadingLogo(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user!.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('brand-logos')
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      toast.error('Erro no upload do logo');
      setUploadingLogo(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(path);
    const newUrl = urlData.publicUrl;

    update('logo_url', newUrl);

    if (briefingId) {
      await supabase
        .from('onboarding_briefings')
        .update({ logo_url: newUrl })
        .eq('id', briefingId);
    }

    toast.success('Logo atualizado!');
    setUploadingLogo(false);
  };

  const handleSave = async () => {
    if (!brand.brand_name.trim()) {
      toast.error('Nome da marca é obrigatório');
      return;
    }

    setSaving(true);

    const payload = {
      brand_name: brand.brand_name.trim(),
      brand_description: brand.brand_description.trim() || null,
      primary_color: brand.primary_color,
      secondary_color: brand.secondary_color,
      target_audience: brand.target_audience.trim() || null,
      content_style: brand.content_style.trim() || null,
      legend_style: brand.legend_style,
      preferred_music_style: brand.preferred_music_style.trim() || null,
      reference_channels: channelsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      jump_cuts: brand.jump_cuts,
      remove_silences: brand.remove_silences,
      use_emojis: brand.use_emojis,
      use_icons: brand.use_icons,
      additional_notes: brand.additional_notes.trim() || null,
      logo_url: brand.logo_url || null,
      intro_url: brand.intro_url || null,
      outro_url: brand.outro_url || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- brand_fonts JSON shape
      brand_fonts: brand.brand_fonts as any,
    };

    let error;
    if (briefingId) {
      ({ error } = await supabase
        .from('onboarding_briefings')
        .update(payload)
        .eq('id', briefingId));
    } else {
      ({ error } = await supabase
        .from('onboarding_briefings')
        .insert({
          ...payload,
          user_id: user!.id,
          user_project_id: userProject?.id || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic insert payload
        } as any));
    }

    setSaving(false);

    if (error) {
      toast.error('Erro ao salvar', { description: error.message });
    } else {
      toast.success('Briefing de marca atualizado!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Identidade da Marca
          </CardTitle>
          <CardDescription>Informações que o editor usará em todas as suas entregas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da Marca *</Label>
              <Input
                value={brand.brand_name}
                onChange={(e) => update('brand_name', e.target.value)}
                placeholder="Ex: Minha Marca"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Público-Alvo</Label>
              <Input
                value={brand.target_audience}
                onChange={(e) => update('target_audience', e.target.value)}
                placeholder="Ex: Jovens 18-35 interessados em tech"
                maxLength={200}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição da Marca</Label>
            <Textarea
              value={brand.brand_description}
              onChange={(e) => update('brand_description', e.target.value)}
              placeholder="Descreva brevemente sua marca, valores e tom de comunicação..."
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Logo da Marca
            </Label>
            <div className="flex items-center gap-4">
              {brand.logo_url && (
                <div className="relative group">
                  <div className="glass rounded-lg p-3 w-fit">
                    <img src={brand.logo_url} alt="Logo" className="h-16 object-contain max-w-[200px]" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => update('logo_url', '')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {brand.logo_url ? 'Trocar logo' : 'Enviar logo'}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1">.png, .jpg, .svg — máx 5MB</p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept={LOGO_ACCEPTED}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cor Principal</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brand.primary_color}
                  onChange={(e) => update('primary_color', e.target.value)}
                  className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={brand.primary_color}
                  onChange={(e) => update('primary_color', e.target.value)}
                  placeholder="#86efac"
                  maxLength={7}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor Secundária</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brand.secondary_color}
                  onChange={(e) => update('secondary_color', e.target.value)}
                  className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={brand.secondary_color}
                  onChange={(e) => update('secondary_color', e.target.value)}
                  placeholder="#0EA5E9"
                  maxLength={7}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Brand Fonts */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" />
              Fontes da Marca
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fonte Principal</Label>
                <Input
                  value={brand.brand_fonts.primary}
                  onChange={(e) => updateFont('primary', e.target.value)}
                  placeholder="Ex: Montserrat, Inter, Roboto"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fonte Secundária (opcional)</Label>
                <Input
                  value={brand.brand_fonts.secondary}
                  onChange={(e) => updateFont('secondary', e.target.value)}
                  placeholder="Ex: Open Sans, Lato"
                  maxLength={100}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editing Preferences */}
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle>Preferências de Edição</CardTitle>
          <CardDescription>Configure como seus vídeos devem ser editados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Estilo de Conteúdo</Label>
            <Input
              value={brand.content_style}
              onChange={(e) => update('content_style', e.target.value)}
              placeholder="Ex: Educativo, dinâmico, com humor"
              maxLength={200}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estilo de Legenda</Label>
              <Select
                value={brand.legend_style}
                onValueChange={(v) => update('legend_style', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimalist">Minimalista</SelectItem>
                  <SelectItem value="bold">Destaque (Bold)</SelectItem>
                  <SelectItem value="karaoke">Karaokê</SelectItem>
                  <SelectItem value="none">Sem legenda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estilo de Música</Label>
              <Input
                value={brand.preferred_music_style}
                onChange={(e) => update('preferred_music_style', e.target.value)}
                placeholder="Ex: Lo-fi, eletrônica, acústica"
                maxLength={200}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'jump_cuts' as const, label: 'Jump Cuts', desc: 'Cortes rápidos entre falas' },
              { key: 'remove_silences' as const, label: 'Remover Silêncios', desc: 'Cortar pausas longas' },
              { key: 'use_emojis' as const, label: 'Usar Emojis', desc: 'Emojis no vídeo' },
              { key: 'use_icons' as const, label: 'Usar Ícones', desc: 'Ícones e gráficos' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between glass rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={brand[key]}
                  onCheckedChange={(v) => update(key, v)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Canais de Referência</Label>
            <Input
              value={channelsInput}
              onChange={(e) => setChannelsInput(e.target.value)}
              placeholder="Ex: @canal1, @canal2, @canal3"
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground">Separe por vírgula</p>
          </div>

          <div className="space-y-2">
            <Label>Observações Adicionais</Label>
            <Textarea
              value={brand.additional_notes}
              onChange={(e) => update('additional_notes', e.target.value)}
              placeholder="Qualquer informação extra para o editor..."
              rows={3}
              maxLength={2000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assets */}
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle>Assets (Opcional)</CardTitle>
          <CardDescription>Links para intro, outro e outros materiais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Link da Intro</Label>
              <Input
                value={brand.intro_url}
                onChange={(e) => update('intro_url', e.target.value)}
                placeholder="https://drive.google.com/..."
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>Link da Outro</Label>
              <Input
                value={brand.outro_url}
                onChange={(e) => update('outro_url', e.target.value)}
                placeholder="https://drive.google.com/..."
                maxLength={500}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </div>
  );
}