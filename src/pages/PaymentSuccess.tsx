import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const TIMEOUT_MS = 2 * 60 * 1000;

const PaymentSuccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id || confirmed) return;

    const handleConfirmed = async () => {
      setConfirmed(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollRef.current) clearTimeout(pollRef.current);

      // Check client_type to route accordingly
      const { data: up } = await supabase
        .from('user_projects')
        .select('client_type')
        .eq('user_id', user!.id)
        .maybeSingle();

      const ct = (up as any)?.client_type;
      if (ct === 'studio') {
        navigate('/studio', { replace: true });
      } else if (ct === 'subscription') {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    };

    const checkExisting = async () => {
      const { data } = await supabase
        .from('user_projects')
        .select('payment_confirmed_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.payment_confirmed_at) {
        handleConfirmed();
        return true;
      }
      return false;
    };

    const startPolling = () => {
      const poll = async () => {
        const found = await checkExisting();
        if (!found && !timedOut) {
          pollRef.current = setTimeout(poll, 5000);
        }
      };
      pollRef.current = setTimeout(poll, 5000);
    };

    const channel = supabase
      .channel(`payment-confirmation-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_projects',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).payment_confirmed_at) {
            handleConfirmed();
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
    checkExisting();
    startPolling();

    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
      if (pollRef.current) clearTimeout(pollRef.current);
    }, TIMEOUT_MS);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [user?.id, navigate, confirmed, timedOut]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {!timedOut ? (
          <>
            {/* Animated loader */}
            <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              {/* Spinning arc */}
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" style={{ animationDuration: '1.5s' }} />
              {/* Inner glow */}
              <div className="absolute inset-3 rounded-full bg-primary/5" />
              {/* Icon */}
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>

            <h1 className="mb-2 font-mono text-2xl font-bold text-foreground">
              Confirmando pagamento
            </h1>
            <p className="mb-6 text-muted-foreground">
              Estamos processando sua assinatura. Isso leva apenas alguns segundos.
            </p>

            <div className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-card border border-border/30 px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Aguardando confirmação
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-destructive/30 bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>

            <h1 className="mb-2 font-mono text-2xl font-bold text-foreground">
              Tempo esgotado
            </h1>
            <p className="mb-6 text-muted-foreground">
              Não conseguimos confirmar seu pagamento. Tente novamente ou entre em contato com o suporte.
            </p>

            <Button
              onClick={() => navigate('/payment', { replace: true })}
              className="w-full"
              size="lg"
            >
              Tentar novamente
            </Button>
          </>
        )}
      </div>

      <p className="mt-12 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
        AbbaVideo
      </p>
    </div>
  );
};

export default PaymentSuccess;
