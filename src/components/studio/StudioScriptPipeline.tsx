import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Copy,
  Download,
  RefreshCw,
  ChevronDown,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
// REMOVIDO em PRD v5 — useRole não é mais necessário para bypasses de produto
import { useUserProject } from "@/hooks/useUserProject";
import { toast } from "sonner";

export interface ScriptFormData {
  content_type: string;
  topic: string;
  objective: string;
  tone: string;
  audience: string;
  audience_level: string;
  reference: string;
  keywords: string;
}

const INITIAL_DATA: ScriptFormData = {
  content_type: "",
  topic: "",
  objective: "",
  tone: "",
  audience: "",
  audience_level: "",
  reference: "",
  keywords: "",
};

const TOTAL_STEPS = 5;

const LOADING_MESSAGES = [
  "Analisando seu briefing...",
  "Escrevendo o gancho...",
  "Desenvolvendo o roteiro...",
  "Finalizando...",
];

const LABEL_MAP: Record<string, string> = {
  short_video: "Short Video",
  youtube_video: "Vídeo YouTube",
  educar: "Educar",
  vender: "Vender",
  entreter: "Entreter",
  autoridade: "Gerar Autoridade",
  viralizar: "Viralizar",
  direto: "Direto e objetivo",
  didatico: "Didático",
  descontraido: "Descontraído",
  inspiracional: "Inspiracional",
  provocativo: "Provocativo",
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

interface HistoryScript {
  id: string;
  topic: string | null;
  content_type: string | null;
  created_at: string | null;
  generated_script: string | null;
}

interface StudioScriptPipelineProps {
  onCreditsChanged?: () => void;
}

const StudioScriptPipeline = ({ onCreditsChanged }: StudioScriptPipelineProps) => {
  const { user } = useAuth();
  const { userProject } = useUserProject();
  // REMOVIDO em PRD v5 — admin não tem privilégios de produto, apenas de gestão
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ScriptFormData>(INITIAL_DATA);
  const [generating, setGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [history, setHistory] = useState<HistoryScript[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [briefingPrefilled, setBriefingPrefilled] = useState<{ tone: boolean; audience: boolean }>({ tone: false, audience: false });

  const update = (field: keyof ScriptFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear prefilled indicator when user manually changes
    if (field === 'tone' || field === 'audience') {
      setBriefingPrefilled((prev) => ({ ...prev, [field]: false }));
    }
  };

  // Fetch credits
  // REMOVIDO em PRD v5 — admin não tem créditos de Studio gratuitos
  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      const { data } = await supabase
        .from("studio_credits")
        .select("credits_remaining")
        .eq("user_id", user.id)
        .maybeSingle();
      setCredits(data?.credits_remaining ?? 0);
    };
    fetchCredits();
  }, [user]);

  // Pre-fill from briefing
  useEffect(() => {
    if (!user) return;
    supabase
      .from('onboarding_briefings')
      .select('target_audience, content_style')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFormData((prev) => {
            const newTone = !prev.tone && data.content_style ? data.content_style : prev.tone;
            const newAudience = !prev.audience && data.target_audience ? data.target_audience : prev.audience;
            setBriefingPrefilled({
              tone: !prev.tone && !!data.content_style,
              audience: !prev.audience && !!data.target_audience,
            });
            return { ...prev, tone: newTone, audience: newAudience };
          });
        }
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("studio_scripts")
        .select("id, topic, content_type, created_at, generated_script")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory((data as HistoryScript[]) || []);
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [user, generatedScript]);

  // Loading message rotation
  useEffect(() => {
    if (!generating) return;
    setLoadingMsgIdx(0);
    const interval = setInterval(() => {
      setLoadingMsgIdx((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [generating]);

  const daysUntilRenewal = () => {
    const now = new Date();
    const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.ceil(
      (nextFirst.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const canAdvance = () => {
    switch (currentStep) {
      case 1:
        return !!formData.content_type;
      case 2:
        return !!formData.topic && !!formData.objective && !!formData.tone;
      case 3:
        return !!formData.audience && !!formData.audience_level;
      case 4:
        return true; // optional fields
      default:
        return false;
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);

    try {
      // Fetch briefing context
      const { data: briefing } = await supabase
        .from("onboarding_briefings")
        .select(
          "brand_name, target_audience, content_style, brand_description, reference_channels"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        setGenerating(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-script-v2`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            ...formData,
            briefing: briefing || undefined,
          }),
        }
      );

      if (res.status === 402) {
        toast.error("Sem créditos disponíveis. Seus créditos renovam no dia 1.");
        setGenerating(false);
        return;
      }
      if (res.status === 429) {
        toast.error("Muitas requisições. Aguarde um momento e tente novamente.");
        setGenerating(false);
        return;
      }
      if (!res.ok) {
        toast.error("Erro ao gerar roteiro. Tente novamente.");
        setGenerating(false);
        return;
      }

      const data = await res.json();
      setGeneratedScript(data.script || "");

      // REMOVIDO em PRD v5 — admin não tem bypass de créditos
      setCredits((c) => (c !== null ? Math.max(0, c - 1) : 0));
      onCreditsChanged?.();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedScript) return;
    await navigator.clipboard.writeText(generatedScript);
    toast.success("Roteiro copiado!");
  };

  const handleDownload = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roteiro-${formData.topic.slice(0, 30).replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewScript = () => {
    setConfirmNewOpen(false);
    setGeneratedScript(null);
    setFormData(INITIAL_DATA);
    setCurrentStep(1);
  };

  // ─── Output view ───
  if (generatedScript !== null && !generating) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Seu Roteiro
            </h2>
            <div className="whitespace-pre-wrap rounded-lg bg-background p-4 text-sm text-foreground leading-relaxed border border-border max-h-[60vh] overflow-y-auto">
              {generatedScript}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar roteiro
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Baixar .txt
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmNewOpen(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar novo roteiro
              </Button>
            </div>

            {/* Upsell 3 — após roteiro gerado */}
            {userProject?.client_type === 'studio' && generatedScript && (
              <p className="text-sm text-muted-foreground pt-2">
                Roteiro pronto. Agora é só gravar e enviar para edição.{' '}
                <Link to="/plans" className="text-primary font-medium hover:underline">
                  Contratar edição a partir de R$490/mês →
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <ScriptHistory
          history={history}
          loading={historyLoading}
        />

        {/* Confirm new dialog */}
        <Dialog open={confirmNewOpen} onOpenChange={setConfirmNewOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gerar novo roteiro?</DialogTitle>
              <DialogDescription>
                Isso vai consumir mais 1 crédito. Você tem{" "}
                <strong>{credits ?? 0}</strong> crédito(s) restante(s).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmNewOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleNewScript}
                disabled={credits === 0}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Passo {currentStep} de {TOTAL_STEPS}
          </span>
          <span>{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
        </div>
        <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-6 space-y-6">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Tipo de Conteúdo
              </h2>
              <p className="text-sm text-muted-foreground">
                Que tipo de vídeo você quer criar?
              </p>
              <RadioGroup
                value={formData.content_type}
                onValueChange={(v) => update("content_type", v)}
                className="space-y-3"
              >
                <label
                  htmlFor="short"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="short_video"
                    id="short"
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      Short Video (até 90s)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Instagram Reels, YouTube Shorts, TikTok
                    </p>
                  </div>
                </label>
                <label
                  htmlFor="youtube"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/50 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="youtube_video"
                    id="youtube"
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      Vídeo YouTube (3-20 min)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Conteúdo longo para YouTube
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Contexto do Vídeo
              </h2>
              <div className="space-y-2">
                <Label htmlFor="topic">Tema / assunto do vídeo *</Label>
                <Input
                  id="topic"
                  placeholder="Ex: Como começar a investir com pouco dinheiro"
                  value={formData.topic}
                  onChange={(e) => update("topic", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo *</Label>
                <Select
                  value={formData.objective}
                  onValueChange={(v) => update("objective", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educar">Educar</SelectItem>
                    <SelectItem value="vender">Vender</SelectItem>
                    <SelectItem value="entreter">Entreter</SelectItem>
                    <SelectItem value="autoridade">Gerar Autoridade</SelectItem>
                    <SelectItem value="viralizar">Viralizar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tom de voz *{briefingPrefilled.tone && <span className="text-xs text-muted-foreground ml-1 font-normal">(do seu briefing)</span>}</Label>
                <Select
                  value={formData.tone}
                  onValueChange={(v) => update("tone", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direto">Direto e objetivo</SelectItem>
                    <SelectItem value="didatico">Didático</SelectItem>
                    <SelectItem value="descontraido">Descontraído</SelectItem>
                    <SelectItem value="inspiracional">Inspiracional</SelectItem>
                    <SelectItem value="provocativo">Provocativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Audiência
              </h2>
              <div className="space-y-2">
                <Label htmlFor="audience">Para quem é esse vídeo? *</Label>
                <Input
                  id="audience"
                  placeholder="Ex: Empreendedores 30-45 anos"
                  value={formData.audience}
                  onChange={(e) => update("audience", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nível de conhecimento *</Label>
                <RadioGroup
                  value={formData.audience_level}
                  onValueChange={(v) => update("audience_level", v)}
                  className="flex flex-wrap gap-3"
                >
                  {["iniciante", "intermediario", "avancado"].map((level) => (
                    <label
                      key={level}
                      htmlFor={level}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 transition-colors hover:border-primary/50 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={level} id={level} />
                      <span className="text-sm text-foreground">
                        {LABEL_MAP[level] || level}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 4 — Referências */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Referências
              </h2>
              <p className="text-sm text-muted-foreground">
                Campos opcionais para refinar o roteiro.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reference">
                  Canal ou vídeo de referência de estilo
                </Label>
                <Input
                  id="reference"
                  placeholder="URL ou nome do canal/vídeo"
                  value={formData.reference}
                  onChange={(e) => update("reference", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">
                  Palavras-chave que devem aparecer
                </Label>
                <Input
                  id="keywords"
                  placeholder="Ex: investimento, renda passiva, liberdade"
                  value={formData.keywords}
                  onChange={(e) => update("keywords", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 5 — Geração */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Revisar e Gerar
              </h2>

              {/* Summary */}
              <div className="space-y-2 rounded-lg bg-background p-4 border border-border text-sm">
                <SummaryRow label="Tipo" value={LABEL_MAP[formData.content_type] || formData.content_type} />
                <SummaryRow label="Tema" value={formData.topic} />
                <SummaryRow label="Objetivo" value={LABEL_MAP[formData.objective] || formData.objective} />
                <SummaryRow label="Tom" value={LABEL_MAP[formData.tone] || formData.tone} />
                <SummaryRow label="Audiência" value={formData.audience} />
                <SummaryRow label="Nível" value={LABEL_MAP[formData.audience_level] || formData.audience_level} />
                {formData.reference && (
                  <SummaryRow label="Referência" value={formData.reference} />
                )}
                {formData.keywords && (
                  <SummaryRow label="Palavras-chave" value={formData.keywords} />
                )}
              </div>

              {generating ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={credits === 0}
                    className="w-full"
                    size="lg"
                  >
                    Gerar Roteiro
                  </Button>
                  {credits === 0 && (
                    <p className="text-center text-sm text-destructive">
                      Sem créditos. Seus créditos renovam em{" "}
                      {daysUntilRenewal()} dias.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation (hide on step 5 when generating or when output is shown) */}
          {!(currentStep === 5 && generating) && (
            <div className="flex justify-between pt-4">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((s) => s - 1)}
                disabled={currentStep === 1}
                className="text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              {currentStep < 5 && (
                <Button
                  onClick={() => setCurrentStep((s) => s + 1)}
                  disabled={!canAdvance()}
                >
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History section (always visible below pipeline) */}
      <ScriptHistory history={history} loading={historyLoading} />
    </div>
  );
};

// ─── Helper components ───

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}:</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

const ScriptHistory = ({
  history,
  loading,
}: {
  history: HistoryScript[];
  loading: boolean;
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) return null;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Histórico de Roteiros
        </h3>
        <div className="space-y-2">
          {history.map((item) => (
            <Collapsible key={item.id}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.topic || "Sem tema"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {LABEL_MAP[item.content_type || ""] || item.content_type}
                      </Badge>
                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString("pt-BR")
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 whitespace-pre-wrap rounded-lg bg-background p-4 text-sm text-foreground leading-relaxed border border-border max-h-[40vh] overflow-y-auto">
                  {item.generated_script || "Roteiro não disponível"}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudioScriptPipeline;
