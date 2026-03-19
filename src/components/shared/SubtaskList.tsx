import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';

interface Subtask {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  sort_order: number;
  requires_approval: boolean;
  completed_at: string | null;
}

interface SubtaskListProps {
  deliveryId: string;
  /** 'client' shows approve buttons; 'editor' shows complete buttons */
  role: 'client' | 'editor';
}

const statusStyles: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  pending: {
    icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
    label: 'Pendente',
    className: 'text-muted-foreground',
  },
  in_progress: {
    icon: <Clock className="h-3.5 w-3.5 text-primary" />,
    label: 'Em andamento',
    className: 'text-primary',
  },
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
    label: 'Concluída',
    className: 'text-primary',
  },
  approved: {
    icon: <ShieldCheck className="h-3.5 w-3.5 text-[hsl(142,76%,36%)]" />,
    label: 'Aprovada',
    className: 'text-[hsl(142,76%,36%)]',
  },
};

const SubtaskList = ({ deliveryId, role }: SubtaskListProps) => {
  const { user } = useAuth();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchSubtasks = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_subtasks')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('sort_order');
    if (data) setSubtasks(data as unknown as Subtask[]);
    setLoading(false);
  }, [deliveryId]);

  useEffect(() => {
    fetchSubtasks();

    // Realtime
    const channel = supabase
      .channel(`subtasks-${deliveryId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'delivery_subtasks',
        filter: `delivery_id=eq.${deliveryId}`,
      }, () => fetchSubtasks())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [deliveryId, fetchSubtasks]);

  const updateSubtask = async (id: string, status: string) => {
    setUpdatingId(id);
    const updateData: Record<string, unknown> = { status };
    if (status === 'completed' || status === 'approved') {
      updateData.completed_at = new Date().toISOString();
      updateData.completed_by = user?.id;
    }

    const { error } = await supabase
      .from('delivery_subtasks')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic update payload
      .update(updateData as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar subtask');
    } else {
      toast.success(status === 'approved' ? 'Subtask aprovada!' : 'Subtask atualizada!');
      fetchSubtasks();
    }
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (subtasks.length === 0) return null;

  const completedCount = subtasks.filter(
    (s) => s.status === 'completed' || s.status === 'approved'
  ).length;
  const progress = Math.round((completedCount / subtasks.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          Etapas ({completedCount}/{subtasks.length})
        </h4>
        <span className="text-[10px] text-muted-foreground">{progress}%</span>
      </div>

      <Progress value={progress} className="h-1.5" />

      <div className="space-y-1.5">
        {subtasks.map((subtask) => {
          const style = statusStyles[subtask.status] || statusStyles.pending;
          const isUpdating = updatingId === subtask.id;

          return (
            <div
              key={subtask.id}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
            >
              {style.icon}
              <span className={`flex-1 text-sm ${style.className}`}>
                {subtask.name}
              </span>

              {subtask.requires_approval && subtask.status !== 'approved' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Aprovação
                </Badge>
              )}

              {/* Editor actions */}
              {role === 'editor' && subtask.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  disabled={isUpdating}
                  onClick={() => updateSubtask(subtask.id, 'in_progress')}
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Iniciar'}
                </Button>
              )}

              {role === 'editor' && subtask.status === 'in_progress' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  disabled={isUpdating}
                  onClick={() => updateSubtask(subtask.id, 'completed')}
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Concluir'}
                </Button>
              )}

              {/* Client approval action */}
              {role === 'client' && subtask.requires_approval && subtask.status === 'completed' && (
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1"
                  disabled={isUpdating}
                  onClick={() => updateSubtask(subtask.id, 'approved')}
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                    <>
                      <ShieldCheck className="h-3 w-3" />
                      Aprovar
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubtaskList;
