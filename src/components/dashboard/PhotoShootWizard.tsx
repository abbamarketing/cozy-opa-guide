import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload, X, CheckCircle, Camera, Stethoscope, Briefcase, Sun,
  Loader2, ChevronLeft, ChevronRight, Sparkles, Download, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePhotoShoot, Scenario, Quantity } from '@/hooks/usePhotoShoot';
import { useStudioCredits } from '@/hooks/useStudioCredits';

type WizardView = 'upload' | 'analyzing' | 'profile-ready' | 'scenario' | 'quantity' | 'generating' | 'result';

const SCENARIOS: { value: Scenario; label: string; desc: string; icon: typeof Camera }[] = [
  { value: 'studio', label: 'Estúdio Fotográfico', desc: 'Fundo neutro, luz profissional, foco no rosto', icon: Camera },
  { value: 'clinic', label: 'Consultório / Clínica', desc: 'Ambiente clínico moderno, postura formal', icon: Stethoscope },
  { value: 'office', label: 'Escritório Executivo', desc: 'Mesa de trabalho, luz natural, ambiente corporativo', icon: Briefcase },
  { value: 'outdoor', label: 'Área Externa', desc: 'Luz natural, cenário urbano ou natureza', icon: Sun },
];

const QUANTITIES: { value: Quantity; label: string; cost: number; popular?: boolean }[] = [
  { value: 1, label: '1 foto', cost: 1 },
  { value: 3, label: '3 fotos', cost: 2, popular: true },
  { value: 5, label: '5 fotos', cost: 3 },
];

const ANALYZE_MESSAGES = [
  'Identificando características...',
  'Mapeando tom de pele...',
  'Mapeando traços faciais...',
  'Construindo seu perfil...',
  'Finalizando análise...',
];

const GENERATE_MESSAGES = [
  'Aplicando iluminação profissional...',
  'Renderizando cenário...',
  'Ajustando composição...',
  'Finalizando detalhes...',
  'Quase pronto...',
];

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <h3 className="text-sm font-mono font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function RotatingMessage({ messages, intervalMs }: { messages: string[]; intervalMs: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(timer);
  }, [messages, intervalMs]);
  return <p className="text-sm text-muted-foreground font-mono animate-pulse">{messages[idx]}</p>;
}

interface PhotoShootWizardProps {
  onBack: () => void;
}

export default function PhotoShootWizard({ onBack }: PhotoShootWizardProps) {
  const {
    isAnalyzing, isGenerating, existingProfile, result, error,
    checkExistingProfile, analyzePhotos, generatePhotos, reset,
  } = usePhotoShoot();
  const { credits, refetch } = useStudioCredits();

  const [view, setView] = useState<WizardView>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [quantity, setQuantity] = useState<Quantity>(3);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkExistingProfile();
  }, [checkExistingProfile]);

  // Keep previews in sync with files
  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  // Transition to analyzing/generating views
  useEffect(() => {
    if (isAnalyzing && view !== 'analyzing') setView('analyzing');
  }, [isAnalyzing, view]);

  useEffect(() => {
    if (isGenerating && view !== 'generating') setView('generating');
  }, [isGenerating, view]);

  // Transition after analysis completes
  useEffect(() => {
    if (!isAnalyzing && view === 'analyzing' && existingProfile && !error) {
      setView('profile-ready');
    }
  }, [isAnalyzing, view, existingProfile, error]);

  // Transition after generation completes
  useEffect(() => {
    if (!isGenerating && view === 'generating' && result && !error) {
      refetch();
      setView('result');
    }
  }, [isGenerating, view, result, error, refetch]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      // Go back to last actionable step
      if (view === 'analyzing') setView('upload');
      if (view === 'generating') setView('quantity');
    }
  }, [error, view]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toast.error(`${f.name}: formato não suportado`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: máximo 5MB`);
        return false;
      }
      return true;
    });
    setFiles(prev => {
      const combined = [...prev, ...validFiles];
      if (combined.length > 10) {
        toast.error('Máximo de 10 fotos');
        return combined.slice(0, 10);
      }
      return combined;
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length) addFiles(pastedFiles);
  };

  const handleAnalyze = () => {
    if (files.length < 5) {
      toast.error('Envie pelo menos 5 fotos');
      return;
    }
    analyzePhotos(files);
  };

  const handleGenerate = () => {
    if (!scenario) return;
    const cost = QUANTITIES.find(q => q.value === quantity)?.cost ?? 1;
    if ((credits?.available ?? 0) < cost) {
      toast.error('Créditos insuficientes');
      return;
    }
    generatePhotos(scenario, quantity);
  };

  const handleFullReset = () => {
    reset();
    setFiles([]);
    setScenario(null);
    setQuantity(3);
    setView('upload');
  };

  const openSafeUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch { /* invalid url */ }
  };

  // ─── UPLOAD ───
  if (view === 'upload') {
    return (
      <div className="space-y-4" onPaste={handlePaste}>
        <StepHeader title="Suas fotos de referência" onBack={onBack} />

        {existingProfile && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px]">Perfil existente</Badge>
              </div>
              <p className="text-xs text-foreground font-mono">
                {existingProfile.person_summary.length > 80
                  ? existingProfile.person_summary.slice(0, 80) + '...'
                  : existingProfile.person_summary}
              </p>
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setView('scenario')}>
                Usar perfil existente <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        )}

        <Card
          className="border-dashed border-border/60 bg-card cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <CardContent className="p-6 flex flex-col items-center gap-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-mono text-foreground">Arraste até 10 fotos ou clique para selecionar</p>
            <p className="text-[11px] text-muted-foreground">JPG, PNG ou WEBP · máx. 5MB cada</p>
          </CardContent>
        </Card>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        />

        {files.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground font-mono">{files.length} de 10 fotos</p>
            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden aspect-square">
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
              }
            </div>
          </>
        )}

        <p className="text-[11px] text-muted-foreground font-mono">
          Envie fotos com boa iluminação, de frente e em ângulos variados.
        </p>

        <Button
          className="w-full gap-2"
          onClick={handleAnalyze}
          disabled={files.length < 5}
        >
          <Sparkles className="h-4 w-4" />
          Analisar fotos {files.length > 0 && `(${files.length})`}
        </Button>
      </div>
    );
  }

  // ─── ANALYZING ───
  if (view === 'analyzing') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h3 className="text-sm font-mono font-semibold text-foreground">Analisando suas fotos...</h3>
          <RotatingMessage messages={ANALYZE_MESSAGES} intervalMs={3000} />
          <Badge variant="outline" className="font-mono text-[10px]">Isso pode levar até 30 segundos</Badge>
        </div>
      </div>
    );
  }

  // ─── PROFILE READY ───
  if (view === 'profile-ready') {
    return (
      <div className="space-y-4">
        <StepHeader title="Perfil criado" onBack={handleFullReset} />
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle className="h-10 w-10 text-primary" />
          <h3 className="text-sm font-mono font-semibold text-foreground">Perfil criado com sucesso</h3>
        </div>
        {existingProfile && (
          <Card className="border-border/40 bg-card">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-mono text-foreground">{existingProfile.person_summary}</p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {existingProfile.photos_used} fotos analisadas
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">Precisão</span>
                  <span className="text-[10px] font-mono text-foreground">
                    {Math.round(existingProfile.overall_confidence * 100)}%
                  </span>
                </div>
                <Progress value={existingProfile.overall_confidence * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}
        <Button className="w-full gap-2" onClick={() => setView('scenario')}>
          Escolher cenário <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ─── SCENARIO ───
  if (view === 'scenario') {
    return (
      <div className="space-y-4">
        <StepHeader title="Escolha o cenário" onBack={() => setView(existingProfile ? 'profile-ready' : 'upload')} />
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map(s => {
            const Icon = s.icon;
            const selected = scenario === s.value;
            return (
              <Card
                key={s.value}
                className={`cursor-pointer transition-all ${
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border/40 bg-card hover:border-border/80'
                }`}
                onClick={() => setScenario(s.value)}
              >
                <CardContent className="p-3 space-y-1.5">
                  <Icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-xs font-mono font-semibold text-foreground">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Button className="w-full gap-2" onClick={() => setView('quantity')} disabled={!scenario}>
          Continuar <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ─── QUANTITY ───
  if (view === 'quantity') {
    const selectedCost = QUANTITIES.find(q => q.value === quantity)?.cost ?? 1;
    return (
      <div className="space-y-4">
        <StepHeader title="Quantas fotos?" onBack={() => setView('scenario')} />
        <div className="grid grid-cols-3 gap-2">
          {QUANTITIES.map(q => {
            const selected = quantity === q.value;
            return (
              <Card
                key={q.value}
                className={`cursor-pointer transition-all relative ${
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border/40 bg-card hover:border-border/80'
                }`}
                onClick={() => setQuantity(q.value)}
              >
                <CardContent className="p-3 flex flex-col items-center gap-1">
                  {q.popular && (
                    <Badge className="absolute -top-2 text-[9px] font-mono px-1.5 py-0">Popular</Badge>
                  )}
                  <span className="text-2xl font-mono font-bold text-foreground">{q.value}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{q.value === 1 ? 'foto' : 'fotos'}</span>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {q.cost} {q.cost === 1 ? 'crédito' : 'créditos'}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1">
          <p className="text-[11px] font-mono text-muted-foreground">Esta ação irá debitar:</p>
          <p className="text-sm font-mono font-semibold text-foreground">
            {selectedCost} {selectedCost === 1 ? 'crédito' : 'créditos'}
            <span className="text-muted-foreground font-normal text-xs ml-1.5">
              (restam {credits?.available ?? '...'} de 10)
            </span>
          </p>
        </div>

        <Button
          className="w-full gap-2"
          onClick={handleGenerate}
          disabled={isGenerating || (credits?.available ?? 0) < selectedCost}
        >
          <Sparkles className="h-4 w-4" /> Gerar Ensaio
        </Button>
      </div>
    );
  }

  // ─── GENERATING ───
  if (view === 'generating') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h3 className="text-sm font-mono font-semibold text-foreground">Gerando seu ensaio...</h3>
          <RotatingMessage messages={GENERATE_MESSAGES} intervalMs={4000} />
          <Badge variant="outline" className="font-mono text-[10px]">Isso pode levar até 60 segundos</Badge>
        </div>
      </div>
    );
  }

  // ─── RESULT ───
  if (view === 'result' && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono font-semibold text-foreground">Seu ensaio está pronto</h3>
          <Button variant="outline" size="sm" className="h-8 font-mono text-xs" onClick={handleFullReset}>
            Novo ensaio
          </Button>
        </div>

        <div className={`grid gap-2 ${result.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {result.photos.map((url, i) => (
            <Card key={i} className="border-border/40 bg-card overflow-hidden group relative">
              <img
                src={url}
                alt={`Foto gerada ${i + 1}`}
                className="w-full aspect-[3/4] object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => openSafeUrl(url)}
                >
                  <Download className="h-3.5 w-3.5" /> Baixar
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground font-mono text-center">
          Fotos disponíveis por 7 dias · Baixe agora
        </p>
      </div>
    );
  }

  // ─── ERROR FALLBACK ───
  return (
    <div className="space-y-4">
      <StepHeader title="Erro" onBack={handleFullReset} />
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 flex flex-col items-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-mono text-foreground">{error || 'Ocorreu um erro inesperado'}</p>
          <Button size="sm" variant="outline" onClick={handleFullReset}>Tentar novamente</Button>
        </CardContent>
      </Card>
    </div>
  );
}
