'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import { useTranslation } from '@/i18n';
import {
  Layers,
  Sparkles,
  TrendingUp,
  DollarSign,
  Heart,
  Car,
  MapPin,
  ArrowRight,
  PlusCircle,
  Clock,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

interface DashboardData {
  metrics: {
    activeExemplars: number;
    distinctVariations: number;
    totalInvested: number;
    soldExemplars: number;
    totalSales: number;
    patrimonialResult: number;
    wishlistCount: number;
    pendingRequests: number;
  };
  distributions: {
    byBrand: Array<{ name: string; count: number }>;
    byScale: Array<{ name: string; count: number }>;
    byLocation: Array<{ name: string; count: number }>;
  };
  recent: {
    recentExemplars: Array<{
      id: string;
      name: string;
      brand: string;
      photoUrl: string | null;
      createdAt: string;
    }>;
  };
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useTranslation();

  const { data, isLoading, error } = useQuery<{ data: DashboardData }>({
    queryKey: ['dashboard', 'summary', user?.id],
    queryFn: () => apiClient<{ data: DashboardData }>('/dashboard'),
    enabled: isAuthenticated && !!user?.id,
    refetchOnMount: 'always',
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Car className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground">{t('dashboard.loginRequiredTitle')}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {t('dashboard.loginRequiredDesc')}
        </p>
        <Link
          href="/login"
          className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow transition-all"
        >
          {t('dashboard.doLogin')}
        </Link>
      </div>
    );
  }

  const metrics = data?.data?.metrics || {
    activeExemplars: 0,
    distinctVariations: 0,
    totalInvested: 0,
    soldExemplars: 0,
    totalSales: 0,
    patrimonialResult: 0,
    wishlistCount: 0,
    pendingRequests: 0,
  };

  const distributions = data?.data?.distributions || { byBrand: [], byScale: [], byLocation: [] };
  const recent = data?.data?.recent?.recentExemplars || [];

  const localeCode = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR';
  const currencySymbol = language === 'en' ? '$' : language === 'es' ? '€' : 'R$';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-card border border-border">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {t('dashboard.welcome', { name: user?.name || '' })}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t('dashboard.overview')}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            {t('dashboard.addFromCatalog')}
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Exemplars */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{t('dashboard.activeExemplars')}</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{metrics.activeExemplars}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t('dashboard.distinctVariations', { count: metrics.distinctVariations })}
          </p>
        </div>

        {/* Invested Value */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{t('dashboard.totalInvested')}</span>
            <DollarSign className="h-4 w-4 text-accent" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {currencySymbol} {metrics.totalInvested.toLocaleString(localeCode, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{t('dashboard.accumulatedCost')}</p>
        </div>

        {/* Sales Value */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{t('dashboard.totalSales')}</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {currencySymbol} {metrics.totalSales.toLocaleString(localeCode, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">
            {t('dashboard.soldUnits', { count: metrics.soldExemplars })}
          </p>
        </div>

        {/* Wishlist */}
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{t('dashboard.wishlistCount')}</span>
            <Heart className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-foreground">{metrics.wishlistCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{t('dashboard.pendingItems')}</p>
        </div>
      </div>

      {/* Distributions & Recents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brand Distribution */}
        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" /> {t('dashboard.distributionByBrand')}
          </h2>

          {distributions.byBrand.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-xs">
              {t('dashboard.noRecent')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {distributions.byBrand.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground truncate">{b.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min(100, (b.count / (metrics.activeExemplars || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-muted-foreground w-6 text-right">{b.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location Distribution */}
        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" /> {t('dashboard.distributionByLocation')}
          </h2>

          {distributions.byLocation.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-xs">
              {t('collection.notes')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {distributions.byLocation.map((loc) => (
                <div key={loc.name} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground truncate">{loc.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px] font-bold">
                    {loc.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> {t('dashboard.recentExemplars')}
            </h2>
            <Link href="/collection" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
              {t('dashboard.viewAll')} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-xs">
              Sua coleção está vazia. Adicione do catálogo!
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary border border-border overflow-hidden shrink-0">
                    <MiniatureImage
                      src={item.photoUrl}
                      alt={item.name}
                      containerClassName="h-full w-full bg-secondary flex items-center justify-center overflow-hidden"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.brand}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
