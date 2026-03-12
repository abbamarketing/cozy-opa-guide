import { useState } from 'react';
import { format, addDays } from 'date-fns';
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
import { cn } from '@/lib/utils';
import { CalendarIcon, MapPin, Clock, Loader2, Camera } from 'lucide-react';
import type { UserProjectData } from '@/hooks/useUserProject';

interface CaptureScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProject: UserProjectData;
  onScheduled: () => void;
  captureLeadDays: number;
}

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

  const minDate = addDays(new Date(), captureLeadDays);

  const handleSubmit = async () => {
    if (!date || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('capture_sessions').insert({
        user_project_id: userProject.id,
        scheduled_date: format(date, 'yyyy-MM-dd'),
        scheduled_time: time || null,
        location_name: locationName.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        created_by: user.id,
      } as any);

      if (error) throw error;

      logger.info('Captação agendada', { date: format(date, 'yyyy-MM-dd'), lead_days: captureLeadDays }, 'capture');
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Agendar Captação Presencial
          </DialogTitle>
          <DialogDescription>
            Agende uma data para a captação de vídeo. A data mínima é{' '}
            <strong>{captureLeadDays} dias</strong> a partir de hoje.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>Data da Captação *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
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
                  disabled={(d) => d < minDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-[10px] text-muted-foreground">
              Disponível a partir de {format(minDate, "dd/MM/yyyy")}
            </p>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Horário (opcional)
            </Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Local
            </Label>
            <Input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Ex: Estúdio ABC, Casa do cliente..."
              maxLength={200}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade..."
              maxLength={500}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
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
            disabled={!date || saving}
            className="w-full gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Agendar Captação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CaptureScheduleModal;
