import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Copy, Check, Users, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function AffiliateStats() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: affiliateCode } = useQuery({
    queryKey: ['affiliate_code', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('affiliate_codes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', affiliateCode?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('affiliate_code_id', affiliateCode!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!affiliateCode,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['affiliate_commissions', affiliateCode?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_code_id', affiliateCode!.id)
        .order('month', { ascending: false });
      return data ?? [];
    },
    enabled: !!affiliateCode,
  });

  const referralLink = affiliateCode
    ? `${window.location.origin}/?ref=${affiliateCode.code}`
    : null;

  const totalEarningsCents = commissions.reduce((sum: number, c: any) => sum + (c.amount_cents ?? 0), 0);
  const pendingCents = commissions
    .filter((c: any) => c.status === 'pending')
    .reduce((sum: number, c: any) => sum + (c.amount_cents ?? 0), 0);
  const activeReferrals = referrals.filter((r: any) => r.status === 'active').length;

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!affiliateCode) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Seu código de afiliado ainda não foi ativado. Fale com o suporte.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Link de afiliado */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Seu link de indicação</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-border/40 bg-muted/50 px-3 py-2 text-xs select-all">
            {referralLink}
          </code>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 h-9"
            onClick={copyLink}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Quem se cadastrar por esse link ganha 7 dias grátis no plano Standard.
        </p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center space-y-1">
          <Users className="h-5 w-5 mx-auto text-primary" />
          <p className="text-lg font-bold text-foreground">{referrals.length}</p>
          <p className="text-[11px] text-muted-foreground">Indicações</p>
        </Card>
        <Card className="p-4 text-center space-y-1">
          <TrendingUp className="h-5 w-5 mx-auto text-primary" />
          <p className="text-2xl font-bold text-foreground">{activeReferrals}</p>
          <p className="text-[11px] text-muted-foreground">Ativos</p>
        </Card>
        <Card className="p-4 text-center space-y-1">
          <DollarSign className="h-5 w-5 mx-auto text-primary" />
          <p className="text-2xl font-bold text-foreground">
            R${(totalEarningsCents / 100).toFixed(2)}
          </p>
          <p className="text-[11px] text-muted-foreground">Total ganho</p>
        </Card>
      </div>

      {/* Comissões pendentes */}
      {pendingCents > 0 && (
        <Card className="p-4 flex items-center justify-between border-amber-500/30 bg-amber-500/5">
          <span className="text-sm font-medium text-foreground">Comissão pendente</span>
          <span className="text-lg font-bold text-amber-400">R${(pendingCents / 100).toFixed(2)}</span>
        </Card>
      )}

      {/* Histórico de comissões */}
      {commissions.length > 0 && (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Histórico</p>
          <div className="space-y-2">
            {commissions.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground capitalize">
                  {new Date(c.month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    R${(c.amount_cents / 100).toFixed(2)}
                  </span>
                  <Badge
                    variant="outline"
                    className={c.status === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]'
                    }
                  >
                    {c.status === 'paid' ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {commissions.length === 0 && referrals.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma indicação ainda. Compartilhe seu link!
          </p>
        </Card>
      )}
    </div>
  );
}
