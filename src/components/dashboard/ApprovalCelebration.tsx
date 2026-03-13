import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface ApprovalCelebrationProps {
  show: boolean;
  onComplete?: () => void;
}

const CONFETTI_COLORS = [
  'hsl(var(--primary))',
  'hsl(45, 93%, 47%)',
  'hsl(280, 65%, 60%)',
  'hsl(160, 70%, 45%)',
  'hsl(20, 90%, 55%)',
];

const ConfettiPiece = ({ index }: { index: number }) => {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = 10 + Math.random() * 80;
  const delay = Math.random() * 0.3;
  const rotation = Math.random() * 360;
  const size = 6 + Math.random() * 6;

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: 300,
        x: (Math.random() - 0.5) * 200,
        opacity: 0,
        rotate: rotation + 360,
      }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: '30%',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
    />
  );
};

const ApprovalCelebration = ({ show, onComplete }: ApprovalCelebrationProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Confetti */}
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}

          {/* Golden checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="relative"
          >
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[hsl(45,93%,47%)] to-[hsl(35,90%,55%)] flex items-center justify-center shadow-[0_0_40px_hsl(45,93%,47%,0.4)]">
              <Check className="h-10 w-10 text-white" strokeWidth={3} />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-semibold text-foreground"
            >
              Entrega Aprovada! 🎉
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ApprovalCelebration;
