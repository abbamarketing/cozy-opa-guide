import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, RefreshCw, AlertTriangle, Info, Bug, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LogRow {
  id: string;
  level: string;
  message: string;
  context: Record<string, unknown>;
  user_id: string | null;
  source: string;
  created_at: string;
}

const LEVEL_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  info: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Info className="h-3 w-3" /> },
  warn: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <AlertTriangle className="h-3 w-3" /> },
  error: { color: 'bg-destructive/20 text-red-400 border-destructive/30', icon: <AlertCircle className="h-3 w-3" /> },
  debug: { color: 'bg-muted text-muted-foreground border-border', icon: <Bug className="h-3 w-3" /> },
};

const LogViewer = () => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('system_logs' as any)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterLevel !== 'all') {
      query = query.eq('level', filterLevel);
    }

    const { data, count, error } = await query;

    if (error) {
      toast.error('Erro ao carregar logs');
      console.error(error);
    } else {
      setLogs((data as unknown as LogRow[]) || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [page, filterLevel]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const downloadLogs = async () => {
    if (totalCount < 1000) {
      toast.error(`Necessário pelo menos 1.000 logs para download. Atual: ${totalCount}`);
      return;
    }

    toast.info('Preparando download...');

    // Fetch all logs in batches of 1000
    const allLogs: LogRow[] = [];
    let offset = 0;
    const batchSize = 1000;

    while (offset < totalCount) {
      let query = supabase
        .from('system_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (filterLevel !== 'all') {
        query = query.eq('level', filterLevel);
      }

      const { data } = await query;
      if (data) allLogs.push(...(data as unknown as LogRow[]));
      offset += batchSize;
    }

    const csv = [
      'ID,Level,Message,Source,User ID,Context,Created At',
      ...allLogs.map((log) =>
        [
          log.id,
          log.level,
          `"${log.message.replace(/"/g, '""')}"`,
          log.source,
          log.user_id || '',
          `"${JSON.stringify(log.context).replace(/"/g, '""')}"`,
          log.created_at,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download concluído!');
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Logs do Sistema</h2>
          <p className="text-sm text-muted-foreground">
            {totalCount.toLocaleString('pt-BR')} logs registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] glass">
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadLogs}
            disabled={totalCount < 1000}
            title={totalCount < 1000 ? 'Mínimo de 1.000 logs para download' : ''}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV ({totalCount >= 1000 ? '✓' : `${totalCount}/1000`})
          </Button>
        </div>
      </div>

      {/* Log table */}
      <div className="glass rounded-xl overflow-hidden">
        <ScrollArea className="h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium w-[160px]">Data</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium w-[80px]">Nível</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium w-[90px]">Fonte</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">Mensagem</th>
              </tr>
            </thead>
            <tbody className="font-mono-code text-xs">
              {logs.map((log) => {
                const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
                return (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`gap-1 text-[10px] ${config.color}`}>
                        {config.icon}
                        {log.level.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{log.source}</td>
                    <td className="px-3 py-2 text-foreground">
                      {log.message}
                      {log.context && Object.keys(log.context).length > 0 && (
                        <span className="text-muted-foreground ml-2">
                          {JSON.stringify(log.context)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-3 py-12 text-center text-muted-foreground">
                    Nenhum log encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
