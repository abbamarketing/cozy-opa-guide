import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ScriptGenerator() {
  const [prompt, setPrompt] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Campo vazio', { description: 'Descreva o que você quer no roteiro' });
      return;
    }

    setLoading(true);

    try {
      // Mock AI generation (can be replaced with real AI call later)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockScript = `# Roteiro Gerado

## Introdução (0:00 - 0:15)
Hook inicial chamando atenção para o problema que será resolvido.

${prompt}

## Desenvolvimento (0:15 - 2:00)
- **Ponto 1:** Explicação detalhada
- **Ponto 2:** Exemplo prático
- **Ponto 3:** Benefícios

## Conclusão (2:00 - 2:30)
Resumo dos pontos principais e call-to-action.

**CTA:** Inscreva-se no canal e deixe seu like!

*Duração estimada: 2:30min | Tom: Educativo e inspirador*`;

      setGeneratedScript(mockScript);
      toast.success('Roteiro gerado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao gerar roteiro');
    } finally {
      setLoading(false);
    }
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
            Descreva o tema do seu vídeo e deixe a IA criar um roteiro completo
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
            />
            <p className="text-[10px] text-muted-foreground">
              Quanto mais detalhes você fornecer, melhor será o roteiro gerado
            </p>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2">
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
