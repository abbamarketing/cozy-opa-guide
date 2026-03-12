import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

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

      // Mark onboarding complete
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('user_id', user.id);

      navigate('/dashboard', { replace: true });
    };

    // Check if already confirmed (e.g. page reload)
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

    // Polling fallback (every 5s)
    const startPolling = () => {
      const poll = async () => {
        const found = await checkExisting();
        if (!found && !timedOut) {
          pollRef.current = setTimeout(poll, 5000);
        }
      };
      pollRef.current = setTimeout(poll, 5000);
    };

    // Realtime subscription
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
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('Realtime channel issue, relying on polling fallback');
        }
      });

    channelRef.current = channel;

    // Initial check
    checkExisting();

    // Start polling fallback
    startPolling();

    // Timeout
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 bg-card shadow-2xl">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          {!timedOut ? (
            <>
              {/* Animated icon */}
              <div className="relative flex items-center justify-center">
                {/* Pulse rings */}
                <div className="absolute h-20 w-20 animate-ping rounded-full bg-primary/20" />
                <div
                  className="absolute h-16 w-16 rounded-full bg-primary/10"
                  style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.5s' }}
                />
                {/* Spinner + icon */}
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                  <Loader2 className="absolute h-16 w-16 animate-spin text-primary/40" />
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  ✨ Processando...
                </h2>
                <p className="text-muted-foreground">
                  Estamos confirmando seu pagamento. Isso leva apenas alguns segundos.
                </p>
              </div>

              <p className="text-sm text-muted-foreground/70">
                Você será redirecionado automaticamente.
              </p>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Tempo esgotado
                </h2>
                <p className="text-muted-foreground">
                  Não conseguimos confirmar seu pagamento. Tente novamente ou entre em contato com o suporte.
                </p>
              </div>

              <Button
                onClick={() => navigate('/onboarding/payment', { replace: true })}
                className="w-full"
              >
                Tentar novamente
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
