import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Clapperboard, Camera, Sparkles, Copy, Check, StopCircle,
  Loader2, ChevronRight, ChevronLeft, Zap, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { useStudioCredits } from '@/hooks/useStudioCredits';
import { supabase } from '@/integrations/supabase/client';
import ScriptRenderer from './ScriptRenderer';

type ContentType = 'short_video' | 'youtube_video';
type Objective = 'educate' | 'sell' | 'entertain' | 'authority' | 'viral';
type Tone = 'direct' | 'didactic' | 'casual' | 'inspirational' | 'provocative';
type AudienceLevel = 'beginner' | 'intermediate' | 'advanced';
type RecordingLocation = 'home' | 'studio' | 'office' | 'clinic' | 'outdoor' | 'other';
type WizardView = 'home' | 'step1' | 'step2' | 'step3' | 'step4' | 'result';

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-generate`;

const LOCATIONS: { value: RecordingLocation; label: string; icon: string }[] = [
  { value: 'home', label: 'Em casa', icon: 'home' },
  { value: 'studio', label: 'Estúdio', icon: 'studio' },
  { value: 'office', label: 'Escritório', icon: 'office' },
  { value: 'clinic', label: 'Consultório', icon: 'clinic' },
  { value: 'outdoor', label: 'Área externa', icon: 'outdoor' },
  { value: 'other', label: 'Outro', icon: 'other' },
];

function StepHeader({ step, total, title, onBack }: { step: number; total: number; title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Passo {step} de {total}
        </p>
        <h3 className="text-sm font-mono font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1 w-6 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>
    </div>
  );
}

export default function StudioModule() {
  const { credits, isLoading: creditsLoading, refetch } = useStudioCredits();
  const [view, setView] = useState<WizardView>('home');
  const [contentType, setContentType] = useState<ContentType>('short_video');
  const [theme, setTheme] = useState('');
  const [objective, setObjective] = useState<Objective>('educate');
  const [tone, setTone] = useState<Tone>('direct');
  const [audience, setAudience] = useState('');
  const [audienceLevel, setAudienceLevel] = useState<AudienceLevel>('beginner');
  const [recordingLocation, setRecordingLocation] = useState<RecordingLocation>('home');
  const [customLocation, setCustomLocation] = useState('');
  const [referenceChannel, setReferenceChannel] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [copied, setCopied] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const getLocationLabel = () => {
    if (recordingLocation === 'other') return customLocation.trim() || 'Outro';
    return LOCATIONS.find(l => l.value === recordingLocation)?.label ?? recordingLocation;
  };

  const handleGenerate = async () => {
    if (!theme.trim() || !audience.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('Sessão expirada'); return; }
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setGeneratedScript('');
    setView('result');
    try {
      const resp = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          content_type: contentType, theme: theme.trim(), objective, tone,
          audience: audience.trim(), audience_level: audienceLevel,
          recording_location: getLocationLabel(),
          reference_channel: referenceChannel.trim() || undefined,
          keywords: keywords.trim() || undefined,
        }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        if (resp.status === 402) {
          toast.error('Créditos esgotados', { description: 'Seus créditos renovam no dia 1º do próximo mês.' });
        } else if (resp.status === 429) {
          toast.error('Limite de requisições', { description: 'Tente novamente em alguns segundos.' });
        } else {
          toast.error(err.error || 'Erro ao gerar roteiro');
        }
        setLoading(false); setView('step4'); return;
      }
      if (!resp.body) throw new Error('Stream indisponível');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { full += content; setGeneratedScript(full); }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
      if (full) { toast.success('Roteiro gerado! 1 crédito debitado.'); refetch(); }
    } catch (err: any) {
      if (err.name === 'AbortError') { toast.info('Geração cancelada'); } else { toast.error('Erro ao gerar roteiro'); }
      setView('step4');
    } finally { setLoading(false); setAbortController(null); }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedScript);
    setCopied(true); toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setView('home'); setTheme(''); setAudience(''); setReferenceChannel(''); setKeywords('');
    setContentType('short_video'); setObjective('educate'); setTone('direct');
    setAudienceLevel('beginner'); setRecordingLocation('home'); setCustomLocation('');
    setGeneratedScript('');
  };

  // ─── HOME ───
  if (view === 'home') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-mono font-semibold text-foreground">Studio</h2>
            <p className="text-xs text-muted-foreground">Ferramentas criativas com IA</p>
          </div>
          {!creditsLoading && credits && (
            <Badge variant="secondary" className="gap-1.5 font-mono text-xs">
              <Zap className="h-3 w-3 text-primary" />
              {credits.available} de 10 créditos
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            className="cursor-pointer border-border/40 bg-card transition-all hover:border-primary/40 hover:shadow-[0_0_16px_hsl(var(--primary)/0.08)]"
            onClick={() => credits && credits.available > 0 ? setView('step1') : toast.error('Créditos esgotados')}
          >
            <CardHeader className="p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-2">
                <Clapperboard className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-mono">Criar Roteiro</CardTitle>
              <CardDescription className="text-xs">Pipeline de IA em 4 passos. Tom, objetivo e audiência personalizados.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button size="sm" className="w-full gap-1.5"><Sparkles className="h-3.5 w-3.5" />Criar</Button>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card opacity-60 cursor-not-allowed">
            <CardHeader className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Em breve</Badge>
              </div>
              <CardTitle className="text-sm font-mono text-muted-foreground">Ensaio Fotográfico</CardTitle>
              <CardDescription className="text-xs">Geração de fotos profissionais com IA. Disponível em breve.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button size="sm" variant="outline" className="w-full" disabled>Em breve</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── STEP 1: Content Type ───
  if (view === 'step1') {
    return (
      <div className="space-y-4">
        <StepHeader step={1} total={4} title="Tipo de Conteúdo" onBack={handleReset} />
        <Card className="border-border/40 bg-card">
          <CardContent className="p-4 space-y-3">
            <Label className="text-xs font-mono text-muted-foreground">O que você vai criar?</Label>
            <RadioGroup value={contentType} onValueChange={(v) => setContentType(v as ContentType)} className="grid grid-cols-1 gap-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${contentType === 'short_video' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                <RadioGroupItem value="short_video" className="mt-0.5" />
                <div><p className="text-sm font-medium text-card-foreground">Short Video (até 90s)</p><p className="text-[11px] text-muted-foreground">Instagram Reels, YouTube Shorts, TikTok</p></div>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${contentType === 'youtube_video' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'}`}>
                <RadioGroupItem value="youtube_video" className="mt-0.5" />
                <div><p className="text-sm font-medium text-card-foreground">Vídeo YouTube (3-20 min)</p><p className="text-[11px] text-muted-foreground">Tutorial, Vlog, Review aprofundado</p></div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>
        <Button className="w-full gap-2" onClick={() => setView('step2')}>Próximo <ChevronRight className="h-4 w-4" /></Button>
      </div>
    );
  }

  // ─── STEP 2: Context + Location ───
  if (view === 'step2') {
    const objectives: { value: Objective; label: string }[] = [
      { value: 'educate', label: 'Educar' }, { value: 'sell', label: 'Vender' },
      { value: 'entertain', label: 'Entreter' }, { value: 'authority', label: 'Gerar Autoridade' },
      { value: 'viral', label: 'Viralizar' },
    ];
    const tones: { value: Tone; label: string }[] = [
      { value: 'direct', label: 'Direto e objetivo' }, { value: 'didactic', label: 'Didático' },
      { value: 'casual', label: 'Descontraído' }, { value: 'inspirational', label: 'Inspiracional' },
      { value: 'provocative', label: 'Provocativo' },
    ];
    return (
      <div className="space-y-4">
        <StepHeader step={2} total={4} title="Contexto do Vídeo" onBack={() => setView('step1')} />
        <Card className="border-border/40 bg-card">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Tema / assunto *</Label>
              <Textarea placeholder="Ex: Como criar conteúdo para Instagram sem aparecer no vídeo" value={theme} onChange={(e) => setTheme(e.target.value)} rows={3} maxLength={500} className="resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono">Objetivo do vídeo *</Label>
              <div className="flex flex-wrap gap-2">
                {objectives.map((o) => (
                  <button key={o.value} onClick={() => setObjective(o.value)} className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${objective === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80'}`}>{o.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono">Tom de voz *</Label>
              <div className="flex flex-wrap gap-2">
                {tones.map((t) => (
                  <button key={t.value} onClick={() => setTone(t.value)} className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${tone === t.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80'}`}>{t.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Local de gravação *
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc.value}
                    onClick={() => setRecordingLocation(loc.value)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs font-mono border transition-colors ${
                      recordingLocation === loc.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    <span>{loc.label}</span>
                  </button>
                ))}
              </div>
              {recordingLocation === 'other' && (
                <Textarea
                  placeholder="Descreva o local (ex: parque, café, academia...)"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  rows={1}
                  maxLength={100}
                  className="resize-none mt-1"
                />
              )}
            </div>
          </CardContent>
        </Card>
        <Button className="w-full gap-2" onClick={() => setView('step3')} disabled={!theme.trim()}>Próximo <ChevronRight className="h-4 w-4" /></Button>
      </div>
    );
  }

  // ─── STEP 3: Audience ───
  if (view === 'step3') {
    const levels: { value: AudienceLevel; label: string }[] = [
      { value: 'beginner', label: 'Iniciante' }, { value: 'intermediate', label: 'Intermediário' }, { value: 'advanced', label: 'Avançado' },
    ];
    return (
      <div className="space-y-4">
        <StepHeader step={3} total={4} title="Audiência" onBack={() => setView('step2')} />
        <Card className="border-border/40 bg-card">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Para quem é esse vídeo? *</Label>
              <Textarea placeholder="Ex: Empreendedores iniciantes que querem crescer no Instagram sem equipe" value={audience} onChange={(e) => setAudience(e.target.value)} rows={3} maxLength={300} className="resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono">Nível de conhecimento do público *</Label>
              <div className="flex gap-2">
                {levels.map((l) => (
                  <button key={l.value} onClick={() => setAudienceLevel(l.value)} className={`flex-1 px-3 py-2 rounded-md text-xs font-mono border transition-colors ${audienceLevel === l.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80'}`}>{l.label}</button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Button className="w-full gap-2" onClick={() => setView('step4')} disabled={!audience.trim()}>Próximo <ChevronRight className="h-4 w-4" /></Button>
      </div>
    );
  }

  // ─── STEP 4: References + Generate ───
  if (view === 'step4') {
    return (
      <div className="space-y-4">
        <StepHeader step={4} total={4} title="Referências e Geração" onBack={() => setView('step3')} />
        <Card className="border-border/40 bg-card">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Canal ou vídeo de referência <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea placeholder="Ex: @nomecanal ou https://youtube.com/..." value={referenceChannel} onChange={(e) => setReferenceChannel(e.target.value)} rows={2} maxLength={200} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Palavras-chave obrigatórias <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea placeholder="Ex: autoridade, sem aparecer, redes sociais" value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={2} maxLength={200} className="resize-none" />
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
              <p className="text-[11px] font-mono text-muted-foreground">Esta ação irá debitar:</p>
              <p className="text-sm font-mono font-semibold text-foreground">1 crédito <span className="text-muted-foreground font-normal text-xs ml-1.5">(restam {credits?.available ?? '...'} de 10)</span></p>
            </div>
          </CardContent>
        </Card>
        <Button className="w-full gap-2" onClick={handleGenerate} disabled={loading || (credits?.available ?? 0) <= 0}>
          <Sparkles className="h-4 w-4" />Gerar Roteiro
        </Button>
      </div>
    );
  }

  // ─── RESULT ───
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-semibold text-foreground">Roteiro Gerado</h3>
        <div className="flex items-center gap-2">
          {loading && (
            <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={() => abortController?.abort()}>
              <StopCircle className="h-3.5 w-3.5" />Parar
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleReset}>Novo roteiro</Button>
        </div>
      </div>
      <Card className="border-border/40 bg-card">
        <CardContent className="p-4">
          {loading && !generatedScript ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground font-mono">Gerando roteiro...</span>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/20 p-4 border border-border/30 min-h-[200px]">
              <ScriptRenderer content={generatedScript} isStreaming={loading} />
            </div>
          )}
        </CardContent>
      </Card>
      {generatedScript && !loading && (
        <Button className="w-full gap-2" onClick={handleCopy}>
          {copied ? <><Check className="h-4 w-4" />Copiado!</> : <><Copy className="h-4 w-4" />Copiar Roteiro</>}
        </Button>
      )}
    </div>
  );
}
