import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Returns the first verified custom domain with use_for_forms=true for the current user,
 * or null if none exists. The returned value is the base domain (e.g. "acme.com").
 * Consumers should prepend "forms." to build URLs (e.g. "https://forms.acme.com/form/{id}").
 */
export function useCustomFormDomain(): string | null {
  const [domain, setDomain] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_domains')
          .select('domain')
          .eq('status', 'verified')
          .eq('use_for_forms', true)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setDomain(data.domain);
        }
      } catch (err) {
        console.error('Error loading custom form domain:', err);
      }
    };

    load();
  }, []);

  return domain;
}
