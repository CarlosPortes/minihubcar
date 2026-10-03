'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  subscriptionsApi,
  AdminSubscriptionStats,
  AdminSubscriptionItem,
  AdminListSubscriptionsParams,
  AdminUpdateSubscriptionInput,
} from '@/lib/api/subscriptions';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  Crown,
  CreditCard,
  TrendingUp,
  Clock,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Zap,
  Box,
  MessageCircle,
  Calendar,
  Layers,
  X,
  Check,
  CalendarPlus,
  Coins,
} from 'lucide-react';

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'PRO' | 'MASTER' | 'LEGEND'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED'>('ALL');
  const [cycleFilter, setCycleFilter] = useState<'ALL' | 'MONTHLY' | 'YEARLY'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Management Modal State
  const [editingItem, setEditingItem] = useState<AdminSubscriptionItem | null>(null);
  const [modalPlanCode, setModalPlanCode] = useState<'FREE' | 'PRO' | 'MASTER' | 'LEGEND'>('FREE');
  const [modalStatus, setModalStatus] = useState<'ACTIVE' | 'EXPIRED' | 'CANCELED'>('ACTIVE');
  const [modalCycle, setModalCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [modalPaymentMethod, setModalPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'FREE' | 'MANUAL'>('MANUAL');
  const [modalCustomExpiresAt, setModalCustomExpiresAt] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalExtendDays, setModalExtendDays] = useState<number | null>(null);

  // Success Feedback Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-subscriptions-stats'],
    queryFn: async () => {
      const res = await subscriptionsApi.adminGetStats();
      return res.data;
    },
  });

  // Fetch Subscriptions List
  const queryParams: AdminListSubscriptionsParams = {
    page,
    limit,
    search: debouncedSearch || undefined,
    planCode: planFilter,
    status: statusFilter,
    billingCycle: cycleFilter,
  };

  const {
    data: listData,
    isLoading: isLoadingList,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-subscriptions-list', queryParams],
    queryFn: async () => {
      const res = await subscriptionsApi.adminListSubscriptions(queryParams);
      return res;
    },
  });

  // Mutation: Update Subscription
  const updateMutation = useMutation({
    mutationFn: async ({
      userId,
      input,
    }: {
      userId: string;
      input: AdminUpdateSubscriptionInput;
    }) => {
      return subscriptionsApi.adminUpdateSubscription(userId, input);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-stats'] });
      setEditingItem(null);
      setToastMessage('Assinatura atualizada com sucesso!');
      setTimeout(() => setToastMessage(null), 4000);
    },
  });

  const subscriptions = listData?.data || [];
  const pagination = listData?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };
  const stats: AdminSubscriptionStats = statsData || {
    mrr: 0,
    arr: 0,
    totalUsers: 0,
    activePaidSubscribers: 0,
    expiredSubscribers: 0,
    expiringSoonCount: 0,
    countsByPlan: {},
    plans: [],
  };

  const openEditModal = (item: AdminSubscriptionItem) => {
    setEditingItem(item);
    setModalPlanCode(item.plan.code);
    setModalStatus(item.status);
    setModalCycle(item.billingCycle);
    setModalPaymentMethod(
      (item.paymentMethod as 'PIX' | 'CREDIT_CARD' | 'FREE' | 'MANUAL') || 'MANUAL'
    );
    setModalNotes('');
    setModalExtendDays(null);

    if (item.expiresAt) {
      const d = new Date(item.expiresAt);
      setModalCustomExpiresAt(d.toISOString().slice(0, 10));
    } else {
      setModalCustomExpiresAt('');
    }
  };

  const handleSaveModal = () => {
    if (!editingItem) return;

    const input: AdminUpdateSubscriptionInput = {
      planCode: modalPlanCode,
      status: modalStatus,
      billingCycle: modalCycle,
      paymentMethod: modalPaymentMethod,
      notes: modalNotes || undefined,
    };

    if (modalExtendDays !== null) {
      input.extendDays = modalExtendDays;
    } else if (modalCustomExpiresAt) {
      input.expiresAt = new Date(`${modalCustomExpiresAt}T23:59:59.999Z`).toISOString();
    } else {
      // Explicitly null if cleared
      input.expiresAt = null;
    }

    updateMutation.mutate({
      userId: editingItem.userId,
      input,
    });
  };

  const handleQuickExtend = (days: number) => {
    setModalExtendDays(days);
    const baseDate = editingItem?.expiresAt ? new Date(editingItem.expiresAt) : new Date();
    const futureDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    setModalCustomExpiresAt(futureDate.toISOString().slice(0, 10));
  };

  const handleSetLifetime = () => {
    setModalExtendDays(null);
    setModalCustomExpiresAt('');
  };

  const getPlanBadge = (code: string) => {
    switch (code) {
      case 'LEGEND':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
            <Crown className="h-3.5 w-3.5" /> Legend VIP
          </span>
        );
      case 'MASTER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Sparkles className="h-3.5 w-3.5" /> Curador Master
          </span>
        );
      case 'PRO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Zap className="h-3.5 w-3.5" /> Garagem Pro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <Box className="h-3.5 w-3.5" /> Starter (Free)
          </span>
        );
    }
  };

  const formatExpiration = (expiresAt?: string | null) => {
    if (!expiresAt) {
      return (
        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 opacity-60" /> Sem expiração
        </span>
      );
    }

    const now = new Date();
    const exp = new Date(expiresAt);
    const diffMs = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Expirado ({Math.abs(diffDays)}d)
          </span>
          <span className="text-[11px] text-muted-foreground">
            {exp.toLocaleDateString('pt-BR')}
          </span>
        </div>
      );
    }

    if (diffDays <= 7) {
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Vence em {diffDays} {diffDays === 1 ? 'dia' : 'dias'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {exp.toLocaleDateString('pt-BR')}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span className="text-xs text-foreground font-medium flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {exp.toLocaleDateString('pt-BR')}
        </span>
        <span className="text-[11px] text-muted-foreground">
          ({diffDays} dias restantes)
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-950/90 text-emerald-200 border border-emerald-600/40 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin/users" className="hover:text-foreground transition-colors">
              Administração
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Gestão de Assinaturas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Crown className="h-7 w-7 text-amber-500" />
            Gestão de Cobranças & Assinaturas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitore a receita recorrente (MRR/ARR), controle assinantes, altere planos e gerencie concessões manuais de VIP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-secondary/80 hover:bg-secondary text-sm font-medium text-foreground border border-border/50 transition-all disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="p-5 rounded-2xl bg-card/60 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-transparent backdrop-blur-sm relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              MRR (Recorrente Mensal)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              R$ {stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span>ARR projetado:</span>
              <strong className="text-emerald-400 font-medium">
                R$ {stats.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ano
              </strong>
            </p>
          </div>
        </div>

        {/* Active Paid Subscribers */}
        <div className="p-5 rounded-2xl bg-card/60 border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-transparent backdrop-blur-sm relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Assinantes Pagantes Ativos
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Crown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {stats.activePaidSubscribers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Colecionadores com Pro, Master ou VIP ativo
            </p>
          </div>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => {
            setStatusFilter('ACTIVE');
          }}
          className="p-5 rounded-2xl bg-card/60 border border-rose-500/20 bg-gradient-to-br from-rose-950/20 to-transparent backdrop-blur-sm relative overflow-hidden shadow-sm cursor-pointer hover:border-rose-500/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Expirando em Breve (&le; 7 dias)
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {stats.expiringSoonCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.expiredSubscribers > 0
                ? `${stats.expiredSubscribers} já expirados na base`
                : 'Nenhum plano vencido no momento'}
            </p>
          </div>
        </div>

        {/* Total Registered Users */}
        <div className="p-5 rounded-2xl bg-card/60 border border-sky-500/20 bg-gradient-to-br from-sky-950/20 to-transparent backdrop-blur-sm relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Total de Colecionadores
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {stats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Usuários cadastrados no MiniHub Car
            </p>
          </div>
        </div>
      </div>

      {/* Plan Distribution Badges Bar */}
      <div className="p-4 rounded-xl bg-secondary/40 border border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
          <Layers className="h-4 w-4" /> Distribuição por Plano:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPlanFilter(planFilter === 'FREE' ? 'ALL' : 'FREE')}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              planFilter === 'FREE'
                ? 'bg-slate-500/20 text-slate-300 border-slate-500'
                : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Starter: <strong>{stats.countsByPlan['FREE'] || 0}</strong>
          </button>

          <button
            onClick={() => setPlanFilter(planFilter === 'PRO' ? 'ALL' : 'PRO')}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              planFilter === 'PRO'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Garagem Pro: <strong>{stats.countsByPlan['PRO'] || 0}</strong>
          </button>

          <button
            onClick={() => setPlanFilter(planFilter === 'MASTER' ? 'ALL' : 'MASTER')}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              planFilter === 'MASTER'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500'
                : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Curador Master: <strong>{stats.countsByPlan['MASTER'] || 0}</strong>
          </button>

          <button
            onClick={() => setPlanFilter(planFilter === 'LEGEND' ? 'ALL' : 'LEGEND')}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
              planFilter === 'LEGEND'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Legend VIP: <strong>{stats.countsByPlan['LEGEND'] || 0}</strong>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border/40 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail do colecionador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary/60 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-secondary/60 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">Todos os Planos</option>
            <option value="FREE">Starter (Free)</option>
            <option value="PRO">Garagem Pro</option>
            <option value="MASTER">Curador Master</option>
            <option value="LEGEND">Legend VIP</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-secondary/60 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="EXPIRED">Expirado</option>
            <option value="CANCELED">Cancelado</option>
          </select>

          {/* Cycle Filter */}
          <select
            value={cycleFilter}
            onChange={(e) => {
              setCycleFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-secondary/60 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ALL">Todos os Ciclos</option>
            <option value="MONTHLY">Mensal</option>
            <option value="YEARLY">Anual</option>
          </select>

          {/* Reset Filters */}
          {(searchTerm || planFilter !== 'ALL' || statusFilter !== 'ALL' || cycleFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearch('');
                setPlanFilter('ALL');
                setStatusFilter('ALL');
                setCycleFilter('ALL');
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 border-b border-border/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3.5 px-4">Colecionador</th>
                <th className="py-3.5 px-4">Plano Atual</th>
                <th className="py-3.5 px-4">Faturamento / Ciclo</th>
                <th className="py-3.5 px-4">Validade / Vencimento</th>
                <th className="py-3.5 px-4">Uso de Cota</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoadingList ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <span>Carregando assinantes...</span>
                    </div>
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nenhum colecionador encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                subscriptions.map((item) => {
                  const maxMin = item.plan.maxMiniatures;
                  const currentMin = item.usage.miniaturesCount;
                  const minPct = maxMin > 0 ? Math.min(100, Math.round((currentMin / maxMin) * 100)) : 0;

                  return (
                    <tr key={item.userId} className="hover:bg-secondary/30 transition-colors">
                      {/* Colecionador */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-amber-500/20 border border-primary/20 flex items-center justify-center font-bold text-xs text-foreground shrink-0 overflow-hidden">
                            {item.user.avatarUrl ? (
                              <img
                                src={item.user.avatarUrl}
                                alt={item.user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              item.user.name?.slice(0, 2).toUpperCase() || 'US'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate text-sm">
                              {item.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{item.user.email}</p>
                            {item.user.whatsapp && (
                              <a
                                href={`https://wa.me/${item.user.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 mt-0.5"
                              >
                                <MessageCircle className="h-3 w-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plano Atual */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getPlanBadge(item.plan.code)}
                      </td>

                      {/* Faturamento / Ciclo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs">
                            {item.plan.code === 'FREE'
                              ? 'Grátis'
                              : item.billingCycle === 'YEARLY'
                              ? `R$ ${parseFloat(item.plan.yearlyPrice).toFixed(2)}/ano`
                              : `R$ ${parseFloat(item.plan.monthlyPrice).toFixed(2)}/mês`}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <CreditCard className="h-3 w-3" />
                            {item.paymentMethod === 'PIX'
                              ? 'PIX'
                              : item.paymentMethod === 'CREDIT_CARD'
                              ? 'Cartão de Crédito'
                              : item.paymentMethod === 'MANUAL'
                              ? 'Cortesia / Manual'
                              : 'Grátis'}
                          </span>
                        </div>
                      </td>

                      {/* Validade */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {formatExpiration(item.expiresAt)}
                      </td>

                      {/* Uso de Cota */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1 min-w-[130px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Miniaturas:</span>
                            <span className="font-medium text-foreground">
                              {currentMin} / {maxMin === -1 ? '∞' : maxMin}
                            </span>
                          </div>
                          {maxMin !== -1 && (
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  minPct >= 90
                                    ? 'bg-rose-500'
                                    : minPct >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-primary'
                                }`}
                                style={{ width: `${minPct}%` }}
                              />
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            Outros colecionáveis: {item.usage.collectiblesCount}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Ativo
                          </span>
                        ) : item.status === 'EXPIRED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" /> Expirado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            Cancelado
                          </span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-all hover:scale-105"
                        >
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Mostrando {subscriptions.length} de {pagination.total} colecionadores
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border/50 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-medium text-foreground">
              Página {page} de {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-border/50 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Subscription Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/40 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-sm text-foreground">
                  {editingItem.user.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">
                    Gerenciar Assinatura
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {editingItem.user.name} ({editingItem.user.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Select Plan */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  1. Selecione o Plano de Acesso
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Starter */}
                  <button
                    type="button"
                    onClick={() => setModalPlanCode('FREE')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      modalPlanCode === 'FREE'
                        ? 'bg-slate-500/15 border-slate-400 ring-2 ring-slate-400/40'
                        : 'bg-secondary/40 border-border/60 hover:bg-secondary/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">Starter</span>
                      <Box className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Grátis para sempre</p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-1">
                      Até 50 minis
                    </p>
                  </button>

                  {/* Pro */}
                  <button
                    type="button"
                    onClick={() => setModalPlanCode('PRO')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      modalPlanCode === 'PRO'
                        ? 'bg-blue-500/15 border-blue-400 ring-2 ring-blue-400/40'
                        : 'bg-secondary/40 border-border/60 hover:bg-secondary/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-blue-400">Garagem Pro</span>
                      <Zap className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">R$ 14,90/mês</p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-1">
                      Até 250 minis
                    </p>
                  </button>

                  {/* Master */}
                  <button
                    type="button"
                    onClick={() => setModalPlanCode('MASTER')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      modalPlanCode === 'MASTER'
                        ? 'bg-purple-500/15 border-purple-400 ring-2 ring-purple-400/40'
                        : 'bg-secondary/40 border-border/60 hover:bg-secondary/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-purple-400">Curador Master</span>
                      <Sparkles className="h-4 w-4 text-purple-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">R$ 29,90/mês</p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-1">
                      Até 1.000 minis
                    </p>
                  </button>

                  {/* Legend VIP */}
                  <button
                    type="button"
                    onClick={() => setModalPlanCode('LEGEND')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      modalPlanCode === 'LEGEND'
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40'
                        : 'bg-secondary/40 border-border/60 hover:bg-secondary/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-400">Legend VIP</span>
                      <Crown className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">R$ 49,90/mês</p>
                    <p className="text-[11px] text-amber-400/80 font-bold mt-1">
                      Ilimitado + Selo VIP
                    </p>
                  </button>
                </div>
              </div>

              {/* Status & Ciclo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Status da Assinatura
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="ACTIVE">Ativo (Habilitado)</option>
                    <option value="EXPIRED">Expirado (Vencido)</option>
                    <option value="CANCELED">Cancelado</option>
                  </select>
                </div>

                {/* Ciclo */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Ciclo de Cobrança
                  </label>
                  <select
                    value={modalCycle}
                    onChange={(e) => setModalCycle(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual (Desconto)</option>
                  </select>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Forma de Pagamento Registrada
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'PIX', label: 'PIX' },
                    { id: 'CREDIT_CARD', label: 'Cartão' },
                    { id: 'MANUAL', label: 'Cortesia/Manual' },
                    { id: 'FREE', label: 'Grátis' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setModalPaymentMethod(method.id as any)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        modalPaymentMethod === method.id
                          ? 'bg-primary/20 text-primary border-primary font-bold'
                          : 'bg-secondary/40 border-border/60 hover:bg-secondary text-muted-foreground'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Validade & Prorrogação */}
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <CalendarPlus className="h-4 w-4 text-primary" /> Validade & Extensão de Prazo
                </label>
                <p className="text-xs text-muted-foreground">
                  Adicione dias rapidamente ou defina uma data de expiração personalizada:
                </p>

                {/* Quick Add Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(30)}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground transition-all"
                  >
                    +30 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(90)}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground transition-all"
                  >
                    +90 dias (Trimestre)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(365)}
                    className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground transition-all"
                  >
                    +1 ano (365 dias)
                  </button>
                  <button
                    type="button"
                    onClick={handleSetLifetime}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-400 transition-all"
                  >
                    Vitalício (Sem expiração)
                  </button>
                </div>

                {/* Custom Date Input */}
                <div className="pt-2">
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Data de expiração específica:
                  </span>
                  <input
                    type="date"
                    value={modalCustomExpiresAt}
                    onChange={(e) => {
                      setModalCustomExpiresAt(e.target.value);
                      setModalExtendDays(null);
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {!modalCustomExpiresAt && (
                    <span className="text-[11px] text-amber-400/80 block mt-1">
                      Plano configurado como vitalício / sem data limite de expiração.
                    </span>
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Anotações Internas do Administrador (Opcional)
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Ex: Pagamento confirmado via PIX comprovante #1293 ou cortesia VIP concedida..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/40 bg-secondary/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={updateMutation.isPending}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
