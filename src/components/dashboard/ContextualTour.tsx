import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

const TOUR_KEY = 'tour_completed_v1';

interface ContextualTourProps {
  /** Whether the dashboard has finished loading */
  ready: boolean;
}

const ContextualTour = ({ ready }: ContextualTourProps) => {
  const { user } = useAuth();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!ready || !user?.id) return;

    // Check DB first, then localStorage fallback
    const check = async () => {
      const { data } = await supabase
        .from('user_projects')
        .select('tour_completed')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const dbCompleted = data?.tour_completed === true;
      const localCompleted = localStorage.getItem(TOUR_KEY) === 'true';

      if (!dbCompleted && !localCompleted) {
        // Small delay so DOM elements are rendered
        setTimeout(() => setRun(true), 800);
      }
    };

    check();
  }, [ready, user?.id]);

  const steps: Step[] = [
    {
      target: '[data-tour="quota-card"]',
      content: 'Aqui você vê suas quotas mensais. Clique em "Nova Solicitação" para começar!',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '[data-tour="new-delivery-btn"]',
      content: 'Clique aqui sempre que quiser solicitar um novo vídeo, thumbnail ou capa.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="kanban-board"]',
      content: 'Acompanhe o status de todas as suas entregas. Quando estiver em "Revisar", você pode aprovar ou pedir ajustes.',
      placement: 'top',
    },
  ];

  const handleCallback = async (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem(TOUR_KEY, 'true');

      // Persist in DB
      if (user?.id) {
        await supabase
          .from('user_projects')
          .update({ tour_completed: true })
          .eq('user_id', user.id)
          .eq('status', 'active');
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      disableOverlayClose
      disableCloseOnEsc={false}
      spotlightClicks
      callback={handleCallback}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir Tour',
        next: 'Próximo',
        skip: 'Pular Tour',
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'hsl(142, 76%, 36%)',
          textColor: 'hsl(0, 0%, 90%)',
          backgroundColor: 'hsl(220, 20%, 14%)',
          arrowColor: 'hsl(220, 20%, 14%)',
          overlayColor: 'rgba(0, 0, 0, 0.4)',
        },
        buttonNext: {
          backgroundColor: 'hsl(142, 76%, 36%)',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '13px',
          padding: '6px 16px',
        },
        buttonBack: {
          color: 'hsl(0, 0%, 70%)',
          fontSize: '13px',
        },
        buttonSkip: {
          color: 'hsl(0, 0%, 50%)',
          fontSize: '12px',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '14px',
        },
        tooltipTitle: {
          fontSize: '15px',
          fontWeight: 600,
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
};

/** Call this to restart the tour */
export const restartTour = () => {
  localStorage.removeItem(TOUR_KEY);
  window.location.reload();
};

export default ContextualTour;
