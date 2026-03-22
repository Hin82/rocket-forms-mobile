import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const LANGUAGE_STORAGE_KEY = 'app_language';

export const LANGUAGES = [
  { code: 'sv', name: 'Svenska', flag: '\ud83c\uddf8\ud83c\uddea' },
  { code: 'en', name: 'English', flag: '\ud83c\uddec\ud83c\udde7' },
  { code: 'no', name: 'Norsk', flag: '\ud83c\uddf3\ud83c\uddf4' },
  { code: 'da', name: 'Dansk', flag: '\ud83c\udde9\ud83c\uddf0' },
  { code: 'fi', name: 'Suomi', flag: '\ud83c\uddeb\ud83c\uddee' },
  { code: 'de', name: 'Deutsch', flag: '\ud83c\udde9\ud83c\uddea' },
  { code: 'fr', name: 'Fran\u00e7ais', flag: '\ud83c\uddeb\ud83c\uddf7' },
  { code: 'es', name: 'Espa\u00f1ol', flag: '\ud83c\uddea\ud83c\uddf8' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

interface LanguageState {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
}

const LanguageContext = createContext<LanguageState | undefined>(undefined);

async function loadLanguage(): Promise<LanguageCode> {
  try {
    if (Platform.OS === 'web') {
      return (localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode) ?? 'sv';
    }
    const stored = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
    return (stored as LanguageCode) ?? 'sv';
  } catch {
    return 'sv';
  }
}

async function saveLanguage(code: LanguageCode): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    return;
  }
  await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, code);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('sv');

  useEffect(() => {
    loadLanguage().then(setLanguageState);
  }, []);

  const setLanguage = async (code: LanguageCode) => {
    setLanguageState(code);
    await saveLanguage(code);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
