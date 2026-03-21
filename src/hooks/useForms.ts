import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Form {
  id: string;
  name: string;
  fields: any[];
  settings: any;
  user_id: string;
  company_id: string | null;
  form_group_id: string | null;
  group_name: string | null;
  notification_email: string | null;
  sender_name: string | null;
  created_at: string;
  updated_at: string;
  submission_count?: number;
  form_groups?: { name: string } | null;
}

export interface FormGroup {
  id: string;
  name: string;
  user_id: string;
  company_id: string | null;
  created_at: string;
}

export function useForms(companyId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['forms', user?.id, companyId],
    queryFn: async () => {
      // Fetch ALL forms the user has access to (personal + company)
      let query = supabase
        .from('forms')
        .select('*, form_groups(name)')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      } else {
        // Get user's company memberships first
        const { data: memberships } = await supabase
          .from('company_memberships')
          .select('company_id')
          .eq('user_id', user!.id)
          .eq('status', 'active');

        const companyIds = (memberships || []).map(m => m.company_id);

        if (companyIds.length > 0) {
          // Fetch personal forms + all company forms
          query = query.or(`user_id.eq.${user!.id},company_id.in.(${companyIds.join(',')})`);
        } else {
          query = query.eq('user_id', user!.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch submission counts
      const formIds = (data || []).map((f: any) => f.id);
      if (formIds.length > 0) {
        const { data: counts } = await supabase
          .from('submissions')
          .select('form_id')
          .in('form_id', formIds);

        const countMap: Record<string, number> = {};
        (counts || []).forEach((s: any) => {
          countMap[s.form_id] = (countMap[s.form_id] || 0) + 1;
        });

        return (data || []).map((f: any) => ({
          ...f,
          submission_count: countMap[f.id] || 0,
        })) as Form[];
      }

      return (data || []) as Form[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFormGroups(companyId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['formGroups', user?.id, companyId],
    queryFn: async () => {
      let query = supabase
        .from('form_groups')
        .select('*')
        .order('name');

      if (companyId) {
        query = query.eq('company_id', companyId);
      } else {
        const { data: memberships } = await supabase
          .from('company_memberships')
          .select('company_id')
          .eq('user_id', user!.id)
          .eq('status', 'active');

        const companyIds = (memberships || []).map(m => m.company_id);
        if (companyIds.length > 0) {
          query = query.or(`user_id.eq.${user!.id},company_id.in.(${companyIds.join(',')})`);
        } else {
          query = query.eq('user_id', user!.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as FormGroup[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDeleteForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', formId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}
