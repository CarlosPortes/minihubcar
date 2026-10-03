'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeId } from '@/features/theme/context/theme-context';
import { useTranslation } from '@/i18n';
import { Palette, Check } from 'lucide-react';

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title={`${t('common.theme')}: ${currentTheme?.name || 'Tema'}`}
        className="flex h-9 items-center gap-2 px-2.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors text-xs font-semibold"
      >
        <Palette className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline-block max-w-[90px] truncate">{currentTheme?.name}</span>
        <div
          className="h-2.5 w-2.5 rounded-full border border-border shrink-0"
          style={{ backgroundColor: currentTheme?.colors.primary }}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-card border border-border shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
          <div className="px-3 py-2 border-b border-border/60">
            <p className="text-xs font-bold text-foreground">{t('themes.title')}</p>
            <p className="text-[11px] text-muted-foreground">{t('themes.subtitle')}</p>
          </div>

          <div className="py-1 space-y-1 max-h-80 overflow-y-auto">
            {themes.map((t) => {
              const isSelected = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 text-foreground font-semibold'
                      : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Swatch Preview */}
                    <div
                      className="h-7 w-7 rounded-lg border border-border/80 flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
                      style={{ backgroundColor: t.colors.bg }}
                    >
                      <div
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: t.colors.primary }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                        {t.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
