import GuidedTour, { type TourStep } from '@/components/shared/GuidedTour';

const COMPLETED_KEY = 'tour_completed_admin';
const STEP_KEY = 'tour_step_admin';

const STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao painel Admin!',
    content: 'Aqui você gerencia toda a operação: clientes, editores, entregas e métricas. Vamos dar uma volta rápida.',
  },
  {
    target: '[data-tour="admin-kpis"]',
    title: 'KPIs',
    content: 'Entregas aprovadas, tempo médio de produção e percentual dentro do SLA. Tudo visível de relance.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-kanban"]',
    title: 'Kanban de Entregas',
    content: 'Visão geral de todas as entregas de todos os clientes e editores em um só lugar.',
    placement: 'top',
  },
  {
    target: '[data-tour="admin-view-toggle"]',
    title: 'Toggle de Visualização',
    content: 'Alterne entre Kanban, Lista ou Calendário para ver as entregas da forma que preferir.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-new-demand"]',
    title: 'Nova Demanda',
    content: 'Crie entregas diretamente, insira roteiros e atribua a editores sem depender do cliente.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-calendario"]',
    title: 'Calendário',
    content: 'Centraliza todas as datas de entrega, sessões de gravação e eventos personalizados.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-clientes"]',
    title: 'Gestão de Clientes',
    content: 'Gerencie todos os clientes, planos, atribuições e histórico de cada um.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="admin-tab-editores"]',
    title: 'Gestão de Editores',
    content: 'Gerencie sua equipe de editores, veja performance, carga de trabalho e entregas.',
    placement: 'bottom',
  },
  {
    title: 'Tudo pronto!',
    content: 'Agora você conhece as principais ferramentas. Se precisar rever, clique no menu de ajuda para reiniciar o tour.',
  },
];

interface AdminTourProps {
  ready: boolean;
}

const AdminTour = ({ ready }: AdminTourProps) => (
  <GuidedTour
    steps={STEPS}
    completedKey={COMPLETED_KEY}
    stepKey={STEP_KEY}
    ready={ready}
  />
);

export const restartAdminTour = () => {
  localStorage.removeItem(COMPLETED_KEY);
  localStorage.removeItem(STEP_KEY);
  window.location.reload();
};

export default AdminTour;
