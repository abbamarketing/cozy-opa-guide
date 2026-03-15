import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { usePhotoShoot } from '@/hooks/usePhotoShoot';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Download, Upload, Brain, CheckCircle2, Loader2 } from 'lucide-react';

interface ScenarioItem {
  id: string;
  category: string;
  label: string;
  desc: string;
  icon: string;
}

const SCENARIOS: ScenarioItem[] = [
  // Corporativo
  { id: 'executive_office',       category: 'Corporativo',  label: 'Executivo',             desc: 'Escritório com vista panorâmica',            icon: '🏙️' },
  { id: 'boardroom',              category: 'Corporativo',  label: 'Sala de Reunião',       desc: 'Boardroom Fortune 500 — formal',              icon: '📊' },
  { id: 'startup_workspace',      category: 'Corporativo',  label: 'Startup',               desc: 'Loft criativo com tijolos à vista',           icon: '💡' },
  { id: 'consulting_office',      category: 'Corporativo',  label: 'Escritório Consultivo', desc: 'Estante de livros, luz âmbar — premium',      icon: '📚' },
  { id: 'outdoor_business',       category: 'Corporativo',  label: 'Externo Corporativo',   desc: 'Rooftop com skyline ao fundo',                icon: '🌆' },
  { id: 'outdoor_rooftop',        category: 'Corporativo',  label: 'Terraço ao Entardecer', desc: 'Terraço com skyline iluminado ao dusk',       icon: '🌇' },
  // Editorial
  { id: 'studio_editorial',       category: 'Editorial',    label: 'Estúdio Editorial',     desc: 'Fundo infinito branco — Vogue',               icon: '🤍' },
  { id: 'fashion_dark_editorial', category: 'Editorial',    label: 'Editorial Dark',        desc: 'Loft industrial, sombras dramáticas',         icon: '🖤' },
  { id: 'luxury_hotel_lobby',     category: 'Editorial',    label: 'Lobby de Luxo',         desc: 'Mármore, lustre e floral — LVMH',             icon: '🏛️' },
  { id: 'fashion_street',         category: 'Editorial',    label: 'Rua Parisiense',        desc: 'Paralelepípedo e luz matinal dourada',        icon: '🇫🇷' },
  // Lifestyle
  { id: 'golden_hour_outdoor',    category: 'Lifestyle',    label: 'Golden Hour',           desc: 'Luz dourada do entardecer, bokeh natural',    icon: '🌅' },
  { id: 'cafe_lifestyle',         category: 'Lifestyle',    label: 'Café',                  desc: 'Coffee shop aconchegante — Kinfolk',          icon: '☕' },
  { id: 'beach_sunset',           category: 'Lifestyle',    label: 'Praia ao Pôr do Sol',   desc: 'Oceano, areia e luz rosa-laranja',            icon: '🌊' },
  { id: 'forest_nature',          category: 'Lifestyle',    label: 'Floresta',              desc: 'Luz dappled, vegetação exuberante',           icon: '🌿' },
  // Artístico
  { id: 'neon_cyberpunk',         category: 'Artístico',    label: 'Neon Cyberpunk',        desc: 'Beco molhado, neon rosa e azul',              icon: '🌃' },
  { id: 'vintage_film',           category: 'Artístico',    label: 'Filme Vintage',         desc: 'Grão de película, tons pastéis',              icon: '🎞️' },
  { id: 'moody_warehouse',        category: 'Artístico',    label: 'Galpão Moody',          desc: 'Névoa industrial, feixe dramático',           icon: '🏭' },
  { id: 'studio_bw',              category: 'Artístico',    label: 'P&B Clássico',          desc: 'Irving Penn / Yousuf Karsh',                  icon: '⬛' },
  // Creator
  { id: 'home_office_creator',    category: 'Creator',      label: 'Home Office',           desc: 'Estante de livros, plantas, luz natural',     icon: '🖥️' },
  { id: 'wellness_spa',           category: 'Creator',      label: 'Wellness / Spa',        desc: 'Interior japonês sereno — Goop vibe',         icon: '🪷' },
  { id: 'urban_lifestyle',        category: 'Creator',      label: 'Lifestyle Urbano',      desc: 'Rua limpa, arquitetura modernista',            icon: '🏃' },
];

const QUANTITIES = [
  { value: 1 as const, credits: 1, label: '1 foto' },
  { value: 3 as const, credits: 2, label: '3 fotos' },
  { value: 5 as const, credits: 3, label: '5 fotos' },
];

type WizardStep = 'upload' | 'training' | 'ready' | 'scenario' | 'generating' | 'result';

interface PhotoShootWizardProps {
  onBack?: () => void;
}

export default function PhotoShootWizard({ onBack }: PhotoShootWizardProps) {
  const {
    profile, isLoading, trainingStatus, generatedPhotos,
    isGenerating, uploadAndTrain, generatePhotos, resetGenerated,
  } = usePhotoShoot();
  const [step, setStep] = useState<WizardStep>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState<1 | 3 | 5>(3);

  // Sincroniza step com trainingStatus
  useEffect(() => {
    if (trainingStatus === 'uploading' || trainingStatus === 'training' || trainingStatus === 'generating_reference') {
      setStep('training');
    } else if (trainingStatus === 'completed' && generatedPhotos.length === 0) {
      setStep('ready');
    }
  }, [trainingStatus, generatedPhotos]);

  useEffect(() => {
    if (isGenerating) setStep('generating');
    else if (generatedPhotos.length > 0) setStep('result');
  }, [isGenerating, generatedPhotos]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles].slice(0, 15));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 15,
  });

  const handleStartTraining = async () => {
    await uploadAndTrain(files);
  };

  const handleGenerate = async () => {
    if (!selectedScenario) return;
    await generatePhotos(selectedScenario, selectedQuantity);
  };

  // ── STEP: UPLOAD ──
  if (step === 'upload') return (
    <div className="space-y-6 p-4">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
      )}

      <div className="text-center space-y-2">
        <h2 className="text-lg font-mono font-semibold text-foreground">Fotógrafo AI</h2>
        <p className="text-sm text-muted-foreground">
          Envie 10–15 fotos suas para criar seu perfil facial. O AI aprenderá seu rosto e gerará fotos profissionais de estúdio.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">Arraste suas fotos aqui</p>
        <p className="text-xs text-muted-foreground mt-1">
          ou clique para selecionar · JPG, PNG, WebP · máx. 15 fotos
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-mono">
            {files.length} foto{files.length > 1 ? 's' : ''} selecionada{files.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-mono font-semibold text-foreground">Dicas para melhores resultados:</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Fotos em diferentes iluminações (natural, artificial, externa)</li>
          <li>Ângulos variados: frontal, 3/4, perfil</li>
          <li>Expressões diferentes: sorrindo, sério, neutro</li>
          <li>Evite fotos com óculos de sol ou filtros pesados</li>
        </ul>
      </div>

      <Button
        onClick={handleStartTraining}
        disabled={files.length < 5 || isLoading}
        className="w-full"
      >
        {isLoading ? 'Processando...' : `Criar Perfil com ${files.length} fotos`}
      </Button>
    </div>
  );

  // ── STEP: TRAINING ──
  if (step === 'training') {
    const stages = {
      uploading: { label: 'Enviando fotos...', progress: 20 },
      training: { label: 'Treinando reconhecimento facial (~3 min)...', progress: 60 },
      generating_reference: { label: 'Gerando foto de referência...', progress: 90 },
    };
    const current = stages[trainingStatus as keyof typeof stages] ?? stages.training;

    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <Brain className="h-12 w-12 text-primary" />
        <div className="text-center space-y-3 max-w-xs">
          <p className="text-sm font-mono font-semibold text-foreground">{current.label}</p>
          <Progress value={current.progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            O AI está aprendendo seu rosto. Isso é feito apenas uma vez.
          </p>
        </div>
      </div>
    );
  }

  // ── STEP: READY ──
  if (step === 'ready') return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <CheckCircle2 className="h-12 w-12 text-primary" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-mono font-semibold text-foreground">Perfil criado!</h3>
        <p className="text-sm text-muted-foreground">
          Seu AI fotógrafo está pronto. Escolha um cenário para gerar suas fotos profissionais.
        </p>
      </div>
      {profile?.reference_image_url && (
        <div className="w-32 h-40 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg">
          <img
            src={profile.reference_image_url}
            alt="Referência"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <Button onClick={() => setStep('scenario')} className="gap-2">
        Escolher Cenário →
      </Button>
    </div>
  );

  // ── STEP: SCENARIO ──
  if (step === 'scenario') {
    const categories = Array.from(new Set(SCENARIOS.map(s => s.category)));
    return (
      <div className="space-y-6 p-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('ready')} className="gap-1.5 -ml-2">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>

        <h3 className="text-sm font-mono font-semibold text-foreground">Escolha o cenário</h3>

        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat} className="space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{cat}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SCENARIOS.filter(s => s.category === cat).map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedScenario(s.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors w-full ${
                      selectedScenario === s.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground">Quantas fotos?</p>
          <div className="grid grid-cols-3 gap-2">
            {QUANTITIES.map(q => (
              <button
                key={q.value}
                onClick={() => setSelectedQuantity(q.value)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedQuantity === q.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <p className="text-sm font-medium text-foreground">{q.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {q.credits} crédito{q.credits > 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={!selectedScenario || isGenerating} className="w-full">
          Gerar Fotos ({QUANTITIES.find(q => q.value === selectedQuantity)?.credits} créditos)
        </Button>
      </div>
    );
  }

  // ── STEP: GENERATING ──
  if (step === 'generating') return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <Loader2 className="h-12 w-12 text-primary animate-spin" />
      <div className="text-center space-y-3 max-w-xs">
        <p className="text-sm font-mono font-semibold text-foreground">
          Gerando suas fotos profissionais...
        </p>
        <p className="text-xs text-muted-foreground">
          Imagen 3 está criando {selectedQuantity} foto{selectedQuantity > 1 ? 's' : ''} · ~30s
        </p>
      </div>
      <Progress value={50} className="h-2 w-48" />
    </div>
  );

  // ── STEP: RESULT ──
  if (step === 'result') return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-semibold text-foreground">Suas fotos profissionais</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { resetGenerated(); setStep('scenario'); }}
          className="text-xs text-muted-foreground"
        >
          Novo cenário
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {generatedPhotos.map((url, i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-border shadow-sm">
            <img src={url} alt={`Foto ${i + 1}`} className="w-full aspect-[3/4] object-cover" />
            <div className="p-2">
              <a
                href={url}
                download={`foto-profissional-${i + 1}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Download className="h-3 w-3" /> Baixar
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-center text-muted-foreground">
        Fotos disponíveis por 7 dias · Baixe agora para não perder
      </p>
    </div>
  );

  return null;
}
