import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, Check, StopCircle, Lightbulb, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-script`;
const BRAINSTORM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brainstorm-ideas`;

interface VideoIdea {
  title: string;
  hook: string;
  topics: string[];
}

interface BriefingContext {
  content_style: string | null;
  target_audience: string | null;
  reference_channels: string[] | null;
  brand_name: string | null;
}

export default function ScriptGenerator() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [brainstormTopic, setBrainstormTopic] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [brainstormLoading, setBrainstormLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [briefing, setBriefing] = useState<BriefingContext | null>(null);
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number | null>(null);

  // Fetch user briefing context
  useEffect(() => {
    if (!user) return;
    const fetchBriefing = async () => {
      const { data } = await supabase
        .from('onboarding_briefings')
        .select('content_style, target_audience, reference_channels, brand_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setBriefing(data as BriefingContext);
    };
    fetchBriefing();
  }, [user]);

  const handleBrainstorm = async () => {
    if (!brainstormTopic.trim()) {
      toast.error('Informe um tema', { description: 'Digite o tema ou nicho para o brainstorm' });
      return;
    }
    if (!user) return;

    setBrainstormLoading(true);
    setIdeas([]);
    setSelectedIdeaIndex(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const resp = await fetch(BRAINSTORM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ topic: brainstormTopic.trim(), userId: user.id }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        if (resp.status === 429) {
          toast.error('Limite excedido', { description: 'Aguarde um momento e tente novamente.' });
        } else if (resp.status === 402) {
          toast.error('Créditos insuficientes', { description: 'Adicione créditos ao workspace.' });
        } else {
          toast.error(err.error || 'Erro ao gerar ideias');
        }
        return;
      }

      const data = await resp.json();
      if (data.ideas && Array.isArray(data.ideas)) {
        setIdeas(data.ideas);
        toast.success('3 ideias geradas!', { description: 'Selecione uma para usar no roteiro' });
      } else {
        toast.error('Resposta inesperada da IA');
      }
    } catch (err: any) {
      toast.error('Erro ao gerar ideias');
    } finally {
      setBrainstormLoading(false);
    }
  };

  const handleSelectIdea = (idea: VideoIdea, index: number) => {
    setSelectedIdeaIndex(index);
    const topicsList = idea.topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const scriptPrompt = `Título: ${idea.title}\n\nGancho inicial: ${idea.hook}\n\nTópicos principais:\n${topicsList}\n\nCrie um roteiro completo e detalhado para este vídeo.`;
    setPrompt(scriptPrompt);
    toast.success('Ideia selecionada!', { description: 'Clique em "Gerar Roteiro" para criar o roteiro completo' });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Campo vazio', { description: 'Descreva o que você quer no roteiro' });
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setGeneratedScript('');

    try {
      const resp = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        if (resp.status === 429) {
          toast.error('Limite excedido', { description: 'Aguarde um momento e tente novamente.' });
        } else if (resp.status === 402) {
          toast.error('Créditos insuficientes', { description: 'Adicione créditos ao workspace.' });
        } else {
          toast.error(err.error || 'Erro ao gerar roteiro');
        }
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error('Stream indisponível');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

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
            if (content) {
              full += content;
              setGeneratedScript(full);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              full += content;
              setGeneratedScript(full);
            }
          } catch { /* ignore */ }
        }
      }

      if (full) toast.success('Roteiro gerado com sucesso!');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info('Geração cancelada');
      } else {
        toast.error('Erro ao gerar roteiro');
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    abortController?.abort();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Brainstorm Section */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Brainstorm com IA
          </CardTitle>
          <CardDescription>
            Digite um tema e a IA sugerirá 3 ideias de vídeo
            {briefing?.brand_name && (
              <span className="ml-1">
                personalizadas para <span className="text-primary font-medium">{briefing.brand_name}</span>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: produtividade, marketing digital, receitas fitness..."
              value={brainstormTopic}
              onChange={(e) => setBrainstormTopic(e.target.value)}
              disabled={brainstormLoading}
              className="flex-1"
              maxLength={200}
              onKeyDown={(e) => e.key === 'Enter' && !brainstormLoading && handleBrainstorm()}
            />
            <Button
              onClick={handleBrainstorm}
              disabled={brainstormLoading}
              className="gap-1.5 shrink-0"
            >
              {brainstormLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {brainstormLoading ? 'Gerando...' : 'Brainstorm'}
            </Button>
          </div>

          {/* Context badges */}
          {briefing && (
            <div className="flex flex-wrap gap-1.5">
              {briefing.content_style && (
                <Badge variant="outline" className="text-[10px]">
                  Estilo: {briefing.content_style}
                </Badge>
              )}
              {briefing.target_audience && (
                <Badge variant="outline" className="text-[10px]">
                  Público: {briefing.target_audience}
                </Badge>
              )}
              {briefing.reference_channels && briefing.reference_channels.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  Refs: {briefing.reference_channels.slice(0, 2).join(', ')}
                </Badge>
              )}
            </div>
          )}

          {/* Ideas grid */}
          {ideas.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {ideas.map((idea, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectIdea(idea, idx)}
                  className={`text-left rounded-lg p-3 space-y-2 transition-all card-elevate ${
                    selectedIdeaIndex === idx
                      ? 'glass border border-primary/40 ring-1 ring-primary/20'
                      : 'glass'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                      {idea.title}
                    </p>
                    {selectedIdeaIndex === idx && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    "{idea.hook}"
                  </p>
                  <div className="space-y-0.5">
                    {idea.topics.slice(0, 3).map((topic, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <ArrowRight className="h-2.5 w-2.5 shrink-0 text-primary/60" />
                        <span className="line-clamp-1">{topic}</span>
                      </div>
                    ))}
                  </div>
                  {selectedIdeaIndex !== idx && (
                    <p className="text-[10px] font-mono text-primary/70 pt-1">
                      Clique para usar →
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Script Generator */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerador de Roteiros com IA
          </CardTitle>
          <CardDescription>
            {selectedIdeaIndex !== null
              ? 'Ideia selecionada! Clique em "Gerar Roteiro" para criar o roteiro completo'
              : 'Descreva o tema do seu vídeo e a IA criará um roteiro completo com sugestões de títulos'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Descreva seu vídeo</Label>
            <Textarea
              placeholder="Ex: Um vídeo sobre 5 dicas de produtividade para empreendedores, tom motivacional, duração de 3 minutos..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
              maxLength={2000}
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground">
              Quanto mais detalhes você fornecer, melhor será o roteiro gerado
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading} className="flex-1 gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando roteiro...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Roteiro
                </>
              )}
            </Button>
            {loading && (
              <Button variant="outline" onClick={handleStop} className="gap-1.5">
                <StopCircle className="h-4 w-4" />
                Parar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {generatedScript && (
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Roteiro Gerado</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm text-card-foreground leading-relaxed rounded-lg bg-muted/20 p-4 border border-border/30">
              {generatedScript}
              {loading && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Dica: Você pode usar este roteiro ao criar uma nova solicitação de vídeo, colando ele no campo de descrição.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
