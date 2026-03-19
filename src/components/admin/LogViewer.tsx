import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, RefreshCw, AlertTriangle, Info, Bug, AlertCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
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

const LEVEL_CONFIG: Record<string, { color: string; icon: React.ReactNode; rowBg: string }> = {
  info: { color: 'bg-primary/10 text-foreground border-border', icon: <Info className="h-3 w-3" />, rowBg: 'bg-primary/5' },
  warn: { color: 'bg-muted text-muted-foreground border-border', icon: <AlertTriangle className="h-3 w-3" />, rowBg: 'bg-muted/30' },
  error: { color: 'bg-destructive/20 text-destructive border-destructive/30', icon: <AlertCircle className="h-3 w-3" />, rowBg: 'bg-destructive/5' },
  debug: { color: 'bg-muted text-muted-foreground border-border', icon: <Bug className="h-3 w-3" />, rowBg: 'bg-muted/20' },
};

const LogViewer = () => {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const PAGE_SIZE = 100;

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- system_logs is not in generated types
    let query = (supabase as any)
      .from('system_logs')
      .select('*', { count: 'exact' });

    if (filterLevel !== 'all') query = query.eq('level', filterLevel);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z');
    if (searchText) query = query.ilike('message', `%${searchText}%`);

    query = query
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;

    if (error) {
      setLogs([]);
      setTotalCount(0);
      setLoadError(`Erro ao carregar logs: ${error.message}`);
      setLoading(false);
      return;
    }

    setLoadError(null);
    setLogs((data as unknown as LogRow[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, filterLevel, dateFrom, dateTo, searchText]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const downloadLogs = async () => {
    if (totalCount < 1000) {
      toast.error(`Necessário pelo menos 1.000 logs para download. Atual: ${totalCount}`);
      return;
    }

    toast.info('Preparando download...');

    const allLogs: LogRow[] = [];
    let offset = 0;
    const batchSize = 1000;

    while (offset < totalCount) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- system_logs is not in generated types
      let query = (supabase as any)
        .from('system_logs')
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
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success('Download concluído!');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const truncateUserId = (uid: string | null) => {
    if (!uid) return 'N/A';
    return uid.length > 8 ? `${uid.substring(0, 8)}…` : uid;
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

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nível</label>
          <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] glass">
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
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">De</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="w-[150px] glass"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Até</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="w-[150px] glass"
          />
        </div>
        <div className="space-y-1 flex-1 min-w-[180px]">
          <label className="text-xs text-muted-foreground">Buscar</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar na mensagem…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
              className="pl-8 glass"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {loadError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {/* Log table */}
      <div className="glass rounded-xl overflow-hidden">
        <ScrollArea className="h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium w-[160px]">Data</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium w-[80px]">Nível</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium w-[90px]">Fonte</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium w-[100px]">Usuário</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium">Mensagem</th>
                <th className="px-3 py-2 text-left text-muted-foreground font-medium w-[40px]"></th>
              </tr>
            </thead>
            <tbody className="font-mono-code text-xs">
              {logs.map((log) => {
                const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
                const isExpanded = expandedRow === log.id;
                return (
                  <tr key={log.id} className="group">
                    <td colSpan={6} className="p-0">
                      <div className={`flex items-center border-b border-border/50 hover:bg-muted/20 transition-colors ${config.rowBg}`}>
                        <div className="px-3 py-2 text-muted-foreground whitespace-nowrap w-[160px] shrink-0">
                          {new Date(log.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </div>
                        <div className="px-3 py-2 w-[80px] shrink-0">
                          <Badge variant="outline" className={`gap-1 text-[10px] ${config.color}`}>
                            {config.icon}
                            {log.level.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="px-3 py-2 text-muted-foreground w-[90px] shrink-0">{log.source}</div>
                        <div className="px-3 py-2 text-muted-foreground w-[100px] shrink-0" title={log.user_id || ''}>
                          {truncateUserId(log.user_id)}
                        </div>
                        <div className="px-3 py-2 text-foreground flex-1 min-w-0">
                          <span className="font-semibold">{log.message}</span>
                        </div>
                        <div className="px-3 py-2 w-[40px] shrink-0">
                          {log.context && Object.keys(log.context).length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(log.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>
                      {isExpanded && log.context && (
                        <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
                          <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap rounded-md bg-background/50 p-3 border border-border/50">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
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
