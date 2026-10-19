'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, AdminAnalyticsStats } from '@/lib/api/analytics';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Smartphone,
  Monitor,
  Globe,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronLeft,
  Calendar,
  Layers,
  UserCheck,
  Activity,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const {
    data: statsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-analytics-stats'],
    queryFn: async () => {
      const res = await analyticsApi.getAdminStats();
      return res.data;
    },
    refetchInterval: 30000, // Atualiza automaticamente a cada 30 segundos
  });

  const stats: AdminAnalyticsStats = statsData || {
    todayVisits: 0,
    yesterdayVisits: 0,
    sevenDaysVisits: 0,
    thirtyDaysVisits: 0,
    uniqueVisitorsToday: 0,
    uniqueVisitors7Days: 0,
    uniqueVisitors30Days: 0,
    registeredActiveToday: 0,
    registeredActive7Days: 0,
    topPages: [],
    dailyTrend: [],
    deviceBreakdown: [],
    recentVisits: [],
  };

  // Comparativo de hoje vs ontem
  const diffYesterday = stats.todayVisits - stats.yesterdayVisits;
  const percentVsYesterday =
    stats.yesterdayVisits > 0
      ? Math.round((diffYesterday / stats.yesterdayVisits) * 100)
      : stats.todayVisits > 0
      ? 100
      : 0;

  // Encontrar valor máximo para dimensionar as barras do gráfico diário
  const maxVisitsDaily = Math.max(...stats.dailyTrend.map((d) => d.visits), 10);

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours}h`;
      return `Há ${diffDays}d`;
    } catch {
      return '';
    }
  };

  const formatPathDisplay = (path: string) => {
    if (path === '/') return '🏠 Página Inicial (Home)';
    if (path === '/catalog') return '🚗 Catálogo de Miniaturas';
    if (path.startsWith('/catalog/')) return `🔍 Detalhes: ${path.replace('/catalog/', '')}`;
    if (path === '/marketplace') return '🛒 Marketplace / Vitrine';
    if (path === '/collection') return '📦 Minha Coleção';
    if (path === '/community') return '👥 Comunidade & Fotos';
    if (path === '/plans') return '👑 Planos de Assinatura';
    if (path.startsWith('/admin')) return `🛡️ Admin: ${path.replace('/admin/', '')}`;
    return path;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header com Navegação e Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Voltar para Usuários
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Monitoramento Ativo
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-primary" /> Métricas & Acessos do Site
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Acompanhe o tráfego em tempo real, visitantes únicos, atividade dos membros colecionadores e páginas mais visualizadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-all shadow-sm disabled:opacity-50"
            title="Atualizar métricas agora"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-primary' : ''}`} />
            {isRefetching ? 'Atualizando...' : 'Atualizar Dados'}
          </button>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
          >
            <Users className="h-3.5 w-3.5" /> Gestão de Usuários
          </Link>
        </div>
      </div>

      {/* 4 Cards de Destaque / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Visualizações Hoje */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
              Acessos Hoje
            </p>
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Eye className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {stats.todayVisits.toLocaleString('pt-BR')}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {diffYesterday >= 0 ? (
              <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> +{percentVsYesterday}%
              </span>
            ) : (
              <span className="text-rose-500 font-bold flex items-center gap-0.5">
                {percentVsYesterday}%
              </span>
            )}
            <span className="text-muted-foreground text-[11px]">vs. ontem ({stats.yesterdayVisits})</span>
          </div>
        </div>

        {/* Card 2: Visitantes Únicos Hoje */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase text-sky-500 tracking-wider">
              Visitantes Únicos Hoje
            </p>
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
              <Globe className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {stats.uniqueVisitorsToday.toLocaleString('pt-BR')}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-2">
            <span className="font-semibold text-foreground">{stats.uniqueVisitors7Days}</span> únicos nos últimos 7 dias
          </p>
        </div>

        {/* Card 3: Membros Logados Ativos */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase text-amber-500 tracking-wider">
              Membros Ativos Hoje
            </p>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <UserCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {stats.registeredActiveToday.toLocaleString('pt-BR')}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-2">
            <span className="font-semibold text-foreground">{stats.registeredActive7Days}</span> membros ativos nesta semana
          </p>
        </div>

        {/* Card 4: Total Últimos 30 Dias */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase text-purple-500 tracking-wider">
              Total Mês (30 Dias)
            </p>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
              <Activity className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-foreground mt-2">
            {stats.thirtyDaysVisits.toLocaleString('pt-BR')}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-2">
            Média de <span className="font-semibold text-foreground">{Math.round(stats.thirtyDaysVisits / 30)}</span> acessos/dia
          </p>
        </div>
      </div>

      {/* Gráfico de Tendência dos Últimos 14 Dias */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5 text-primary" /> Tendência de Acessos Diários
            </h2>
            <p className="text-xs text-muted-foreground">
              Volume de visualizações totais e visitantes únicos nos últimos 14 dias
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-primary inline-block" />
              <span className="text-muted-foreground font-medium">Visualizações</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-sky-500/60 inline-block" />
              <span className="text-muted-foreground font-medium">Visitantes Únicos</span>
            </div>
          </div>
        </div>

        {stats.dailyTrend.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Nenhum dado de acesso registrado recentemente. Os acessos ao navegar no site aparecerão aqui.
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2 sm:gap-4 h-48 sm:h-56 pt-6 px-2">
            {stats.dailyTrend.map((day) => {
              const heightPercent = Math.max(Math.round((day.visits / maxVisitsDaily) * 100), 6);
              const uniqueHeightPercent = Math.max(Math.round((day.uniqueVisitors / maxVisitsDaily) * 100), 4);
              const dateParts = day.date.split('-');
              const dayMonth = `${dateParts[2]}/${dateParts[1]}`;

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip ao passar o mouse */}
                  <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-popover text-popover-foreground text-[10px] py-1 px-2.5 rounded-lg border border-border shadow-lg pointer-events-none whitespace-nowrap">
                    <span className="font-bold">{dayMonth}</span>
                    <span>{day.visits} visitas ({day.uniqueVisitors} únicos)</span>
                  </div>

                  <div className="w-full max-w-[28px] sm:max-w-[40px] flex items-end justify-center gap-1 h-full">
                    {/* Barra de Visitas */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-primary hover:bg-primary/90 transition-all rounded-t-sm"
                    />
                    {/* Barra de Únicos */}
                    <div
                      style={{ height: `${uniqueHeightPercent}%` }}
                      className="w-full bg-sky-500/50 hover:bg-sky-500/70 transition-all rounded-t-sm"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium mt-2">
                    {dayMonth}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid com Top Páginas, Dispositivos e Feed de Últimos Acessos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Top Páginas mais acessadas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Páginas Mais Acessadas (30 dias)
                </h2>
                <p className="text-xs text-muted-foreground">Rotas com maior interesse dos visitantes</p>
              </div>
            </div>

            {stats.topPages.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Ainda não há histórico suficiente para exibir o ranking.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="pb-2.5 font-semibold">Página / Rota</th>
                      <th className="pb-2.5 font-semibold text-right">Acessos</th>
                      <th className="pb-2.5 font-semibold text-right">Visitantes Únicos</th>
                      <th className="pb-2.5 font-semibold w-24 sm:w-32 text-right">Proporção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stats.topPages.map((page, idx) => {
                      const maxPageVisits = stats.topPages[0]?.visits || 1;
                      const ratio = Math.round((page.visits / maxPageVisits) * 100);

                      return (
                        <tr key={idx} className="hover:bg-secondary/40 transition-colors">
                          <td className="py-2.5 pr-2 font-medium text-foreground">
                            <span className="block truncate max-w-xs sm:max-w-md" title={page.path}>
                              {formatPathDisplay(page.path)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">{page.path}</span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-foreground">
                            {page.visits.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2.5 text-right text-muted-foreground">
                            {page.uniqueVisitors.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-2.5 text-right pl-3">
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${ratio}%` }}
                                className="bg-primary h-full rounded-full"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Divisão por Dispositivo */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-primary" /> Dispositivos Utilizados
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {['DESKTOP', 'MOBILE', 'TABLET'].map((type) => {
                const found = stats.deviceBreakdown.find((d) => d.device === type);
                const count = found?.count || 0;
                const percentage = found?.percentage || 0;

                const Icon =
                  type === 'MOBILE' ? Smartphone : type === 'TABLET' ? Smartphone : Monitor;
                const label =
                  type === 'MOBILE' ? 'Celular / Mobile' : type === 'TABLET' ? 'Tablet' : 'Computador / PC';

                return (
                  <div key={type} className="p-3.5 rounded-xl bg-secondary/50 border border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
                      <Icon className="h-4 w-4 text-primary/80" />
                    </div>
                    <div className="text-xl font-black text-foreground">{percentage}%</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{count} acessos</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna 3: Feed de Acessos Recentes */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-500" /> Acessos em Tempo Real
                </h2>
                <p className="text-xs text-muted-foreground">Últimos registros de navegação</p>
              </div>
            </div>

            {stats.recentVisits.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Nenhum acesso registrado no momento.
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {stats.recentVisits.map((visit) => {
                  return (
                    <div
                      key={visit.id}
                      className="p-2.5 rounded-xl bg-secondary/40 border border-border/50 hover:bg-secondary/70 transition-all flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          {visit.user ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary truncate">
                              <UserCheck className="h-3 w-3 shrink-0" />
                              {visit.user.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                              <Globe className="h-3 w-3 shrink-0 text-sky-400" />
                              Visitante Anônimo
                            </span>
                          )}
                          <span className="text-[9px] px-1 py-0.2 rounded bg-secondary text-muted-foreground border border-border/60">
                            {visit.deviceType}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-medium text-foreground truncate" title={visit.path}>
                          {visit.path}
                        </p>
                      </div>

                      <div className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                        {formatRelativeTime(visit.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
