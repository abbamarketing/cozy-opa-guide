import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOUR_COMPLETED_KEY = 'tour_completed_client';
const TOUR_STEP_KEY = 'tour_step_client';

interface TourStep {
  target?: string; // data-tour selector; undefined = centered modal
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

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
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if tour should start
  useEffect(() => {
    if (!ready || !user?.id) return;
    const completed = localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
    if (completed) return;

    const savedStep = parseInt(localStorage.getItem(TOUR_STEP_KEY) || '0', 10);
    setStep(savedStep < STEPS.length ? savedStep : 0);

    // Delay to let DOM render
    const timer = setTimeout(() => setActive(true), 1000);
    return () => clearTimeout(timer);
  }, [ready, user?.id]);

  // Find and measure target element
  const measureTarget = useCallback(() => {
    const currentStep = STEPS[step];
    if (!currentStep?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(currentStep.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!active) return;
    measureTarget();
    const interval = setInterval(measureTarget, 300);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [active, step, measureTarget]);

  // Persist step
  useEffect(() => {
    if (active) {
      localStorage.setItem(TOUR_STEP_KEY, String(step));
    }
  }, [step, active]);

  const completeTour = async () => {
    setActive(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    localStorage.removeItem(TOUR_STEP_KEY);

    if (user?.id) {
      await supabase
        .from('user_projects')
        .update({ tour_completed: true })
        .eq('user_id', user.id)
        .eq('status', 'active');
    }
  };

  const handleNext = () => {
    if (step >= STEPS.length - 1) {
      completeTour();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSkip = () => {
    completeTour();
  };

  if (!active) return null;

  const currentStep = STEPS[step];
  const isCentered = !currentStep.target || !targetRect;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const isWelcomeOrEnd = !currentStep.target;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (isCentered) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const pad = 12;
    const placement = currentStep.placement || 'bottom';
    const style: React.CSSProperties = { position: 'fixed' };

    switch (placement) {
      case 'bottom':
        style.top = targetRect!.bottom + pad;
        style.left = targetRect!.left + targetRect!.width / 2;
        style.transform = 'translateX(-50%)';
        break;
      case 'top':
        style.bottom = window.innerHeight - targetRect!.top + pad;
        style.left = targetRect!.left + targetRect!.width / 2;
        style.transform = 'translateX(-50%)';
        break;
      case 'right':
        style.top = targetRect!.top + targetRect!.height / 2;
        style.left = targetRect!.right + pad;
        style.transform = 'translateY(-50%)';
        break;
      case 'left':
        style.top = targetRect!.top + targetRect!.height / 2;
        style.right = window.innerWidth - targetRect!.left + pad;
        style.transform = 'translateY(-50%)';
        break;
    }

    return style;
  };

  // Spotlight clip path
  const getClipPath = () => {
    if (!targetRect || isCentered) return undefined;
    const p = 6;
    const r = 12;
    const x = targetRect.left - p;
    const y = targetRect.top - p;
    const w = targetRect.width + p * 2;
    const h = targetRect.height + p * 2;

    // SVG-based clip with rounded rect cutout
    return `url(#tour-spotlight)`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999]" role="dialog" aria-modal="true">
      {/* Overlay with spotlight cutout */}
      <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !isCentered && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Spotlight ring glow */}
      {targetRect && !isCentered && (
        <div
          className="fixed rounded-xl border-2 border-primary/50 pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 20px hsl(var(--primary) / 0.3), inset 0 0 20px hsl(var(--primary) / 0.1)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={getTooltipStyle()}
        className={cn(
          'z-[100000] w-[320px] max-w-[90vw] rounded-2xl border border-white/10 bg-[hsl(220,20%,12%)] shadow-2xl backdrop-blur-xl',
          'animate-in fade-in-0 zoom-in-95 duration-200',
        )}
      >
        {/* Arrow */}
        {!isCentered && targetRect && (
          <div
            className={cn(
              'absolute w-3 h-3 rotate-45 bg-[hsl(220,20%,12%)] border border-white/10',
              currentStep.placement === 'bottom' && '-top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0',
              currentStep.placement === 'top' && '-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0',
              currentStep.placement === 'right' && '-left-1.5 top-1/2 -translate-y-1/2 border-r-0 border-b-0',
              currentStep.placement === 'left' && '-right-1.5 top-1/2 -translate-y-1/2 border-l-0 border-t-0',
            )}
          />
        )}

        <div className="p-5 space-y-3">
          {/* Icon for welcome/end */}
          {isWelcomeOrEnd && (
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
          )}

          <div className={cn(isWelcomeOrEnd && 'text-center')}>
            <h4 className="text-sm font-bold text-foreground">{currentStep.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{currentStep.content}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              Passo {step + 1} de {STEPS.length}
            </span>

            <div className="flex items-center gap-1.5">
              {!isFirst && (
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs gap-1 text-muted-foreground" onClick={handlePrev}>
                  <ChevronLeft className="h-3 w-3" /> Anterior
                </Button>
              )}
              <Button size="sm" className="h-7 px-3 text-xs gap-1 bg-primary text-primary-foreground" onClick={handleNext}>
                {isLast ? 'Concluir' : 'Próximo'} {!isLast && <ChevronRight className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Skip link */}
          {!isLast && (
            <button
              onClick={handleSkip}
              className="block w-full text-center text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors pt-1"
            >
              Pular tour
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Call this to restart the tour */
export const restartTour = () => {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
  localStorage.removeItem(TOUR_STEP_KEY);
  window.location.reload();
};

export default ContextualTour;
