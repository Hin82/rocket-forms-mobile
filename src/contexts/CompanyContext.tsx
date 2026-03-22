import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const COMPANY_STORAGE_KEY = 'selected_company_id';

interface Company {
  id: string;
  name: string;
  role: string;
}

interface CompanyState {
  selectedCompanyId: string | null;
  companies: Company[];
  setSelectedCompany: (id: string | null) => Promise<void>;
  isPersonalWorkspace: boolean;
  loading: boolean;
}

const CompanyContext = createContext<CompanyState | undefined>(undefined);

async function loadSelectedCompanyId(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(COMPANY_STORAGE_KEY);
    }
    return await SecureStore.getItemAsync(COMPANY_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function saveSelectedCompanyId(id: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (id) {
      localStorage.setItem(COMPANY_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(COMPANY_STORAGE_KEY);
    }
    return;
  }
  if (id) {
    await SecureStore.setItemAsync(COMPANY_STORAGE_KEY, id);
  } else {
    await SecureStore.deleteItemAsync(COMPANY_STORAGE_KEY);
  }
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompanies([]);
      setSelectedCompanyIdState(null);
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true);
      try {
        // Fetch company memberships
        const { data, error } = await supabase
          .from('company_memberships')
          .select('company_id, role, companies(id, name)')
          .eq('user_id', user.id);

        if (error) throw error;

        const mapped: Company[] = (data ?? []).map((m: any) => ({
          id: m.companies.id,
          name: m.companies.name,
          role: m.role,
        }));

        setCompanies(mapped);

        // Restore saved selection
        const savedId = await loadSelectedCompanyId();
        if (savedId && mapped.some(c => c.id === savedId)) {
          setSelectedCompanyIdState(savedId);
        } else if (mapped.length > 0) {
          setSelectedCompanyIdState(mapped[0].id);
        }
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  const setSelectedCompany = async (id: string | null) => {
    setSelectedCompanyIdState(id);
    await saveSelectedCompanyId(id);
  };

  const isPersonalWorkspace = useMemo(
    () => selectedCompanyId === null,
    [selectedCompanyId],
  );

  return (
    <CompanyContext.Provider
      value={{ selectedCompanyId, companies, setSelectedCompany, isPersonalWorkspace, loading }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompany must be used within CompanyProvider');
  return context;
}
