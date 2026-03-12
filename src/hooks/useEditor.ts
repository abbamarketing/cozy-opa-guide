import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface EditorInfo {
  id: string;
  user_id: string;
  display_name: string;
  specialty: string | null;
  status: string;
  max_concurrent_projects: number;
  active_projects: number;
}

export const useEditor = () => {
  const { user } = useAuth();
  const [editor, setEditor] = useState<EditorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEditor(null);
      setIsLoading(false);
      return;
    }

    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('editors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) setEditor(data as unknown as EditorInfo);
      setIsLoading(false);
    };

    fetch();
  }, [user]);

  return { editor, isLoading };
};
