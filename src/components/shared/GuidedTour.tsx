import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TourStep {
  target?: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onBeforeStep?: () => void | Promise<void>;
}

interface GuidedTourProps {
  steps: TourStep[];
  completedKey: string;
  stepKey: string;
  ready: boolean;
  onComplete?: () => void;
}

const GuidedTour = ({ steps, completedKey, stepKey, ready, onComplete }: GuidedTourProps) => {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;
    const completed = localStorage.getItem(completedKey) === 'true';
    if (completed) return;

    const savedStep = parseInt(localStorage.getItem(stepKey) || '0', 10);
    setStep(savedStep < steps.length ? savedStep : 0);

    const timer = setTimeout(() => setActive(true), 1000);
    return () => clearTimeout(timer);
  }, [ready, completedKey, stepKey, steps.length]);

  const measureTarget = useCallback(() => {
    const currentStep = steps[step];
    if (!currentStep?.target) { setTargetRect(null); return; }
    const el = document.querySelector(currentStep.target);
    if (el) setTargetRect(el.getBoundingClientRect());
    else setTargetRect(null);
  }, [step, steps]);

  useEffect(() => {
    if (!active) return;

    const currentStep = steps[step];
    let cancelled = false;

    const run = async () => {
      if (currentStep?.onBeforeStep) {
        await currentStep.onBeforeStep();
        // Wait for DOM to settle after tab change etc.
        await new Promise((r) => setTimeout(r, 350));
      }
      if (!cancelled) measureTarget();
    };

    run();

    const interval = setInterval(measureTarget, 300);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [active, step, measureTarget, steps]);

  useEffect(() => {
    if (active) localStorage.setItem(stepKey, String(step));
  }, [step, active, stepKey]);

  const completeTour = () => {
    setActive(false);
    localStorage.setItem(completedKey, 'true');
    localStorage.removeItem(stepKey);
    onComplete?.();
  };

  const handleNext = () => {
    if (step >= steps.length - 1) completeTour();
    else setStep((s) => s + 1);
  };
  const handlePrev = () => { if (step > 0) setStep((s) => s - 1); };

  if (!active) return null;

  const currentStep = steps[step];
  const isCentered = !currentStep.target || !targetRect;
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const isWelcomeOrEnd = !currentStep.target;

  const getTooltipStyle = (): React.CSSProperties => {
    if (isCentered) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

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

  return createPortal(
    <div className="fixed inset-0 z-[99999]" role="dialog" aria-modal="true">
      <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !isCentered && (
              <rect
                x={targetRect.left - 6} y={targetRect.top - 6}
                width={targetRect.width + 12} height={targetRect.height + 12}
                rx="12" ry="12" fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.65)"
          mask="url(#tour-mask)" style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {targetRect && !isCentered && (
        <div className="fixed rounded-xl border-2 border-primary/50 pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - 6, top: targetRect.top - 6,
            width: targetRect.width + 12, height: targetRect.height + 12,
            boxShadow: '0 0 20px hsl(var(--primary) / 0.3), inset 0 0 20px hsl(var(--primary) / 0.1)',
          }}
        />
      )}

      <div ref={tooltipRef} style={getTooltipStyle()}
        className={cn(
          'z-[100000] w-[320px] max-w-[90vw] rounded-2xl border border-border bg-card text-card-foreground shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 duration-200',
        )}
      >
        {!isCentered && targetRect && (
          <div className={cn(
            'absolute w-3 h-3 rotate-45 bg-[hsl(220,20%,12%)] border border-white/10',
            currentStep.placement === 'bottom' && '-top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0',
            currentStep.placement === 'top' && '-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0',
            currentStep.placement === 'right' && '-left-1.5 top-1/2 -translate-y-1/2 border-r-0 border-b-0',
            currentStep.placement === 'left' && '-right-1.5 top-1/2 -translate-y-1/2 border-l-0 border-t-0',
          )} />
        )}

        <div className="p-5 space-y-3">
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

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              Passo {step + 1} de {steps.length}
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

          {!isLast && (
            <button onClick={completeTour}
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

export default GuidedTour;
