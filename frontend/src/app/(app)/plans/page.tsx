'use client';

import React, { useState, useEffect } from 'react';
import {
  Crown,
  Check,
  ArrowRight,
  CreditCard,
  QrCode,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  subscriptionsApi,
  SubscriptionPlan,
  UserSubscriptionInfo,
} from '@/lib/api/subscriptions';
import { useTranslation } from '@/i18n';

function formatPlanPrice(value: number, lang: string): string {
  const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getPlanInfo(
  plan: SubscriptionPlan,
  t: (path: string, params?: Record<string, string | number>) => string,
  tArray: (path: string) => string[]
) {
  switch (plan.code) {
    case 'FREE':
      return {
        name: t('plans.freeName'),
        description: t('plans.freeDesc'),
        features: tArray('plans.freeFeatures'),
      };
    case 'PRO':
      return {
        name: t('plans.proName'),
        description: t('plans.proDesc'),
        features: tArray('plans.proFeatures'),
      };
    case 'MASTER':
      return {
        name: t('plans.masterName'),
        description: t('plans.masterDesc'),
        features: tArray('plans.masterFeatures'),
      };
    case 'LEGEND':
      return {
        name: t('plans.legendName'),
        description: t('plans.legendDesc'),
        features: tArray('plans.legendFeatures'),
      };
    default:
      return {
        name: plan.name,
        description: plan.description,
        features: plan.features,
      };
  }
}

export default function PlansPage() {
  const { t, tArray, language } = useTranslation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscriptionInfo | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Assinatura
  const [selectedPlanToSubscribe, setSelectedPlanToSubscribe] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [plansRes, mySubRes] = await Promise.all([
        subscriptionsApi.listPlans(),
        subscriptionsApi.getMySubscription().catch(() => null),
      ]);
      setPlans(plansRes.data || []);
      if (mySubRes) setCurrentSub(mySubRes.data);
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenSubscribeModal = (plan: SubscriptionPlan) => {
    setSelectedPlanToSubscribe(plan);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlanToSubscribe) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await subscriptionsApi.subscribe({
        planCode: selectedPlanToSubscribe.code,
        billingCycle,
        paymentMethod: selectedPlanToSubscribe.code === 'FREE' ? 'FREE' : paymentMethod,
      });

      setSuccessMessage(res.data.message || t('plans.successMessage'));
      await loadData();
      setTimeout(() => {
        setSelectedPlanToSubscribe(null);
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar assinatura.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPlanInfo = selectedPlanToSubscribe
    ? getPlanInfo(selectedPlanToSubscribe, t, tArray)
    : null;

  const modalPrice = selectedPlanToSubscribe
    ? billingCycle === 'MONTHLY'
      ? parseFloat(selectedPlanToSubscribe.monthlyPrice)
      : parseFloat(selectedPlanToSubscribe.yearlyPrice)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Crown className="w-3.5 h-3.5" />
          {t('plans.badge')}
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight">
          {t('plans.title')}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          {t('plans.subtitle')}
        </p>

        {/* Monthly vs Yearly Switcher */}
        <div className="inline-flex items-center p-1.5 rounded-xl bg-secondary/60 border border-border mt-4">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('plans.monthlyBilling')}
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'YEARLY'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{t('plans.yearlyBilling')}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              {t('plans.savePercent')}
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">{t('plans.loadingPlans')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentSub?.plan.code === plan.code;
            const price =
              billingCycle === 'MONTHLY'
                ? parseFloat(plan.monthlyPrice)
                : parseFloat(plan.yearlyPrice) / 12;

            const isVip = plan.code === 'LEGEND';
            const planInfo = getPlanInfo(plan, t, tArray);

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                  isCurrent
                    ? 'bg-card border-2 border-primary shadow-glow'
                    : isVip
                    ? 'bg-gradient-to-b from-card via-card to-amber-500/10 border-2 border-amber-500/50 shadow-xl'
                    : plan.isPopular
                    ? 'bg-card border-2 border-primary/50 shadow-lg'
                    : 'bg-card border border-border hover:border-border/80'
                }`}
              >
                {/* Popular or Current Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-primary text-primary-foreground shadow-md">
                    {t('plans.currentBadge')}
                  </div>
                )}
                {!isCurrent && plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md">
                    {t('plans.popularBadge')}
                  </div>
                )}
                {!isCurrent && isVip && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-black shadow-md flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {t('plans.vipBadge')}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Title & Badge */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-foreground text-lg">{planInfo.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {planInfo.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-semibold text-muted-foreground">R$</span>
                      <span className="text-3xl md:text-4xl font-black text-foreground">
                        {price === 0 ? '0' : formatPlanPrice(price, language)}
                      </span>
                      <span className="text-xs text-muted-foreground">{t('plans.perMonth')}</span>
                    </div>
                    {billingCycle === 'YEARLY' && parseFloat(plan.yearlyPrice) > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {t('plans.billedYearly', {
                          price: formatPlanPrice(parseFloat(plan.yearlyPrice), language),
                        })}
                      </p>
                    )}
                  </div>

                  {/* Quota Highlights */}
                  <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('plans.diecastQuota')}</span>
                      <strong className="text-foreground font-bold">
                        {plan.maxMiniatures === -1
                          ? t('plans.unlimited')
                          : t('plans.upTo', { count: plan.maxMiniatures })}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('plans.collectiblesQuota')}</span>
                      <strong className="text-foreground font-bold">
                        {plan.maxOtherCollectibles === -1
                          ? t('plans.unlimited')
                          : t('plans.upTo', { count: plan.maxOtherCollectibles })}
                      </strong>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('plans.includedFeatures')}
                    </p>
                    <ul className="space-y-2 text-xs">
                      {planInfo.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-foreground/90 leading-tight">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-secondary text-muted-foreground border border-border cursor-default"
                    >
                      {t('plans.activePlanBtn')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenSubscribeModal(plan)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                        isVip
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:brightness-110 font-black'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {plan.code === 'FREE' ? t('plans.backToStarterBtn') : t('plans.subscribeBtn')}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Adesão / Checkout Simulado */}
      {selectedPlanToSubscribe && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 md:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedPlanToSubscribe(null)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 mb-2">
                {t('plans.modalBadge')}
              </div>
              <h2 className="text-xl font-black text-foreground">
                {t('plans.modalTitle', { name: selectedPlanInfo?.name || selectedPlanToSubscribe.name })}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {billingCycle === 'MONTHLY' ? t('plans.monthlyBilling') : t('plans.yearlyBilling')}
              </p>
            </div>

            {/* Error or Success Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('plans.planValue')}</span>
                <strong className="text-foreground">
                  {selectedPlanInfo?.name || selectedPlanToSubscribe.name}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('plans.totalToPay')}</span>
                <strong className="text-foreground text-sm font-black">
                  R$ {formatPlanPrice(modalPrice, language)}
                </strong>
              </div>
            </div>

            {/* Payment Method Selector if not free */}
            {selectedPlanToSubscribe.code !== 'FREE' && (
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-foreground">{t('plans.paymentMethod')}</label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'PIX'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>{t('plans.pixInstant')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'CREDIT_CARD'
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>{t('plans.creditCard')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Security notice */}
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 leading-tight">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t('plans.securityNotice')}</span>
            </p>

            {/* Confirm Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmSubscription}
                disabled={isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isProcessing
                  ? t('plans.processingBtn')
                  : selectedPlanToSubscribe.code === 'FREE'
                  ? t('plans.confirmBtn')
                  : `${t('plans.confirmBtn')} (${paymentMethod})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
