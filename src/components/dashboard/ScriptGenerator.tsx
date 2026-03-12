import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Copy, Check, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-script`;

export default function ScriptGenerator() {
  const [prompt, setPrompt] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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
        toast.error(err.error || 'Erro ao gerar roteiro');
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
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerador de Roteiros com IA
          </CardTitle>
          <CardDescription>
            Descreva o tema do seu vídeo e a IA criará um roteiro completo com sugestões de títulos
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
        <Card className="glass border-border/40">
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
              💡 Dica: Você pode usar este roteiro ao criar uma nova solicitação de vídeo, colando ele no campo de descrição.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
