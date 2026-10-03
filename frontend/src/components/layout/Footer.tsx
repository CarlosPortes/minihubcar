'use client';

import React from 'react';
import Link from 'next/link';
import { Car, ShieldCheck, FileText, Sparkles, Heart, Compass, MapPin, BarChart3 } from 'lucide-react';
import { useTranslation } from '@/i18n';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-12 border-t border-border bg-card/60 backdrop-blur-sm text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 group-hover:scale-105 transition-transform">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-wider text-foreground">
                  MINI<span className="text-primary">HUB</span> CAR
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-1 font-semibold">
                  Collector Platform
                </span>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              {t('footer.platformDesc')}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('footer.versionOnline')}
              </span>
            </div>
          </div>

          {/* Navigation - Institucional */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-primary" /> {t('footer.institutional')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  {t('footer.aboutRoadmap')}
                </Link>
              </li>
              <li>
                <Link
                  href="/about#roadmap"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('home.roadmapButton')}
                </Link>
              </li>
              <li>
                <Link
                  href="/catalog"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('footer.officialCatalog')}
                </Link>
              </li>
              <li>
                <Link
                  href="/marketplace"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('footer.garageMarketplace')}
                </Link>
              </li>
              <li>
                <Link
                  href="/donate"
                  className="text-rose-400 hover:text-rose-300 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Heart className="h-3 w-3 fill-rose-500/30" />
                  {t('footer.supportPix')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {t('footer.features')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/stats"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <BarChart3 className="h-3 w-3 text-primary" />
                  {t('footer.statsRankings')}
                </Link>
              </li>
              <li>
                <Link
                  href="/collection"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('nav.collection')}
                </Link>
              </li>
              <li>
                <Link
                  href="/locations"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('footer.exhibitors2D3D')}
                </Link>
              </li>
              <li>
                <Link
                  href="/acquisitions"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('footer.assetManagement')}
                </Link>
              </li>
              <li>
                <Link
                  href="/wishlist"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('footer.wishlistTitle')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Jurídico */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> {t('footer.legal')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <FileText className="h-3 w-3" />
                  {t('footer.termsOfUse')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('auth.forgotTitle')}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contato@minihubcar.com.br"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Suporte: contato@minihubcar.com.br
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground">
          <p>© {currentYear} MiniHub Car. {t('footer.allRightsReserved')} {t('footer.copyright')}</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">{t('footer.termsOfUse')}</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacyPolicy')}</Link>
            <span>•</span>
            <Link href="/about" className="hover:text-foreground transition-colors">{t('footer.institutional')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
