import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { usePhotoShoot } from '@/hooks/usePhotoShoot';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, Download, Building2, Lightbulb, BarChart3, Armchair, Sunset, Upload, Brain, CheckCircle2, Camera, Loader2 } from 'lucide-react';

const SCENARIOS = [
  { id: 'executive_office', label: 'Executivo', desc: 'Escritório com vista para a cidade', Icon: Building2 },
  { id: 'startup_workspace', label: 'Startup', desc: 'Ambiente moderno e descontraído', Icon: Lightbulb },
  { id: 'boardroom', label: 'Sala de Reunião', desc: 'Corporativo e autoritativo', Icon: BarChart3 },
  { id: 'consulting_office', label: 'Consultório/Consultoria', desc: 'Premium e acolhedor', Icon: Armchair },
  { id: 'outdoor_business', label: 'Externo Corporativo', desc: 'Terraço ou ambiente externo', Icon: Sunset },
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
  if (step === 'scenario') return (
    <div className="space-y-6 p-4">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={() => setStep('ready')} className="gap-1.5 -ml-2">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
      )}

      <h3 className="text-sm font-mono font-semibold text-foreground">Escolha o ambiente</h3>

      <div className="space-y-2">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedScenario(s.id)}
            className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-colors w-full ${
              selectedScenario === s.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-sm font-medium text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          </button>
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

  // ── STEP: GENERATING ──
  if (step === 'generating') return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="text-5xl">📷</div>
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
