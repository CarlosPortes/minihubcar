'use client';

import React from 'react';
import Link from 'next/link';
import { Car, Search, Layers, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{t('home.badge')}</span>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground max-w-3xl">
        {t('home.titleStart')} <span className="text-primary">{t('home.titleHighlight')}</span>
      </h1>

      <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">
        {t('home.subtitle')}
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Link
          href="/catalog"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow transition-all"
        >
          <Search className="h-4 w-4" />
          {t('home.exploreCatalog')}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
        <Link
          href="/collection"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-foreground font-semibold hover:bg-muted border border-border transition-colors"
        >
          <Layers className="h-4 w-4" />
          {t('home.myCollection')}
        </Link>
      </div>

      {/* Feature Highlights Cards */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
        <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors shadow-card">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Car className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-foreground">{t('home.feature1Title')}</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {t('home.feature1Desc')}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:border-accent/40 transition-colors shadow-card">
          <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-foreground">{t('home.feature2Title')}</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {t('home.feature2Desc')}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-colors shadow-card">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-foreground">{t('home.feature3Title')}</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {t('home.feature3Desc')}
          </p>
        </div>
      </div>

      {/* Roadmap Teaser */}
      <div className="mt-12 w-full max-w-4xl p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-primary/20 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> {t('home.roadmapBadge')}
          </div>
          <h4 className="text-base font-bold text-foreground">{t('home.roadmapHeading')}</h4>
          <p className="text-xs text-muted-foreground">
            {t('home.roadmapDesc')}
          </p>
        </div>
        <Link
          href="/about#roadmap"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-glow shrink-0 transition-all"
        >
          {t('home.roadmapButton')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
