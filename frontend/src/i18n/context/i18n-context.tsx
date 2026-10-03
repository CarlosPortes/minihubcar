'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, LanguageOption, AVAILABLE_LANGUAGES, TranslationDictionary } from '../types';
import { pt } from '../locales/pt';
import { en } from '../locales/en';
import { es } from '../locales/es';

const DICTIONARIES: Record<Language, TranslationDictionary> = {
  pt,
  en,
  es,
};

const STORAGE_KEY = 'minihubcar_lang';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  availableLanguages: LanguageOption[];
  currentLanguageOption: LanguageOption;
  t: (path: string, params?: Record<string, string | number>) => string;
  tArray: (path: string) => string[];
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pt');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Tenta carregar do localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    if (saved && (saved === 'pt' || saved === 'en' || saved === 'es')) {
      setLanguageState(saved);
    } else {
      // 2. Detecta idioma do navegador
      const browserLang = navigator.language?.toLowerCase() || '';
      if (browserLang.startsWith('en')) {
        setLanguageState('en');
      } else if (browserLang.startsWith('es')) {
        setLanguageState('es');
      } else {
        setLanguageState('pt');
      }
    }
    setMounted(true);
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang === 'pt' ? 'pt-BR' : newLang;
    } catch {
      // ignore storage error
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const dict = DICTIONARIES[language] || pt;
    let text = getNestedValue(dict, path);

    // Fallback para português se não encontrado no idioma atual
    if (text === undefined && language !== 'pt') {
      text = getNestedValue(pt, path);
    }

    if (typeof text !== 'string') {
      return path.split('.').pop() || path;
    }

    // Interpolação de variáveis: {name} -> Carlos
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
      }
    }

    return text;
  };

  const tArray = (path: string): string[] => {
    const dict = DICTIONARIES[language] || pt;
    let val = getNestedValue(dict, path);
    if (!Array.isArray(val) && language !== 'pt') {
      val = getNestedValue(pt, path);
    }
    return Array.isArray(val) ? val : [];
  };

  const currentLanguageOption =
    AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        availableLanguages: AVAILABLE_LANGUAGES,
        currentLanguageOption,
        t,
        tArray,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
