import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Copy, Link2, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

function generateAffiliateCode(fullName: string): string {
  return fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 20);
}

interface AffiliateManagerProps {
  userId: string;
  fullName: string | null;
}

interface AffiliateCode {
  id: string;
  code: string;
  active: boolean;
}

const AffiliateManager = ({ userId, fullName }: AffiliateManagerProps) => {
  const [affiliateCode, setAffiliateCode] = useState<AffiliateCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchCode is stable
  }, [userId]);

  const fetchCode = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('affiliate_codes')
      .select('id, code, active')
      .eq('user_id', userId)
      .maybeSingle();
    setAffiliateCode(data as AffiliateCode | null);
    setLoading(false);
  };

  const activateAffiliate = async () => {
    if (!fullName) {
      toast.error('Cliente sem nome cadastrado');
      return;
    }
    setActing(true);

    const code = generateAffiliateCode(fullName);
    let suffix = 1;
    let inserted = false;

    while (!inserted && suffix <= 10) {
      const tryCode = suffix === 1 ? code : `${code.slice(0, 17)}-${suffix}`;
      const { data, error } = await supabase
        .from('affiliate_codes')
        .insert({ user_id: userId, code: tryCode })
        .select('id, code, active')
        .single();

      if (!error && data) {
        setAffiliateCode(data as AffiliateCode);
        inserted = true;
        toast.success('Afiliação ativada!');
      } else if (error?.code === '23505') {
        suffix++;
      } else {
        toast.error('Erro ao criar código de afiliado');
        break;
      }
    }
    setActing(false);
  };

  const toggleActive = async (active: boolean) => {
    if (!affiliateCode) return;
    setActing(true);
    const { error } = await supabase
      .from('affiliate_codes')
      .update({ active })
      .eq('id', affiliateCode.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      setAffiliateCode({ ...affiliateCode, active });
    }
    setActing(false);
  };

  const copyLink = () => {
    if (!affiliateCode) return;
    const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const link = `${baseUrl}/?ref=${affiliateCode.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Carregando afiliação...</span>
      </div>
    );
  }

  if (!affiliateCode) {
    return (
      <div className="border border-dashed border-border/60 rounded-lg p-3 mt-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Afiliação</p>
            <p className="text-[11px] text-muted-foreground/70">Nenhum código ativo</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={activateAffiliate}
            disabled={acting}
          >
            {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
            Ativar Afiliação
          </Button>
        </div>
      </div>
    );
  }

  const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const fullLink = `${baseUrl}/?ref=${affiliateCode.code}`;

  return (
    <div className="border border-violet-500/20 bg-violet-500/5 rounded-lg p-3 mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">Afiliação</p>
          <Badge
            variant="outline"
            className={affiliateCode.active
              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[9px] px-1.5 py-0 h-4'
              : 'bg-muted text-muted-foreground border-border text-[9px] px-1.5 py-0 h-4'
            }
          >
            {affiliateCode.active ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={affiliateCode.active}
            onCheckedChange={toggleActive}
            disabled={acting}
            className="scale-75"
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <code className="text-[10px] bg-background/60 border border-border/40 rounded px-2 py-1 flex-1 truncate select-all">
          {fullLink}
        </code>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={copyLink}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
};

export default AffiliateManager;
