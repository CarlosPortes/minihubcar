'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Language, AVAILABLE_LANGUAGES } from '@/i18n';
import { Globe, Check } from 'lucide-react';

export function LanguageSelector() {
  const { language, setLanguage, currentLanguageOption, availableLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        title={`Idioma atual: ${currentLanguageOption.nativeName}`}
        className="flex h-9 items-center gap-1.5 px-2.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors text-xs font-semibold"
      >
        <span className="text-base leading-none">{currentLanguageOption.flag}</span>
        <span className="hidden sm:inline-block uppercase tracking-wider text-[11px] font-bold">
          {currentLanguageOption.code}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
          <div className="px-3 py-2 border-b border-border/60">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" /> Idioma / Language
            </p>
            <p className="text-[11px] text-muted-foreground">Selecione o idioma de navegação</p>
          </div>

          <div className="py-1 space-y-1">
            {availableLanguages.map((opt) => {
              const isSelected = opt.code === language;
              return (
                <button
                  key={opt.code}
                  onClick={() => {
                    setLanguage(opt.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 text-foreground font-semibold'
                      : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{opt.flag}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">{opt.nativeName}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.name}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
