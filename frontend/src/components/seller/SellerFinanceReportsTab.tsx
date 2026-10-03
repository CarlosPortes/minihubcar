'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getSellerFinancialReport,
  exportFinancialReportToExcel,
  exportFinancialDataToCsv,
  SellerFinanceSaleItem,
  SellerFinanceReceivableItem,
  SellerFinancePayableItem,
} from '@/lib/api/seller-finance';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Layers,
  MessageCircle,
  Truck,
  Warehouse,
  Package,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export function SellerFinanceReportsTab() {
  const [subTab, setSubTab] = useState<'DRE' | 'SALES' | 'RECEIVABLES' | 'PAYABLES'>('DRE');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ORDERS' | 'PRE_ORDERS'>('ALL');
  const [receivablesStatusFilter, setReceivablesStatusFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE'>('ALL');

  const { data: report, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['seller-financial-report'],
    queryFn: () => getSellerFinancialReport(),
  });

  // Filtered Sales
  const filteredSales = useMemo(() => {
    if (!report?.sales) return [];
    return report.sales.filter((s) => {
      const matchesSearch =
        s.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.miniatureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.brandName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        typeFilter === 'ALL' ||
        (typeFilter === 'ORDERS' && s.type === 'PRONTA_ENTREGA') ||
        (typeFilter === 'PRE_ORDERS' && s.type === 'PRE_VENDA');

      return matchesSearch && matchesType;
    });
  }, [report?.sales, searchTerm, typeFilter]);

  // Filtered Receivables
  const filteredReceivables = useMemo(() => {
    if (!report?.receivables) return [];
    return report.receivables.filter((r) => {
      const matchesSearch =
        r.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.miniatureName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        receivablesStatusFilter === 'ALL' ||
        (receivablesStatusFilter === 'PENDING' && !r.isOverdue) ||
        (receivablesStatusFilter === 'OVERDUE' && r.isOverdue);

      return matchesSearch && matchesStatus;
    });
  }, [report?.receivables, searchTerm, receivablesStatusFilter]);

  // Filtered Payables
  const filteredPayables = useMemo(() => {
    if (!report?.payables) return [];
    return report.payables.filter((p) => {
      return (
        p.sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.miniatureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brandName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [report?.payables, searchTerm]);

  // WhatsApp reminder message generator
  const getWhatsAppLink = (rec: SellerFinanceReceivableItem) => {
    if (!rec.buyerWhatsapp) return null;
    const cleanPhone = rec.buyerWhatsapp.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const valor = rec.amount.toFixed(2).replace('.', ',');
    const msg = encodeURIComponent(
      `Olá ${rec.buyerName}! Tudo bem? Passando para te lembrar sobre a sua parcela (${rec.description}) da pré-venda ${rec.miniatureName} no valor de R$ ${valor} no MiniHub Car. Se já tiver efetuado o pagamento, por favor nos avise!`
    );
    return `https://wa.me/${phoneWithCountry}?text=${msg}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 rounded-2xl border border-border bg-card">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Carregando dados financeiros, vendas e recebíveis...
        </p>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/10 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
        <h3 className="text-base font-bold text-destructive">Não foi possível carregar o relatório financeiro</h3>
        <p className="text-xs text-muted-foreground">Ocorreu uma falha ao consolidar os lançamentos.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-secondary text-foreground text-xs font-bold rounded-lg hover:bg-secondary/80"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const { metrics, forecast, byBrand } = report;

  return (
    <div className="space-y-6">
      {/* Top Header & Export Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Gestão Financeira & Relatórios
            </span>
            <span className="text-xs text-muted-foreground">{report.storeName}</span>
          </div>
          <h2 className="text-2xl font-black text-foreground">Relatório Financeiro & Previsões</h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe o faturamento, fluxo de recebíveis, custos de estoque, inadimplência e projeções futuras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-all hover:bg-secondary disabled:opacity-50"
            title="Atualizar dados"
          >
            <RotateCcw className={`h-4 w-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Export CSV Dropdown / Buttons */}
          <button
            onClick={() => exportFinancialDataToCsv('sales', report.sales)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 text-xs font-bold border border-border transition-all"
            title="Exportar dados de vendas em CSV"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            Vendas (.csv)
          </button>

          <button
            onClick={() => exportFinancialDataToCsv('receivables', report.receivables)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 text-xs font-bold border border-border transition-all"
            title="Exportar contas a receber em CSV"
          >
            <Clock className="h-4 w-4 text-amber-500" />
            Recebíveis (.csv)
          </button>

          {/* Export Full Excel (.xlsx) */}
          <button
            onClick={() => exportFinancialReportToExcel(report)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-black shadow-glow transition-all"
            title="Exportar pasta de trabalho completa em Excel com abas de Resumo, Vendas, Recebíveis, Custos e Marcas"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Faturamento Contratado */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-primary" /> Faturamento Total
          </span>
          <p className="text-xl font-black text-foreground">
            R$ {metrics.grossSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-muted-foreground">{metrics.totalSalesCount} transações</span>
        </div>

        {/* Card 2: Recebido / Caixa Realizado */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Caixa Realizado
          </span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            R$ {metrics.totalRealizedInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">
            {metrics.grossSales > 0 ? `${((metrics.totalRealizedInflow / metrics.grossSales) * 100).toFixed(0)}% do total` : '0%'}
          </span>
        </div>

        {/* Card 3: Saldo a Receber */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
          <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> A Receber Total
          </span>
          <p className="text-xl font-black text-amber-500">
            R$ {metrics.totalReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-amber-500/80 font-medium">Parcelas + Saldos</span>
        </div>

        {/* Card 4: A Receber no Mês Atual */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-blue-500" /> A Receber Este Mês
          </span>
          <p className="text-xl font-black text-foreground">
            R$ {metrics.receivablesDueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-muted-foreground">Previsão corrente</span>
        </div>

        {/* Card 5: Inadimplência / Atrasadas */}
        <div
          className={`p-4 rounded-xl border space-y-1 ${
            metrics.overdueReceivablesCount > 0
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-border bg-card'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
              metrics.overdueReceivablesCount > 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Atrasados
          </span>
          <p
            className={`text-xl font-black ${
              metrics.overdueReceivablesCount > 0 ? 'text-destructive' : 'text-foreground'
            }`}
          >
            R$ {metrics.overdueReceivablesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span
            className={`text-[10px] ${
              metrics.overdueReceivablesCount > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'
            }`}
          >
            {metrics.overdueReceivablesCount} parcela(s) vencida(s)
          </span>
        </div>

        {/* Card 6: Lucro Estimado & Margem */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
            <Percent className="h-3.5 w-3.5 text-purple-400" /> Lucro Bruto Estimado
          </span>
          <p className={`text-xl font-black ${metrics.estimatedProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            R$ {metrics.estimatedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-purple-400 font-semibold">
            Margem {metrics.profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSubTab('DRE')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'DRE'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Resumo & Projeções
          </button>

          <button
            onClick={() => setSubTab('SALES')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'SALES'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <Package className="h-3.5 w-3.5" /> Vendas Realizadas ({report.sales.length})
          </button>

          <button
            onClick={() => setSubTab('RECEIVABLES')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'RECEIVABLES'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Contas a Receber ({report.receivables.length})
            {metrics.overdueReceivablesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-destructive text-white">
                {metrics.overdueReceivablesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('PAYABLES')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'PAYABLES'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Custos de Aquisições ({report.payables.length})
          </button>
        </div>

        {/* Search Input when in list tabs */}
        {subTab !== 'DRE' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filtrar por nome, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>

      {/* SUB-TAB 1: DRE & PROJEÇÕES */}
      {subTab === 'DRE' && (
        <div className="space-y-6">
          {/* Executive DRE Flow Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Demonstrativo de Resultados (DRE Simplificado)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl border border-border bg-secondary/30">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">1. Faturamento Bruto</span>
                <p className="text-lg font-black text-foreground">
                  R$ {metrics.grossSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">Total contratado</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-secondary/30">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">2. (-) A Receber Futuro</span>
                <p className="text-lg font-black text-amber-500">
                  R$ {metrics.totalReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">Aguardando liquidação</p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">3. (=) Caixa Realizado</span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  R$ {metrics.totalRealizedInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">Efetivamente recebido</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-secondary/30">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">4. (-) Custos / Estoque</span>
                <p className="text-lg font-black text-rose-500">
                  R$ {metrics.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">Aquisições registradas</p>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <span className="text-[10px] font-bold text-purple-400 uppercase block">5. (=) Resultado Líquido</span>
                <p className={`text-lg font-black ${metrics.estimatedProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  R$ {metrics.estimatedProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-purple-400 font-semibold">Margem {metrics.profitMargin.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Monthly Forecast (Previsões de Fluxo de Caixa) */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" /> Previsão de Fluxo de Caixa Mensal (Forecast)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Projeção de entradas esperadas por mês com base nas parcelas de pré-vendas e previsões de chegada.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Mês</th>
                    <th className="py-2.5 px-3">Entradas Previstas</th>
                    <th className="py-2.5 px-3">Entradas Realizadas</th>
                    <th className="py-2.5 px-3">Custos / Saídas</th>
                    <th className="py-2.5 px-3 text-right">Saldo Líquido Projetado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {forecast.map((f) => {
                    const [year, month] = f.month.split('-');
                    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    const isCurrent = f.month === new Date().toISOString().slice(0, 7);
                    const netProjected = f.expectedInflow + f.realizedInflow - f.expectedOutflow;

                    return (
                      <tr key={f.month} className={`hover:bg-secondary/20 ${isCurrent ? 'bg-primary/5 font-semibold' : ''}`}>
                        <td className="py-3 px-3">
                          <span className="capitalize text-foreground font-bold">{monthName}</span>
                          {isCurrent && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black bg-primary/20 text-primary border border-primary/30">
                              Mês Atual
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-amber-500 font-semibold">
                          R$ {f.expectedInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-emerald-500 font-semibold">
                          R$ {f.realizedInflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-rose-500">
                          R$ {f.expectedOutflow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 px-3 text-right font-black ${netProjected >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                          R$ {netProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance By Brand (Desempenho por Fabricante) */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Faturamento por Fabricante / Marca
            </h3>

            {byBrand.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma venda registrada ainda.</p>
            ) : (
              <div className="space-y-3">
                {byBrand.map((b) => (
                  <div key={b.brand} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{b.brand}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{b.units} un. vendidas</span>
                        <span className="font-black text-foreground">
                          R$ {b.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="font-semibold text-primary">{b.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, b.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VENDAS REALIZADAS */}
      {subTab === 'SALES' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Filtrar Tipo:
              </span>
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Todas ({report.sales.length})
              </button>
              <button
                onClick={() => setTypeFilter('ORDERS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === 'ORDERS' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Pronta Entrega ({report.sales.filter((s) => s.type === 'PRONTA_ENTREGA').length})
              </button>
              <button
                onClick={() => setTypeFilter('PRE_ORDERS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  typeFilter === 'PRE_ORDERS' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Pré-Vendas ({report.sales.filter((s) => s.type === 'PRE_VENDA').length})
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/30 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Miniatura</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Tipo / Plano</th>
                    <th className="py-3 px-3">Valor Total</th>
                    <th className="py-3 px-3">Recebido</th>
                    <th className="py-3 px-3">Saldo</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground text-xs">
                        Nenhuma venda encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-secondary/20">
                        <td className="py-3 px-3 font-mono font-bold text-foreground">
                          {sale.referenceNumber}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{sale.date}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-foreground line-clamp-1">{sale.miniatureName}</p>
                          <p className="text-[10px] text-muted-foreground">{sale.brandName}</p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{sale.buyerName}</span>
                            {sale.buyerWhatsapp && (
                              <a
                                href={`https://wa.me/55${sale.buyerWhatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-500 hover:text-emerald-400"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{sale.buyerEmail}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              sale.type === 'PRONTA_ENTREGA'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {sale.type === 'PRONTA_ENTREGA' ? 'Pronta Entrega' : 'Pré-Venda'}
                          </span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{sale.paymentPlan}</p>
                        </td>
                        <td className="py-3 px-3 font-bold text-foreground">
                          R$ {sale.totalPrice.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-3 font-semibold text-emerald-500">
                          R$ {sale.paidAmount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-3 font-semibold text-amber-500">
                          R$ {sale.remainingAmount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sale.status === 'Pago' || sale.status === 'Concluído'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CONTAS A RECEBER */}
      {subTab === 'RECEIVABLES' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Filtrar Status:
              </span>
              <button
                onClick={() => setReceivablesStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  receivablesStatusFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Todos ({report.receivables.length})
              </button>
              <button
                onClick={() => setReceivablesStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  receivablesStatusFilter === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-secondary text-muted-foreground'
                }`}
              >
                Em Aberto ({report.receivables.filter((r) => !r.isOverdue).length})
              </button>
              <button
                onClick={() => setReceivablesStatusFilter('OVERDUE')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  receivablesStatusFilter === 'OVERDUE' ? 'bg-destructive text-white' : 'bg-secondary text-destructive'
                }`}
              >
                Atrasadas ({report.receivables.filter((r) => r.isOverdue).length})
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/30 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Descrição</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Miniatura</th>
                    <th className="py-3 px-3">Vencimento</th>
                    <th className="py-3 px-3">Valor a Receber</th>
                    <th className="py-3 px-3">Situação</th>
                    <th className="py-3 px-3 text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                        Nenhum recebível pendente encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredReceivables.map((rec) => {
                      const waLink = getWhatsAppLink(rec);

                      return (
                        <tr
                          key={rec.id}
                          className={`hover:bg-secondary/20 ${rec.isOverdue ? 'bg-destructive/5' : ''}`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-foreground">
                            {rec.referenceNumber}
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground">
                            {rec.description}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-foreground">{rec.buyerName}</p>
                            <p className="text-[10px] text-muted-foreground">{rec.buyerWhatsapp || rec.buyerEmail}</p>
                          </td>
                          <td className="py-3 px-3 font-medium text-foreground line-clamp-1 max-w-[200px]">
                            {rec.miniatureName}
                          </td>
                          <td className="py-3 px-3 font-bold text-foreground">
                            {rec.dueDate || 'A definir'}
                          </td>
                          <td className="py-3 px-3 font-black text-amber-500 text-sm">
                            R$ {rec.amount.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 px-3">
                            {rec.isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-destructive/15 text-destructive border border-destructive/30 animate-pulse">
                                <AlertTriangle className="h-3 w-3" /> Atrasada ({rec.daysOverdue}d)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                <Clock className="h-3 w-3" /> Em Aberto
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-[11px] font-bold shadow-sm transition-all"
                                title="Enviar lembrete amigável via WhatsApp"
                              >
                                <MessageCircle className="h-3.5 w-3.5" /> Cobrar WhatsApp
                              </a>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Sem WhatsApp</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CUSTOS & AQUISIÇÕES */}
      {subTab === 'PAYABLES' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/30 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Tipo Entrada</th>
                    <th className="py-3 px-3">Fornecedor / Origem</th>
                    <th className="py-3 px-3">Miniatura</th>
                    <th className="py-3 px-3">Fabricante</th>
                    <th className="py-3 px-3">Qtd</th>
                    <th className="py-3 px-3">Custo Unitário</th>
                    <th className="py-3 px-3 text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredPayables.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                        Nenhuma aquisição ou custo registrado. Registre aquisições na aba de Estoque/Coleção para computar o CMV.
                      </td>
                    </tr>
                  ) : (
                    filteredPayables.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/20">
                        <td className="py-3 px-3 text-muted-foreground">{item.date}</td>
                        <td className="py-3 px-3 font-semibold text-foreground">{item.type}</td>
                        <td className="py-3 px-3 text-foreground font-medium">{item.sourceName}</td>
                        <td className="py-3 px-3 font-bold text-foreground line-clamp-1">{item.miniatureName}</td>
                        <td className="py-3 px-3 text-muted-foreground">{item.brandName}</td>
                        <td className="py-3 px-3 text-foreground">{item.quantity} un.</td>
                        <td className="py-3 px-3 text-foreground">
                          R$ {item.unitCost.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-rose-500">
                          R$ {item.totalCost.toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
