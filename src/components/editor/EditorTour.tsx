import GuidedTour, { type TourStep } from '@/components/shared/GuidedTour';

const COMPLETED_KEY = 'tour_completed_editor';
const STEP_KEY = 'tour_step_editor';

const STEPS: TourStep[] = [
  {
    title: 'Bem-vindo, Editor!',
    content: 'Este é o seu painel de trabalho. Vou te mostrar como funciona tudo por aqui.',
  },
  {
    target: '[data-tour="editor-kanban"]',
    title: 'Seu Kanban',
    content: 'Aqui aparecem todas as entregas atribuídas a você, organizadas por etapa do processo.',
    placement: 'top',
  },
  {
    target: '[data-tour="editor-card-production"]',
    title: 'Em Produção',
    content: 'Cards em "Em Produção" são suas responsabilidades ativas. Foque neles para manter o SLA em dia.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-submit-btn"]',
    title: 'Botão Entregar',
    content: 'Quando terminar o vídeo, clique aqui para enviar ao cliente para revisão.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-submit-modal"]',
    title: 'Modal de entrega',
    content: 'Você pode enviar o link do vídeo ou fazer upload direto. Adicione notas para o cliente se necessário.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-chat"]',
    title: 'Chat com o cliente',
    content: 'Use o chat para tirar dúvidas com o cliente durante a produção.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-subtasks"]',
    title: 'Subtarefas',
    content: 'Use as subtarefas para organizar seu processo de produção e manter o cliente atualizado sobre o progresso.',
  },
];

interface EditorTourProps {
  ready: boolean;
}

const EditorTour = ({ ready }: EditorTourProps) => (
  <GuidedTour
    steps={STEPS}
    completedKey={COMPLETED_KEY}
    stepKey={STEP_KEY}
    ready={ready}
  />
);

export const restartEditorTour = () => {
  localStorage.removeItem(COMPLETED_KEY);
  localStorage.removeItem(STEP_KEY);
  window.location.reload();
};

export default EditorTour;
