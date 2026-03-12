import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { DollarSign, Users, Video, Clock, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCSV } from '@/lib/csv';

const COLORS = ['hsl(142, 72%, 73%)', 'hsl(200, 80%, 60%)', 'hsl(45, 93%, 47%)', 'hsl(280, 70%, 60%)'];

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
        .select('status, created_at, custom_project_id');

      const { data: allProjects } = await supabase
        .from('custom_projects')
        .select('id, monthly_value');

      const valueMap = new Map((allProjects || []).map((p: any) => [p.id, Number(p.monthly_value)]));

      const mrrMonthly = months.map((m) => {
        const activeInMonth = (allUserProjects || []).filter((up: any) =>
          new Date(up.created_at) <= m.end && up.status === 'active'
        );
        const mrr = activeInMonth.reduce((sum: number, up: any) => sum + (valueMap.get(up.custom_project_id) || 0), 0);
        return { month: m.label, mrr };
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
        .select('delivery_type, revision_count, status, due_date, delivered_at');

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

      // Build KPIs
      const currentMrr = mrrMonthly[mrrMonthly.length - 1]?.mrr || 0;
      const prevMrr = mrrMonthly[mrrMonthly.length - 2]?.mrr || 0;
      const mrrChange = prevMrr > 0 ? Math.round(((currentMrr - prevMrr) / prevMrr) * 100) : 0;

      const activeClients = (allUserProjects || []).filter((up: any) => up.status === 'active').length;

      const totalDeliveries = (deliveries || []).length;
      const thisMonthDeliveries = (deliveries || []).filter((d: any) => {
        const created = new Date(d.due_date || '');
        return created >= months[months.length - 1].start;
      }).length;

      // Avg delivery time (completed ones)
      const completed = (deliveries || []).filter((d: any) => d.delivered_at && d.due_date);
      let avgHours = 0;
      if (completed.length > 0) {
        const totalHours = completed.reduce((sum: number, d: any) => {
          const diff = (new Date(d.delivered_at).getTime() - new Date(d.due_date).getTime()) / (1000 * 60 * 60);
          return sum + Math.abs(diff);
        }, 0);
        avgHours = Math.round(totalHours / completed.length);
      }

      setKpis([
        {
          title: 'MRR',
          value: `R$ ${currentMrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
          change: `${mrrChange >= 0 ? '+' : ''}${mrrChange}%`,
          trend: mrrChange >= 0 ? 'up' : 'down',
          icon: DollarSign,
          color: 'text-primary',
        },
        {
          title: 'Clientes Ativos',
          value: String(activeClients),
          change: `${subsMonthly[subsMonthly.length - 1]?.count || 0} novos`,
          trend: 'up',
          icon: Users,
          color: 'text-blue-400',
        },
        {
          title: 'Entregas/Mês',
          value: String(thisMonthDeliveries),
          change: `${totalDeliveries} total`,
          trend: 'up',
          icon: Video,
          color: 'text-purple-400',
        },
        {
          title: 'Tempo Médio',
          value: `${avgHours}h`,
          change: completed.length > 0 ? `${completed.length} entregas` : 'N/A',
          trend: 'down',
          icon: Clock,
          color: 'text-primary',
        },
      ]);

      setLoading(false);
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
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
          className="gap-1.5"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <Card key={kpi.title} className="glass border-border/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{kpi.title}</span>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold text-card-foreground">{kpi.value}</p>
              <div className="flex items-center gap-1 text-xs">
                <TrendIcon className={`h-3 w-3 ${kpi.trend === 'up' ? 'text-primary' : 'text-destructive'}`} />
                <span className="text-muted-foreground">{kpi.change}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MRR */}
        <Card className="glass border-border/40 p-5">
          <h3 className="text-sm font-semibold mb-1 text-card-foreground">Receita Mensal (MRR)</h3>
          <p className="text-xs text-muted-foreground mb-4">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mrrData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(0 0% 55%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(0 0% 55%)' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 16%)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'MRR']}
              />
              <Line type="monotone" dataKey="mrr" stroke="hsl(142, 72%, 73%)" strokeWidth={2} dot={{ fill: 'hsl(142, 72%, 73%)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Subscriptions */}
        <Card className="glass border-border/40 p-5">
          <h3 className="text-sm font-semibold mb-1 text-card-foreground">Novas Assinaturas</h3>
          <p className="text-xs text-muted-foreground mb-4">Por mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(0 0% 55%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(0 0% 55%)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 16%)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill="hsl(142, 72%, 73%)" radius={[4, 4, 0, 0]} name="Assinaturas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Type distribution */}
        <Card className="glass border-border/40 p-5">
          <h3 className="text-sm font-semibold mb-1 text-card-foreground">Entregas por Tipo</h3>
          <p className="text-xs text-muted-foreground mb-4">Este mês</p>
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
                contentStyle={{ backgroundColor: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 16%)', borderRadius: '8px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Satisfaction */}
        <Card className="glass border-border/40 p-5">
          <h3 className="text-sm font-semibold mb-1 text-card-foreground">Satisfação (Revisões)</h3>
          <p className="text-xs text-muted-foreground mb-4">Menos revisões = mais satisfação</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revisionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(0 0% 55%)' }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'hsl(0 0% 55%)' }} width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 16%)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill="hsl(142, 72%, 73%)" radius={[0, 4, 4, 0]} name="Entregas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default AdminMetrics;
