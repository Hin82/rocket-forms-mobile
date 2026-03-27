import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../translations';
import { useLanguage } from '../contexts/LanguageContext';

export interface Submission {
  id: string;
  form_id: string;
  form_data: Record<string, any>;
  signature: string | null;
  submitted_at: string;
  user_id: string | null;
  form_name?: string;
}

export function useSubmissions(formId?: string) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['submissions', formId || 'all', user?.id, language],
    queryFn: async () => {
      if (formId) {
        const { data, error } = await supabase
          .from('submissions')
          .select('*')
          .eq('form_id', formId)
          .order('submitted_at', { ascending: false })
          .limit(100);
        if (error) throw error;
        return (data || []) as Submission[];
      }

      // All submissions: get user's form IDs first
      const { data: forms } = await supabase
        .from('forms')
        .select('id, name')
        .eq('user_id', user!.id);

      if (!forms?.length) return [];

      const formIds = forms.map(f => f.id);
      const formNameMap: Record<string, string> = {};
      forms.forEach(f => { formNameMap[f.id] = f.name; });

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .in('form_id', formIds)
        .order('submitted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map(s => ({
        ...s,
        form_name: formNameMap[s.form_id] || t('forms', 'unknownForm'),
      })) as Submission[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Real-time subscription for new submissions
  useEffect(() => {
    if (!user || !formId) return;

    const channel = supabase
      .channel(`submissions-${formId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'submissions',
        filter: `form_id=eq.${formId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['submissions', formId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, formId, queryClient]);

  return query;
}
