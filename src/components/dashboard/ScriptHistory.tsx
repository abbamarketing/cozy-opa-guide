import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, Check, FileText, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ScriptRenderer from './ScriptRenderer';

interface Script {
  id: string;
  topic: string | null;
  content_type: string | null;
  tone: string | null;
  objective: string | null;
  generated_script: string | null;
  created_at: string | null;
}

export default function ScriptHistory() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Script | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('studio_scripts')
        .select('id, topic, content_type, tone, objective, generated_script, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setScripts(data || []);
      setLoading(false);
    })();
  }, [user]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('studio_scripts').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
      return;
    }
    setScripts((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success('Roteiro excluído');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toneLabel: Record<string, string> = {
    direct: 'Direto',
    didactic: 'Didático',
    casual: 'Descontraído',
    inspirational: 'Inspiracional',
    provocative: 'Provocativo',
  };

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-border/40 bg-card p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground font-mono">Nenhum roteiro criado ainda</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Seus roteiros gerados aparecerão aqui</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 mt-4">
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">
          Roteiros criados ({scripts.length})
        </h3>
        {scripts.map((script) => (
          <Card
            key={script.id}
            className="cursor-pointer border-border/40 bg-card transition-all hover:border-primary/30 hover:shadow-sm"
            onClick={() => setSelected(script)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium text-card-foreground truncate">
                  {script.topic || 'Sem tema'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(script.created_at)}
                  </span>
                  {script.tone && (
                    <Badge variant="outline" className="text-[9px] font-mono h-4 px-1.5">
                      {toneLabel[script.tone] || script.tone}
                    </Badge>
                  )}
                  {script.content_type && (
                    <Badge variant="outline" className="text-[9px] font-mono h-4 px-1.5">
                      {script.content_type === 'short_video' ? 'Short' : 'YouTube'}
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              {selected?.topic || 'Roteiro'}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-1">
              {selected?.created_at && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formatDate(selected.created_at)}
                </span>
              )}
            </div>
          </DialogHeader>
          {selected?.generated_script && (
            <div className="rounded-lg bg-muted/20 p-4 border border-border/30 mt-2">
              <ScriptRenderer content={selected.generated_script} isStreaming={false} />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              className="flex-1 gap-2"
              onClick={() => selected?.generated_script && handleCopy(selected.generated_script)}
            >
              {copied ? <><Check className="h-4 w-4" />Copiado!</> : <><Copy className="h-4 w-4" />Copiar</>}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => selected && handleDelete(selected.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
