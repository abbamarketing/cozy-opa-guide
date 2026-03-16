import { useState, useEffect } from 'react';
import { format, addDays, isWeekend, setHours, setMinutes, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon, MapPin, Clock, Loader2, Camera, AlertCircle } from 'lucide-react';
import type { UserProjectData } from '@/hooks/useUserProject';

interface CaptureScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProject: UserProjectData;
  onScheduled: () => void;
  captureLeadDays: number;
}

// Available time slots: weekdays 08h-18h
const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const hour = 8 + i;
  return { value: `${String(hour).padStart(2, '0')}:00`, label: `${String(hour).padStart(2, '0')}:00` };
});

const CaptureScheduleModal = ({
  open,
  onOpenChange,
  userProject,
  onScheduled,
  captureLeadDays,
}: CaptureScheduleModalProps) => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSessionDate, setLastSessionDate] = useState<Date | null>(null);
  const [checkingCooldown, setCheckingCooldown] = useState(true);

  // Minimum 72h lead time (3 days)
  const MIN_LEAD_DAYS = 3;
  const COOLDOWN_DAYS = 28;

  // Use the greater of captureLeadDays or 3 days (72h)
  const effectiveLeadDays = Math.max(captureLeadDays, MIN_LEAD_DAYS);
  const minDate = addDays(new Date(), effectiveLeadDays);

  // Check for 30-day cooldown
  useEffect(() => {
    if (!open || !userProject) return;

    const checkCooldown = async () => {
      setCheckingCooldown(true);
      const { data } = await supabase
        .from('capture_sessions')
        .select('scheduled_date')
        .eq('user_project_id', userProject.id)
        .in('status', ['confirmed', 'completed'])
        .order('scheduled_date', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        // Parse YYYY-MM-DD as local date to avoid UTC shift
        const [y, m, d] = data[0].scheduled_date.split('-').map(Number);
        setLastSessionDate(new Date(y, m - 1, d));
      } else {
        setLastSessionDate(null);
      }
      setCheckingCooldown(false);
    };

    checkCooldown();
  }, [open, userProject]);

  const daysSinceLastSession = lastSessionDate
    ? differenceInDays(new Date(), lastSessionDate)
    : Infinity;

  const isInCooldown = daysSinceLastSession < COOLDOWN_DAYS;
  const cooldownRemainingDays = isInCooldown ? COOLDOWN_DAYS - daysSinceLastSession : 0;

  // Disable weekends and dates before minimum lead time
  const disableDate = (d: Date) => {
    if (d < minDate) return true;
    if (isWeekend(d)) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!date || !time || !user) return;

    if (isInCooldown) {
      toast.error('Aguarde o período de cooldown antes de agendar novamente.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('capture_sessions').insert({
        user_project_id: userProject.id,
        scheduled_date: format(date, 'yyyy-MM-dd'),
        scheduled_time: time,
        location_name: locationName.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        created_by: user.id,
      } as any);

      if (error) throw error;

      logger.info('Captação agendada', { date: format(date, 'yyyy-MM-dd'), time, lead_days: effectiveLeadDays }, 'capture');
      toast.success('Captação agendada com sucesso!');
      onOpenChange(false);
      resetForm();
      onScheduled();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao agendar captação');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDate(undefined);
    setTime('');
    setLocationName('');
    setAddress('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="h-5 w-5 text-primary" />
            Agendar Captação Presencial
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            A captação deve ser agendada com no mínimo <strong>72 horas</strong> de antecedência,
            de <strong>segunda a sexta</strong>, entre <strong>08h e 18h</strong>.
          </DialogDescription>
        </DialogHeader>

        {checkingCooldown ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isInCooldown ? (
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Agendamento indisponível</p>
                <p className="text-xs text-muted-foreground">
                  Você já possui um agendamento recente (último em{' '}
                  <strong>{format(lastSessionDate!, "dd/MM/yyyy", { locale: ptBR })}</strong>).
                  Próxima sessão disponível em{' '}
                  <strong>{format(addDays(lastSessionDate!, COOLDOWN_DAYS), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</strong>{' '}
                  ({cooldownRemainingDays} dia{cooldownRemainingDays !== 1 ? 's' : ''}).
                </p>
              </div>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Rules info */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-1">
              <p className="text-[11px] text-muted-foreground">• Seg–Sex, 08h às 18h</p>
              <p className="text-[11px] text-muted-foreground">• Mínimo 72h de antecedência</p>
              <p className="text-[11px] text-muted-foreground">• 1 agendamento a cada 30 dias</p>
            </div>

            {/* Date picker */}
            <div className="space-y-2">
              <Label className="text-sm">Data da Captação *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11 sm:h-10',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione uma data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={disableDate}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-muted-foreground">
                Disponível a partir de {format(minDate, "dd/MM/yyyy")} (dias úteis)
              </p>
            </div>

            {/* Time - dropdown with fixed slots */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5" /> Horário *
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="h-11 sm:h-10">
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value} className="py-2.5">
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5" /> Local
              </Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Ex: Estúdio ABC, Casa do cliente..."
                maxLength={200}
                className="h-11 sm:h-10"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-sm">Endereço</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade..."
                maxLength={500}
                className="h-11 sm:h-10"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes adicionais sobre a captação..."
                rows={3}
                maxLength={1000}
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!date || !time || saving}
              className="w-full gap-2 h-11 sm:h-10"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Agendar Captação
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CaptureScheduleModal;
