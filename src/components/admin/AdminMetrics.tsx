import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { DollarSign, Users, Video, Clock, TrendingUp, TrendingDown, Download, AlertTriangle, ShieldAlert, CheckCircle, Trophy, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCSV } from '@/lib/csv';

const COLORS = ['hsl(101, 72%, 67%)', 'hsl(200, 80%, 60%)', 'hsl(45, 93%, 47%)', 'hsl(280, 70%, 60%)'];

interface KPI {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const AdminMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [mrrData, setMrrData] = useState<{ month: string; mrr: number }[]>([]);
  const [subsData, setSubsData] = useState<{ month: string; count: number }[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [revisionData, setRevisionData] = useState<{ label: string; count: number }[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [slaRisk, setSlaRisk] = useState<number>(0);
  const [slaBreached, setSlaBreached] = useState<number>(0);
  const [slaRate, setSlaRate] = useState<number | null>(null);
  const [editorRanking, setEditorRanking] = useState<[string, number][]>([]);
  const [aiUsage, setAiUsage] = useState<{
    totalCalls: number;
    totalTokens: number;
    byFunction: { name: string; calls: number; tokens: number }[];
    dailyData: { day: string; calls: number }[];
  }>({ totalCalls: 0, totalTokens: 0, byFunction: [], dailyData: [] });

  // Real-time SLA polling every 60s
  useEffect(() => {
    const fetchSla = async () => {
      const { count: risk } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .not('sla_deadline', 'is', null)
        .lt('sla_deadline', new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString());

      const { count: breached } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .in('status', ['in_progress', 'revision', 'queue'])
        .not('sla_deadline', 'is', null)
        .lt('sla_deadline', new Date().toISOString());

      setSlaRisk(risk ?? 0);
      setSlaBreached(breached ?? 0);
    };

    fetchSla();
    const interval = setInterval(fetchSla, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);

      const months: { label: string; start: Date; end: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({
          label: format(startOfMonth(d), 'MMM/yy', { locale: ptBR }),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }

      const { data: allUserProjects } = await supabase
        .from('user_projects')
        .select('status, created_at, custom_project_id, client_type, subscription_tier');

      const { data: allProjects } = await supabase
        .from('custom_projects')
        .select('id, monthly_value');

      const TIER_VALUES: Record<string, number> = {
        pro: 690,
      };

      const valueMap = new Map((allProjects || []).map((p: any) => [p.id, Number(p.monthly_value)]));

      const mrrMonthly = months.map((m) => {
        const activeInMonth = (allUserProjects || []).filter((up: any) =>
          new Date(up.created_at) <= m.end && up.status === 'active'
        );
        const customMrr = activeInMonth.reduce((sum: number, up: any) => sum + (valueMap.get(up.custom_project_id) || 0), 0);
        const subMrr = activeInMonth
          .filter((up: any) => up.client_type === 'subscription' && up.subscription_tier)
          .reduce((sum: number, up: any) => sum + (TIER_VALUES[up.subscription_tier] ?? 0), 0);
        return { month: m.label, mrr: customMrr + subMrr };
      });
      setMrrData(mrrMonthly);

      const subsMonthly = months.map((m) => ({
        month: m.label,
        count: (allUserProjects || []).filter((up: any) =>
          new Date(up.created_at) >= m.start && new Date(up.created_at) <= m.end
        ).length,
      }));
      setSubsData(subsMonthly);

      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('delivery_type, revision_count, status, due_date, delivered_at, created_at, sla_deadline, approved_at, editor_id');

      const typeCounts: Record<string, number> = {};
      const typeLabels: Record<string, string> = {
        youtube_video: 'YouTube',
        instagram_video: 'Instagram',
        thumbnail: 'Thumbnail',
        cover: 'Capa',
      };
      (deliveries || []).forEach((d: any) => {
        const label = typeLabels[d.delivery_type] || d.delivery_type;
        typeCounts[label] = (typeCounts[label] || 0) + 1;
      });
      setTypeDistribution(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));

      const revCounts = { 'Sem revisão': 0, '1 revisão': 0, '2+ revisões': 0 };
      (deliveries || []).forEach((d: any) => {
        if (d.revision_count === 0) revCounts['Sem revisão']++;
        else if (d.revision_count === 1) revCounts['1 revisão']++;
        else revCounts['2+ revisões']++;
      });
      setRevisionData(Object.entries(revCounts).map(([label, count]) => ({ label, count })));

      const completedDeliveries = (deliveries || []).filter((d: any) => d.delivered_at && d.created_at);
      let avgHours = 0;
      if (completedDeliveries.length > 0) {
        const avgTime = completedDeliveries.reduce((acc: number, d: any) => {
          return acc + (new Date(d.delivered_at).getTime() - new Date(d.created_at).getTime());
        }, 0) / completedDeliveries.length;
        avgHours = Math.round(avgTime / (1000 * 60 * 60));
      }

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const approvedMonth = (deliveries || []).filter((d: any) =>
        d.status === 'approved' && d.approved_at && new Date(d.approved_at) >= monthStart
      );
      const onTime = approvedMonth.filter((d: any) =>
        d.approved_at && d.sla_deadline &&
        new Date(d.approved_at) <= new Date(d.sla_deadline)
      ).length;
      const rate = approvedMonth.length > 0
        ? Math.round((onTime / approvedMonth.length) * 100)
        : null;
      setSlaRate(rate);

      const { data: byEditor } = await supabase
        .from('deliveries')
        .select('editor_id, editors!inner(display_name)')
        .eq('status', 'approved')
        .gte('approved_at', monthStart.toISOString());

      const ranking = Object.entries(
        (byEditor ?? []).reduce((acc: Record<string, number>, d: any) => {
          const name = d.editors?.display_name ?? d.editor_id ?? 'desconhecido';
          acc[name] = (acc[name] ?? 0) + 1;
          return acc;
        }, {})
      ).sort(([, a], [, b]) => (b as number) - (a as number)) as [string, number][];
      setEditorRanking(ranking);

      const currentMrr = mrrMonthly[mrrMonthly.length - 1]?.mrr || 0;
      const prevMrr = mrrMonthly[mrrMonthly.length - 2]?.mrr || 0;
      const mrrChange = prevMrr > 0 ? Math.round(((currentMrr - prevMrr) / prevMrr) * 100) : 0;

      const activeClients = (allUserProjects || []).filter((up: any) => up.status === 'active').length;

      const totalDeliveries = (deliveries || []).length;
      const thisMonthDeliveries = (deliveries || []).filter((d: any) => {
        const created = new Date(d.due_date || '');
        return created >= months[months.length - 1].start;
      }).length;

      setKpis([
        {
          title: 'MRR',
          value: `R$ ${currentMrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
          change: `${mrrChange >= 0 ? '+' : ''}${mrrChange}%`,
          trend: mrrChange >= 0 ? 'up' : 'down',
          icon: DollarSign,
          color: 'text-abba-lime',
        },
        {
          title: 'Clientes Ativos',
          value: String(activeClients),
          change: `${subsMonthly[subsMonthly.length - 1]?.count || 0} novos`,
          trend: 'up',
          icon: Users,
          color: 'text-white',
        },
        {
          title: 'Entregas/Mês',
          value: String(thisMonthDeliveries),
          change: `${totalDeliveries} total`,
          trend: 'up',
          icon: Video,
          color: 'text-abba-lime',
        },
        {
          title: 'Tempo Médio',
          value: `${avgHours}h`,
          change: completedDeliveries.length > 0 ? `${completedDeliveries.length} entregas` : 'N/A',
          trend: 'down',
          icon: Clock,
          color: 'text-white',
        },
      ]);

      // ─── AI Usage ───
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: aiLogs } = await supabase
        .from('ai_usage_logs')
        .select('function_name, total_tokens, created_at')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true });

      if (aiLogs && aiLogs.length > 0) {
        const byFunc: Record<string, { calls: number; tokens: number }> = {};
        const byDay: Record<string, number> = {};
        let totalTokens = 0;

        aiLogs.forEach((log: any) => {
          const fn = log.function_name;
          if (!byFunc[fn]) byFunc[fn] = { calls: 0, tokens: 0 };
          byFunc[fn].calls++;
          byFunc[fn].tokens += log.total_tokens || 0;
          totalTokens += log.total_tokens || 0;

          const day = format(new Date(log.created_at), 'dd/MM');
          byDay[day] = (byDay[day] || 0) + 1;
        });

        setAiUsage({
          totalCalls: aiLogs.length,
          totalTokens,
          byFunction: Object.entries(byFunc).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.calls - a.calls),
          dailyData: Object.entries(byDay).map(([day, calls]) => ({ day, calls })),
        });
      }

      setLoading(false);
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[188px] rounded-[20px]" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 rounded-[20px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-full"
          onClick={() => {
            const rows = [
              ...kpis.map((k) => ({ Categoria: 'KPI', Métrica: k.title, Valor: k.value, Variação: k.change })),
              ...mrrData.map((m) => ({ Categoria: 'MRR', Métrica: m.month, Valor: `R$ ${m.mrr.toFixed(2)}`, Variação: '' })),
              ...subsData.map((s) => ({ Categoria: 'Assinaturas', Métrica: s.month, Valor: String(s.count), Variação: '' })),
              ...typeDistribution.map((t) => ({ Categoria: 'Tipo Entrega', Métrica: t.name, Valor: String(t.value), Variação: '' })),
              ...revisionData.map((r) => ({ Categoria: 'Revisões', Métrica: r.label, Valor: String(r.count), Variação: '' })),
            ];
            downloadCSV(rows, `metricas-${format(new Date(), 'yyyy-MM-dd')}`);
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Métricas CSV
        </Button>
      </div>

      {/* SLA Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-dark flex flex-col justify-between" style={{ minHeight: 'auto' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-yellow-500">SLA em Risco</span>
          </div>
          <p className="text-[42px] font-sans font-extrabold leading-none tracking-[-0.045em] text-white mt-2">{slaRisk}</p>
          <p className="text-[11px] font-sans text-white/60 mt-1">Deadline em menos de 4h</p>
        </div>

        <div className="kpi-dark flex flex-col justify-between" style={{ minHeight: 'auto' }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-destructive">SLA Estourado</span>
          </div>
          <p className="text-[42px] font-sans font-extrabold leading-none tracking-[-0.045em] text-white mt-2">{slaBreached}</p>
          <p className="text-[11px] font-sans text-white/60 mt-1">Deadline ultrapassado</p>
        </div>

        <div className="kpi-dark flex flex-col justify-between" style={{ minHeight: 'auto' }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-abba-lime" />
            <span className="text-[11px] font-sans font-semibold uppercase tracking-widest text-abba-lime">Taxa de SLA — Mês Atual</span>
          </div>
          <p className="text-[42px] font-sans font-extrabold leading-none tracking-[-0.045em] text-white mt-2">
            {slaRate !== null ? `${slaRate}%` : 'N/A'}
          </p>
          <p className="text-[11px] font-sans text-white/60 mt-1">Entregas dentro do prazo</p>
        </div>
      </div>

      {/* KPI Cards — alternating lime/dark */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
          const isLime = idx % 2 === 0;
          return (
            <div key={kpi.title} className={isLime ? 'kpi-lime' : 'kpi-dark'}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-sans font-semibold uppercase tracking-widest ${isLime ? 'opacity-60' : 'opacity-60'}`}>{kpi.title}</span>
                <Icon className={`h-4 w-4 ${isLime ? 'text-[#111]/60' : 'text-white/60'}`} />
              </div>
              <p className={`text-[42px] font-sans font-extrabold leading-none tracking-[-0.045em] mt-2 ${isLime ? 'text-[#111]' : 'text-white'}`}>{kpi.value}</p>
              <div className="flex items-center gap-1 text-xs mt-2">
                <TrendIcon className={`h-3 w-3 ${kpi.trend === 'up' ? (isLime ? 'text-[#111]/70' : 'text-abba-lime') : 'text-destructive'}`} />
                <span className={isLime ? 'text-[#111]/60' : 'text-white/60'}>{kpi.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MRR */}
        <div className="kpi-dark" style={{ minHeight: 'auto' }}>
          <h3 className="text-sm font-sans font-semibold mb-1 text-white">Receita Mensal (MRR)</h3>
          <p className="text-[11px] font-sans text-white/60 mb-4">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mrrData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A231B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px' }}
                formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'MRR']}
              />
              <Line type="monotone" dataKey="mrr" stroke="#A0E870" strokeWidth={2} dot={{ fill: '#A0E870', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Subscriptions */}
        <div className="kpi-dark" style={{ minHeight: 'auto' }}>
          <h3 className="text-sm font-sans font-semibold mb-1 text-white">Novas Assinaturas</h3>
          <p className="text-[11px] font-sans text-white/60 mb-4">Por mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A231B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Assinaturas" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type distribution */}
        <div className="kpi-dark" style={{ minHeight: 'auto' }}>
          <h3 className="text-sm font-sans font-semibold mb-1 text-white">Entregas por Tipo</h3>
          <p className="text-[11px] font-sans text-white/60 mb-4">Este mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {typeDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1A231B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Satisfaction */}
        <div className="kpi-dark" style={{ minHeight: 'auto' }}>
          <h3 className="text-sm font-sans font-semibold mb-1 text-white">Satisfação (Revisões)</h3>
          <p className="text-[11px] font-sans text-white/60 mb-4">Menos revisões = mais satisfação</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revisionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A231B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Entregas" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Usage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="kpi-dark" style={{ minHeight: 'auto' }}>
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-sans font-semibold text-white">Uso de IA — Últimos 30 dias</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-[16px] bg-white/5 p-3">
              <p className="text-[10px] font-sans uppercase tracking-widest text-white/50">Total de Chamadas</p>
              <p className="text-2xl font-sans font-extrabold text-white mt-1">{aiUsage.totalCalls}</p>
            </div>
            <div className="rounded-[16px] bg-white/5 p-3">
              <p className="text-[10px] font-sans uppercase tracking-widest text-white/50">Total de Tokens</p>
              <p className="text-2xl font-sans font-extrabold text-white mt-1">
                {aiUsage.totalTokens > 1000 ? `${(aiUsage.totalTokens / 1000).toFixed(1)}k` : aiUsage.totalTokens}
              </p>
            </div>
          </div>
          {aiUsage.byFunction.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-sans uppercase tracking-widest text-white/50">Por Função</p>
              {aiUsage.byFunction.map((fn) => {
                const fnLabels: Record<string, string> = {
                  'studio-generate': 'Studio (Roteiro)',
                  'support-chat': 'Chat de Suporte',
                  'generate-script': 'Gerador de Roteiro',
                  'generate-script-v2': 'Gerador V2',
                  'brainstorm-ideas': 'Brainstorm',
                };
                return (
                  <div key={fn.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/5">
                    <span className="text-xs font-sans text-white/80">{fnLabels[fn.name] || fn.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-white/40">{fn.tokens > 1000 ? `${(fn.tokens / 1000).toFixed(1)}k tok` : `${fn.tokens} tok`}</span>
                      <span className="text-xs font-sans font-semibold text-primary">{fn.calls}x</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="kpi-dark" style={{ minHeight: 'auto' }}>
          <h3 className="text-sm font-sans font-semibold mb-1 text-white">Chamadas IA / Dia</h3>
          <p className="text-[11px] font-sans text-white/60 mb-4">Últimos 30 dias</p>
          {aiUsage.dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aiUsage.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A231B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="calls" radius={[4, 4, 0, 0]} name="Chamadas" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px]">
              <p className="text-xs text-white/40 font-sans">Nenhum dado de uso ainda</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Ranking */}
      {editorRanking.length > 0 && (
        <div className="kpi-dark" style={{ minHeight: 'auto' }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-sans font-semibold text-white">Entregas por Editor — Mês Atual</h3>
          </div>
          <div className="space-y-2">
            {editorRanking.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between py-2 px-3 rounded-[20px] bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-sans font-extrabold text-abba-lime w-6">{i + 1}º</span>
                  <span className="text-sm font-sans text-white">{name}</span>
                </div>
                <span className="text-sm font-sans font-semibold text-abba-lime">{count} {count === 1 ? 'entrega' : 'entregas'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMetrics;
