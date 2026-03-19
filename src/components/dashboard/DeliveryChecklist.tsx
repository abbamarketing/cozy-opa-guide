import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardCheck } from 'lucide-react';
import { useDebouncedCallback } from '@/hooks/useDebounce';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface DeliveryChecklistProps {
  userProjectId: string;
  deliveryId: string;
}

const DeliveryChecklist = ({ userProjectId, deliveryId }: DeliveryChecklistProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Debounced save to Supabase
  const persistState = useDebouncedCallback(async (currentItems: ChecklistItem[]) => {
    const state: Record<string, boolean> = {};
    currentItems.forEach((i) => { state[i.id] = i.checked; });
    await supabase
      .from('deliveries')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- checklist_state not in generated types
      .update({ checklist_state: state } as any)
      .eq('id', deliveryId);
  }, 500);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch briefing + saved state in parallel
      const [briefingRes, deliveryRes] = await Promise.all([
        supabase
          .from('onboarding_briefings')
          .select('brand_name, brand_fonts, brand_colors, content_style, primary_color, secondary_color, legend_style, jump_cuts, remove_silences, use_emojis, use_icons')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('deliveries')
          .select('checklist_state')
          .eq('id', deliveryId)
          .maybeSingle(),
      ]);

      const briefing = briefingRes.data;
      if (!briefing) return;

      const savedState = (deliveryRes.data as Record<string, unknown>)?.checklist_state as Record<string, boolean> | null;

      // Build dynamic checklist from briefing
      const checklist: ChecklistItem[] = [];
      let idx = 0;

      checklist.push({ id: `c${idx++}`, label: `Conferir se a identidade da marca "${briefing.brand_name || ''}" está aplicada`, checked: false });

      if (briefing.primary_color) {
        checklist.push({ id: `c${idx++}`, label: `Validar cor primária (${briefing.primary_color})`, checked: false });
      }
      if (briefing.secondary_color) {
        checklist.push({ id: `c${idx++}`, label: `Validar cor secundária (${briefing.secondary_color})`, checked: false });
      }

      const fonts = briefing.brand_fonts as string[] | null;
      if (fonts && fonts.length > 0) {
        checklist.push({ id: `c${idx++}`, label: `Conferir se a fonte principal foi utilizada`, checked: false });
      }

      if (briefing.content_style) {
        checklist.push({ id: `c${idx++}`, label: `Estilo de conteúdo "${briefing.content_style}" respeitado`, checked: false });
      }

      if (briefing.legend_style) {
        checklist.push({ id: `c${idx++}`, label: `Estilo de legenda "${briefing.legend_style}" aplicado`, checked: false });
      }

      if (briefing.jump_cuts) {
        checklist.push({ id: `c${idx++}`, label: 'Jump cuts aplicados conforme briefing', checked: false });
      }

      if (briefing.remove_silences) {
        checklist.push({ id: `c${idx++}`, label: 'Silêncios removidos do vídeo', checked: false });
      }

      if (briefing.use_emojis) {
        checklist.push({ id: `c${idx++}`, label: 'Emojis utilizados nas legendas', checked: false });
      }

      checklist.push({ id: `c${idx++}`, label: 'Duração do vídeo está correta', checked: false });
      checklist.push({ id: `c${idx++}`, label: 'Qualidade de áudio e vídeo verificada', checked: false });

      // Restore saved state
      if (savedState) {
        checklist.forEach((item) => {
          if (savedState[item.id] !== undefined) {
            item.checked = savedState[item.id];
          }
        });
      }

      setItems(checklist);
      setLoaded(true);
    };

    fetchData();
  }, [user, userProjectId, deliveryId]);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
      persistState(next);
      return next;
    });
  }, [persistState]);

  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
          Checklist de Revisão
        </h3>
        <span className="text-[10px] text-muted-foreground font-mono">
          {completedCount}/{items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-start gap-2 rounded-md p-2 cursor-pointer transition-colors hover:bg-muted/20 ${
              item.checked ? 'opacity-60' : ''
            }`}
          >
            <Checkbox
              checked={item.checked}
              onCheckedChange={() => toggleItem(item.id)}
              className="mt-0.5"
            />
            <span className={`text-xs leading-relaxed ${item.checked ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default DeliveryChecklist;
