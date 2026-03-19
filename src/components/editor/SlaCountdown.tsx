import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
interface SlaCountdownProps {
  slaDeadline: string;
  slaHours: number;
}

export function SlaCountdown({ slaDeadline, slaHours }: SlaCountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgency, setUrgency] = useState<'green' | 'yellow' | 'red' | 'blink'>('green');

  useEffect(() => {
    const update = () => {
      const deadline = new Date(slaDeadline);
      const now = new Date();
      const totalMs = slaHours * 60 * 60 * 1000;
      const remainingMs = deadline.getTime() - now.getTime();

      if (remainingMs <= 0) {
        setTimeLeft('SLA ESTOURADO');
        setUrgency('blink');
        return;
      }

      const remainingPct = remainingMs / totalMs;
      if (remainingMs < 3_600_000) setUrgency('blink');
      else if (remainingPct < 0.25) setUrgency('red');
      else if (remainingPct < 0.5) setUrgency('yellow');
      else setUrgency('green');

      const h = Math.floor(remainingMs / 3_600_000);
      const m = Math.floor((remainingMs % 3_600_000) / 60_000);
      setTimeLeft(`${h}h ${m}m`);
    };

    update();
    const intervalMs = (urgency === 'blink' || urgency === 'red') ? 10_000 : 60_000;
    const interval = setInterval(update, intervalMs);
    return () => clearInterval(interval);
  }, [slaDeadline, slaHours, urgency]);

  const colorMap = {
    green: 'text-emerald-600',
    yellow: 'text-amber-500',
    red: 'text-destructive',
    blink: 'text-destructive animate-pulse',
  };

  return (
    <span className={`font-mono text-xs font-semibold inline-flex items-center gap-1 ${colorMap[urgency]}`}>
      <Timer className="h-3 w-3" /> {timeLeft}
    </span>
  );
}
