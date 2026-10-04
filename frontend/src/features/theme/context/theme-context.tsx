'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeId = 'dark' | 'light' | 'monaco' | 'gulf' | 'british-green' | 'midnight';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
  };
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Carbon Dark',
    description: 'Estilo padrão com fibra de carbono e detalhes em vermelho',
    colors: {
      bg: '#0B0F17',
      card: '#131B2A',
      primary: '#E11D48',
      accent: '#06B6D4',
    },
  },
  {
    id: 'light',
    name: 'Classic Light',
    description: 'Interface clara com alto contraste e acabamento esportivo',
    colors: {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      primary: '#E11D48',
      accent: '#0891B2',
    },
  },
  {
    id: 'monaco',
    name: 'Monaco Racing',
    description: 'Asfalto preto profundo com Vermelho Rosso Corsa e detalhes dourados',
    colors: {
      bg: '#09090B',
      card: '#141418',
      primary: '#EF233C',
      accent: '#F59E0B',
    },
  },
  {
    id: 'gulf',
    name: 'Gulf Heritage',
    description: 'Cores clássicas de Le Mans: Azul Petróleo, Laranja GT e Ciano',
    colors: {
      bg: '#08121E',
      card: '#0F1F33',
      primary: '#FF6600',
      accent: '#38BDF8',
    },
  },
  {
    id: 'british-green',
    name: 'British Green',
    description: 'Elegância clássica de Silverstone em verde floresta e ouro champanhe',
    colors: {
      bg: '#06130D',
      card: '#0C2117',
      primary: '#10B981',
      accent: '#EAB308',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Neon',
    description: 'Atmosfera cyberpunk noturna com púrpura neon e ciano elétrico',
    colors: {
      bg: '#0D081B',
      card: '#17102D',
      primary: '#A855F7',
      accent: '#06B6D4',
    },
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('minihub_theme') as ThemeId | null;
    if (saved && AVAILABLE_THEMES.some((t) => t.id === saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
      if (saved === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('minihub_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
