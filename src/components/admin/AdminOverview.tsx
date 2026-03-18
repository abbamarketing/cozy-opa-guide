// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Package, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { remainingBusinessMinutes, formatBusinessCountdown } from '@/lib/business-hours';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface KPIs {
  activeClients: number;
  pendingDeliveries: number;
  lateDeliveries: number;
  mrr: number;
  customMRR: number;
  subscriptionMRR: number;
}

const SUBSCRIPTION_TIER_VALUES: Record<string, number> = {
  standard: 490,
  pro:      660,
  business: 1100,
  premium:  2970,
  agency:   5590,
};

const AdminOverview = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ week: string; count: number }[]>([]);
  const [urgentDeliveries, setUrgentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const weeks: { week: string; start: Date; end: Date }[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = subWeeks(new Date(), i);
        weeks.push({
          week: format(startOfWeek(d, { locale: ptBR }), 'dd/MM'),
          start: startOfWeek(d, { locale: ptBR }),
          end: endOfWeek(d, { locale: ptBR }),
        });
      }

      // All independent queries in parallel
      const [
        activeClientsRes,
        pendingRes,
        lateRes,
        activeProjectsRes,
        recentRes,
        urgentRes,
      ] = await Promise.all([
        supabase.from('user_projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }).in('status', ['queue', 'pending', 'in_progress', 'revision']),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }).in('status', ['queue', 'pending', 'in_progress', 'revision']).not('due_date', 'is', null).lt('due_date', new Date().toISOString()),
        supabase.from('user_projects').select('custom_project_id, client_type, subscription_tier').eq('status', 'active'),
        supabase.from('deliveries').select('created_at').gte('created_at', weeks[0].start.toISOString()).neq('status', 'cancelled'),
        supabase.from('deliveries').select('id, title, due_date, status, delivery_type').in('status', ['queue', 'pending', 'in_progress', 'revision']).not('due_date', 'is', null).lte('due_date', in24h).order('due_date', { ascending: true }).limit(10),
      ]);

      let customMRR = 0;
      let subscriptionMRR = 0;
      const activeProjects = activeProjectsRes.data;
      if (activeProjects && activeProjects.length > 0) {
        const projectIds = [...new Set(activeProjects.map((p: any) => p.custom_project_id).filter(Boolean))];
        const { data: projects } = projectIds.length > 0
          ? await supabase.from('custom_projects').select('id, monthly_value').in('id', projectIds)
          : { data: [] };

        const valueMap = new Map((projects || []).map((p: any) => [p.id, Number(p.monthly_value)]));
        customMRR = activeProjects.reduce((sum: number, p: any) => sum + (Number(valueMap.get(p.custom_project_id)) || 0), 0);
        subscriptionMRR = activeProjects
          .filter((up: any) => up.client_type === 'subscription' && up.subscription_tier)
          .reduce((sum: number, up: any) => sum + (SUBSCRIPTION_TIER_VALUES[up.subscription_tier] ?? 0), 0);
      }

      setKpis({
        activeClients: activeClientsRes.count || 0,
        pendingDeliveries: pendingRes.count || 0,
        lateDeliveries: lateRes.count || 0,
        mrr: customMRR + subscriptionMRR,
        customMRR,
        subscriptionMRR,
      });

      const weekCounts = weeks.map((w) => ({
        week: w.week,
        count: (recentRes.data || []).filter(
          (d: any) => new Date(d.created_at) >= w.start && new Date(d.created_at) <= w.end
        ).length,
      }));
      setWeeklyData(weekCounts);

      setUrgentDeliveries(urgentRes.data || []);
      setLoading(false);
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const kpiCards = [
    { label: 'Clientes Ativos', value: kpis?.activeClients || 0, icon: Users, color: 'text-primary' },
    { label: 'Entregas Pendentes', value: kpis?.pendingDeliveries || 0, icon: Package, color: 'text-[hsl(45,93%,47%)]' },
    { label: 'Entregas Atrasadas', value: kpis?.lateDeliveries || 0, icon: AlertTriangle, color: 'text-destructive' },
    {
      label: 'MRR',
      value: `R$ ${(kpis?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      subtitle: `Custom: R$ ${(kpis?.customMRR || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })} · Assin: R$ ${(kpis?.subscriptionMRR || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-tour="admin-kpis">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="glass border-border/40 p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </span>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-card-foreground break-all">{kpi.value}</p>
            {'subtitle' in kpi && kpi.subtitle && (
              <p className="text-[9px] font-mono text-muted-foreground">{kpi.subtitle}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Weekly Chart */}
      <Card className="glass border-border/40 p-5">
        <h3 className="text-sm font-semibold mb-4 text-card-foreground">Entregas por Semana</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(0 0% 55%)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(0 0% 55%)' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0 0% 8%)',
                border: '1px solid hsl(0 0% 16%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(142, 72%, 73%)"
              strokeWidth={2}
              dot={{ fill: 'hsl(142, 72%, 73%)', r: 4 }}
              name="Entregas"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Urgent Deliveries */}
      <Card className="glass border-border/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-destructive" />
          <h3 className="text-sm font-semibold text-card-foreground">Próximas 24 Horas</h3>
          <Badge variant="destructive" className="text-[10px]">{urgentDeliveries.length}</Badge>
        </div>
        {urgentDeliveries.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma entrega urgente.</p>
        ) : (
          <div className="space-y-2">
            {urgentDeliveries.map((d) => {
              const bizMin = remainingBusinessMinutes(new Date(d.due_date));
              return (
                <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 rounded-lg bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-card-foreground truncate">{d.title}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {{ youtube_video: 'YouTube', instagram_video: 'Instagram', thumbnail: 'Thumbnail', cover: 'Capa' }[d.delivery_type] || d.delivery_type}
                    </Badge>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${bizMin < 0 ? 'text-destructive' : 'text-[hsl(45,93%,47%)]'}`}>
                    {bizMin < 0 ? 'Atrasado' : formatBusinessCountdown(bizMin)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminOverview;
