import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DeliveryData } from '@/components/dashboard/DeliveryCard';

const DELIVERIES_KEY = 'deliveries';

const mapDelivery = (d: any): DeliveryData => ({
  id: d.id,
  title: d.title,
  description: d.description,
  delivery_type: d.delivery_type,
  status: d.status,
  due_date: d.due_date,
  revision_count: d.revision_count,
  max_revisions: d.max_revisions,
  file_url: d.file_url,
  thumbnail_url: d.thumbnail_url,
  editor_name: d.editor?.display_name || null,
  editor_id: d.editor_id,
  created_at: d.created_at,
  delivered_at: d.delivered_at,
  approved_at: d.approved_at,
  revision_notes: d.revision_notes,
  user_project_id: d.user_project_id,
});

async function fetchDeliveries(userProjectId: string): Promise<DeliveryData[]> {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, editor:editors(display_name)')
    .eq('user_project_id', userProjectId)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data || []).map(mapDelivery);
}

export function useDeliveries(userProjectId: string) {
  const queryClient = useQueryClient();
  const queryKey = [DELIVERIES_KEY, userProjectId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchDeliveries(userProjectId),
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: !!userProjectId,
  });

  // Realtime subscription — invalidate cache on any change
  useEffect(() => {
    if (!userProjectId) return;

    const channel = supabase
      .channel(`deliveries-rq-${userProjectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `user_project_id=eq.${userProjectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProjectId, queryClient]); // queryKey is stable via userProjectId

  // Create delivery mutation
  const createDelivery = useMutation({
    mutationFn: async (insertData: Record<string, any>) => {
      const { error } = await supabase.from('deliveries').insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update delivery mutation
  const updateDelivery = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('deliveries')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    deliveries: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    createDelivery,
    updateDelivery,
  };
}
