import GuidedTour, { type TourStep } from '@/components/shared/GuidedTour';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

const COMPLETED_KEY = 'tour_completed_client';
const STEP_KEY = 'tour_step_client';

const STEPS: TourStep[] = [
  {
    title: 'Bem-vindo à plataforma!',
    content: 'Vou te mostrar tudo que você precisa saber para acompanhar suas entregas, conversar com editores e muito mais.',
  },
  {
    target: '[data-tour="kanban-board"]',
    title: 'Seu Kanban',
    content: 'Aqui você acompanha todas as suas entregas. Cada coluna representa uma etapa do processo: a fazer, em produção, revisão e aprovado.',
    placement: 'top',
  },
  {
    target: '[data-tour="new-delivery-btn"]',
    title: 'Nova entrega',
    content: 'Clique aqui para solicitar uma nova edição. Você pode pedir Reels, YouTube Shorts, Thumbnails e muito mais.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="delivery-card"]',
    title: 'Card de entrega',
    content: 'Cada card é uma entrega. Clique nele para ver detalhes, conversar com o editor e acompanhar o progresso.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="delivery-chat"]',
    title: 'Chat com o editor',
    content: 'Use o chat para se comunicar diretamente com o editor responsável pela sua entrega. Envie referências, feedbacks e dúvidas.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="kanban-review"]',
    title: 'Revisão e aprovação',
    content: 'Quando o editor finalizar, o vídeo aparece aqui para você revisar. Você pode aprovar ou solicitar ajustes com um clique.',
    placement: 'top',
  },
  {
    target: '[data-tour="nav-calendar"]',
    title: 'Calendário e captações',
    content: 'Aqui você visualiza seu calendário e pode agendar sessões de captação presencial, se disponível no seu plano.',
    placement: 'right',
  },
  {
    title: 'Tudo pronto!',
    content: 'Agora é com você! Se precisar rever este tour, vá em Configurações e clique em "Reiniciar Tour".',
  },
];

interface ContextualTourProps {
  ready: boolean;
}

const ContextualTour = ({ ready }: ContextualTourProps) => {
  const { user } = useAuth();

  const handleComplete = async () => {
    if (user?.id) {
      await supabase
        .from('user_projects')
        .update({ tour_completed: true })
        .eq('user_id', user.id)
        .eq('status', 'active');
    }
  };

  return (
    <GuidedTour
      steps={STEPS}
      completedKey={COMPLETED_KEY}
      stepKey={STEP_KEY}
      ready={ready && !!user?.id}
      onComplete={handleComplete}
    />
  );
};

export const restartTour = () => {
  localStorage.removeItem(COMPLETED_KEY);
  localStorage.removeItem(STEP_KEY);
  window.location.reload();
};

export default ContextualTour;
