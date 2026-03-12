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

const COLORS = ['hsl(142, 72%, 73%)', 'hsl(200, 80%, 60%)', 'hsl(45, 93%, 47%)', 'hsl(280, 70%, 60%)'];

const AdminMetrics = () => {
  const [loading, setLoading] = useState(true);
  const [mrrData, setMrrData] = useState<{ month: string; mrr: number }[]>([]);
  const [subsData, setSubsData] = useState<{ month: string; count: number }[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [revisionData, setRevisionData] = useState<{ label: string; count: number }[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);

      // Build monthly data for last 6 months
      const months: { label: string; start: Date; end: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({
          label: format(startOfMonth(d), 'MMM/yy', { locale: ptBR }),
          start: startOfMonth(d),
          end: endOfMonth(d),
        });
      }

      // MRR evolution (count active projects per month * value)
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

      // New subscriptions per month
      const subsMonthly = months.map((m) => ({
        month: m.label,
        count: (allUserProjects || []).filter((up: any) =>
          new Date(up.created_at) >= m.start && new Date(up.created_at) <= m.end
        ).length,
      }));
      setSubsData(subsMonthly);

      // Delivery type distribution
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('delivery_type, revision_count');

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

      // Revision satisfaction (0 revisions = satisfied, 1 = ok, 2+ = needs improvement)
      const revCounts = { 'Sem revisão': 0, '1 revisão': 0, '2+ revisões': 0 };
      (deliveries || []).forEach((d: any) => {
        if (d.revision_count === 0) revCounts['Sem revisão']++;
        else if (d.revision_count === 1) revCounts['1 revisão']++;
        else revCounts['2+ revisões']++;
      });
      setRevisionData(Object.entries(revCounts).map(([label, count]) => ({ label, count })));

      setLoading(false);
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* MRR */}
      <Card className="glass border-border/40 p-5">
        <h3 className="text-sm font-semibold mb-4 text-card-foreground">Evolução do MRR</h3>
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

      {/* New subscriptions */}
      <Card className="glass border-border/40 p-5">
        <h3 className="text-sm font-semibold mb-4 text-card-foreground">Novas Assinaturas</h3>
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
        <h3 className="text-sm font-semibold mb-4 text-card-foreground">Entregas por Tipo</h3>
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

      {/* Satisfaction / Revisions */}
      <Card className="glass border-border/40 p-5">
        <h3 className="text-sm font-semibold mb-4 text-card-foreground">Satisfação (Revisões)</h3>
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
  );
};

export default AdminMetrics;
