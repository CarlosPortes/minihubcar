'use client';

import React, { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/auth-context';
import { commercialApi, OrderResponse, OrderItem } from '@/lib/api/commercial';
import { listBuyerPreOrders, BuyerPreOrderItem, PreOrderInstallmentItem } from '@/lib/api/pre-orders';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import {
  PackageCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  ShoppingBag,
  Store,
  Layers,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Package,
  AlertTriangle,
} from 'lucide-react';

type TabType = 'ALL' | 'ORDERS' | 'PRE_ORDERS';

function OrdersContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const newOrderNumber = searchParams.get('newOrder');
  const initialTab = searchParams.get('tab') === 'pre-orders' ? 'PRE_ORDERS' : 'ALL';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});

  const toggleSchedule = (id: string) => {
    setExpandedSchedules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 1. Regular Orders
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
  } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const res = await commercialApi.getMyOrders();
      return res.data;
    },
    enabled: !!user?.id,
  });

  // 2. Buyer Pre-Orders
  const {
    data: preOrdersData,
    isLoading: isPreOrdersLoading,
  } = useQuery({
    queryKey: ['buyer-pre-orders', user?.id],
    queryFn: async () => {
      return listBuyerPreOrders();
    },
    enabled: !!user?.id,
  });

  const orders: OrderResponse[] = ordersData || [];
  const buyerPreOrders: BuyerPreOrderItem[] = preOrdersData || [];
  const isLoading = isOrdersLoading || isPreOrdersLoading;

  // Compute Buyer Pre-Orders Metrics (Total, Paid, Remaining, Items)
  const preOrdersMetrics = useMemo(() => {
    let totalContracted = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalItems = 0;

    buyerPreOrders.forEach((po) => {
      totalContracted += parseFloat(po.totalAmount) || 0;
      totalPaid += parseFloat(po.paidAmount) || 0;
      totalRemaining += parseFloat(po.remainingAmount) || 0;
      totalItems += po.quantity || 1;
    });

    return {
      totalContracted,
      totalPaid,
      totalRemaining,
      totalItems,
      count: buyerPreOrders.length,
    };
  }, [buyerPreOrders]);

  // Combined and sorted chronological list
  const combinedItems = useMemo(() => {
    const list: Array<
      | { type: 'ORDER'; item: OrderResponse; date: Date }
      | { type: 'PRE_ORDER'; item: BuyerPreOrderItem; date: Date }
    > = [];

    if (activeTab === 'ALL' || activeTab === 'ORDERS') {
      orders.forEach((ord) => {
        list.push({ type: 'ORDER', item: ord, date: new Date(ord.createdAt) });
      });
    }

    if (activeTab === 'ALL' || activeTab === 'PRE_ORDERS') {
      buyerPreOrders.forEach((po) => {
        list.push({ type: 'PRE_ORDER', item: po, date: new Date(po.createdAt) });
      });
    }

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [orders, buyerPreOrders, activeTab]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="h-28 rounded-xl bg-card border border-border animate-pulse" />
        <div className="h-44 rounded-xl bg-card border border-border animate-pulse" />
        <div className="h-44 rounded-xl bg-card border border-border animate-pulse" />
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING_APPROVAL: { label: 'Aguardando Aprovação', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
    RESERVED: { label: 'Reservado', color: 'bg-primary/10 text-primary border-primary/20' },
    AWAITING_ARRIVAL: { label: 'Aguardando Chegada', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    ARRIVED: { label: 'Chegou na Loja', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    READY_FOR_DISPATCH: { label: 'Pronto para Envio', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    COMPLETED: { label: 'Concluído', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    CANCELLED: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* New Order Success Banner */}
      {newOrderNumber && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex items-start gap-4 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Parabéns! Pedido #{newOrderNumber} realizado com sucesso!
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O estoque foi reservado e confirmado de forma atômica com o(s) vendedor(es). Você pode acompanhar o status da remessa abaixo.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Meus Pedidos & Reservas</h1>
          <p className="text-xs text-muted-foreground">
            Acompanhe suas compras de pronta entrega e o cronograma financeiro de pré-vendas
          </p>
        </div>

        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Explorar mais miniaturas <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Painel Financeiro de Pré-Vendas do Comprador */}
      {buyerPreOrders.length > 0 && (
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Painel de Pré-Vendas do Comprador</h3>
                <p className="text-[11px] text-muted-foreground">
                  Consolidação dos valores contratados, pagamentos realizados e saldos pendentes
                </p>
              </div>
            </div>

            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {preOrdersMetrics.count} reserva(s) ativa(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {/* Total em Pré-Vendas */}
            <div className="rounded-xl border border-border bg-background p-3.5 space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-primary" /> Total em Pré-Vendas
              </span>
              <p className="text-xl font-black text-foreground">
                R$ {preOrdersMetrics.totalContracted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Valor global de todas as reservas
              </p>
            </div>

            {/* Total Já Pago */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Total Já Pago
              </span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                R$ {preOrdersMetrics.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Sinais e parcelas já quitadas
              </p>
            </div>

            {/* Total em Aberto */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Saldo em Aberto
              </span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                R$ {preOrdersMetrics.totalRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-muted-foreground">
                A liquidar nos vencimentos / chegada
              </p>
            </div>

            {/* Total Miniaturas / Cotas */}
            <div className="rounded-xl border border-border bg-background p-3.5 space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-primary" /> Miniaturas / Cotas
              </span>
              <p className="text-xl font-black text-foreground">
                {preOrdersMetrics.totalItems} un.
              </p>
              <p className="text-[10px] text-muted-foreground">
                Em {preOrdersMetrics.count} lote(s) contratado(s)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          Todos ({orders.length + buyerPreOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ORDERS'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Package className="h-3.5 w-3.5" /> Pronta Entrega ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('PRE_ORDERS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PRE_ORDERS'
              ? 'bg-amber-500 text-black shadow-sm font-extrabold'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-500" /> Pré-Vendas ({buyerPreOrders.length})
        </button>
      </div>

      {/* List */}
      {combinedItems.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-4">
          <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-bold text-foreground">
            {activeTab === 'PRE_ORDERS'
              ? 'Nenhuma pré-venda ativa no momento'
              : activeTab === 'ORDERS'
              ? 'Nenhum pedido de pronta entrega'
              : 'Nenhum pedido ou reserva realizado ainda'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Explore as miniaturas e novidades no catálogo oficial e marketplace.
          </p>
          <div className="pt-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover shadow-glow transition-all"
            >
              <ShoppingBag className="h-4 w-4" /> Ir às Compras
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {combinedItems.map((entry) => {
            if (entry.type === 'ORDER') {
              const ord = entry.item;
              const dateStr = new Date(ord.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={`ord-${ord.id}`}
                  className={`rounded-xl border bg-card p-5 space-y-4 transition-all ${
                    ord.orderNumber === newOrderNumber
                      ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : 'border-border'
                  }`}
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-foreground">
                          Pedido #{ord.orderNumber}
                        </span>
                        <span className="rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-bold">
                          Pronta Entrega
                        </span>
                        <span className="rounded-md bg-secondary text-foreground px-2 py-0.5 text-[11px] font-bold">
                          {ord.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {dateStr}
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-muted-foreground block">Valor Total</span>
                      <span className="text-lg font-black text-foreground">
                        R$ {parseFloat(ord.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Itens ({ord.totalItems})
                    </p>
                    <div className="space-y-2">
                      {ord.items?.map((it: OrderItem) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded bg-secondary flex items-center justify-center overflow-hidden">
                              {it.variationSnapshot?.photoUrl ? (
                                <img
                                  src={it.variationSnapshot.photoUrl}
                                  alt={it.variationSnapshot.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Layers className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">
                                {it.variationSnapshot?.name}
                              </span>
                              <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                                <Store className="h-3 w-3" /> Vendedor: {it.sellerSnapshot?.storeName}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-muted-foreground">
                              {it.quantity}x R$ {parseFloat(it.unitPrice).toFixed(2)}
                            </span>
                            <span className="font-bold text-foreground block">
                              R$ {parseFloat(it.totalPrice).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping Address Snapshot */}
                  {ord.shippingAddressSnapshot && (
                    <div className="rounded-lg bg-secondary/20 p-3 border border-border/40 text-[11px] text-muted-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <span>Entrega para: </span>
                        <strong className="text-foreground font-semibold">
                          {ord.shippingAddressSnapshot.recipientName}
                        </strong>
                        {' • '}
                        <span>
                          {ord.shippingAddressSnapshot.street}, {ord.shippingAddressSnapshot.number}
                          {ord.shippingAddressSnapshot.complement ? ` - ${ord.shippingAddressSnapshot.complement}` : ''} -{' '}
                          {ord.shippingAddressSnapshot.neighborhood}, {ord.shippingAddressSnapshot.city} - {ord.shippingAddressSnapshot.state} (CEP {ord.shippingAddressSnapshot.zipCode})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // PRE_ORDER
            const po = entry.item;
            const dateStr = new Date(po.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const statusInfo = statusLabels[po.status] || {
              label: po.status,
              color: 'bg-secondary text-foreground',
            };
            const isScheduleOpen = expandedSchedules[po.id] ?? false;
            const quantity = po.quantity || 1;
            const totalAmount = parseFloat(po.totalAmount) || 0;
            const paidAmount = parseFloat(po.paidAmount) || 0;
            const remainingAmount = parseFloat(po.remainingAmount) || 0;
            const unitPrice = quantity > 0 ? totalAmount / quantity : totalAmount;

            return (
              <div
                key={`po-${po.id}`}
                className="rounded-xl border-2 border-amber-500/30 bg-card p-5 space-y-4 shadow-sm hover:border-amber-500/50 transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-foreground">
                        Reserva #{po.preOrderNumber}
                      </span>
                      <span className="rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[11px] font-black flex items-center gap-1 shadow-sm">
                        <Clock className="h-3 w-3" /> PRÉ-VENDA
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Data da Reserva: {dateStr}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-muted-foreground block">Valor Total da Pré-Venda</span>
                    <span className="text-lg font-black text-foreground">
                      R$ {totalAmount.toFixed(2)}
                    </span>
                    <div className="text-[11px] space-x-1 mt-0.5">
                      <span className="text-emerald-500 font-bold">
                        Pago: R$ {paidAmount.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-amber-500 font-bold">
                        A Pagar: R$ {remainingAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pending Approval Banner */}
                {po.status === 'PENDING_APPROVAL' && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Reserva em Análise pelo Vendedor</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Esta reserva foi retida e está aguardando aprovação manual do lojista ({po.seller?.storeName}) devido a parcelas com atraso em aberto na plataforma. Você será notificado assim que o lojista concluir a avaliação.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pre-Order Item Body */}
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border/60 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border border-border">
                      <MiniatureImage
                        src={po.variation?.photoUrl}
                        alt={po.variation?.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground text-sm block">
                        {po.variation?.name}
                      </span>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Store className="h-3 w-3" /> Vendedor: <strong className="text-foreground">{po.seller?.storeName}</strong>
                        </span>
                        {po.seller?.city && (
                          <span>({po.seller.city} - {po.seller.state})</span>
                        )}
                        {po.variation?.brandName && (
                          <span>• {po.variation.brandName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-muted-foreground block text-[11px]">
                      {quantity}x de R$ {unitPrice.toFixed(2)}
                    </span>
                    <span className="font-extrabold text-foreground text-sm">
                      R$ {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Details Bar: Payment Plan & Arrival Estimate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-xl border border-border/50">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Modalidade Escolhida:
                    </span>
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      {po.paymentPlan === 'DEPOSIT_AND_BALANCE'
                        ? 'Sinal de Entrada + Saldo na Chegada'
                        : po.paymentPlan === 'FULL_ON_ARRIVAL'
                        ? 'Pagamento Integral na Chegada'
                        : `Parcelamento Programado (${po.installments?.length || 1}x)`}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Previsão Estimada de Chegada:
                    </span>
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      {po.estimatedArrival ? (
                        new Date(po.estimatedArrival).toLocaleDateString('pt-BR')
                      ) : (
                        <span className="text-muted-foreground font-normal">A ser informada pelo vendedor</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Installments Schedule (Collapsible) */}
                {po.installments && po.installments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleSchedule(po.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-bold text-foreground border border-border transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        Cronograma das Parcelas ({po.installments.length}x)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {isScheduleOpen ? 'Ocultar cronograma' : 'Ver vencimentos e status'}
                        </span>
                        {isScheduleOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isScheduleOpen && (
                      <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2 animate-in fade-in duration-200">
                        <div className="space-y-1.5">
                          {po.installments.map((inst: PreOrderInstallmentItem) => {
                            const isPaid = inst.status === 'PAID';
                            const isOverdue = inst.status === 'OVERDUE' || inst.isOverdue;

                            return (
                              <div
                                key={inst.id}
                                className={`flex items-center justify-between p-2.5 rounded-lg text-xs border transition-all ${
                                  isPaid
                                    ? 'bg-emerald-500/5 border-emerald-500/20'
                                    : isOverdue
                                    ? 'bg-destructive/5 border-destructive/20'
                                    : 'bg-secondary/20 border-border/60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-black ${
                                      isPaid
                                        ? 'bg-emerald-500 text-white'
                                        : isOverdue
                                        ? 'bg-destructive text-white'
                                        : 'bg-secondary text-foreground'
                                    }`}
                                  >
                                    {String(inst.installmentNumber).padStart(2, '0')}
                                  </span>
                                  <div>
                                    <span className="font-bold text-foreground block">
                                      {inst.description}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                      Vencimento:{' '}
                                      <strong className="text-foreground">
                                        {inst.dueDate
                                          ? new Date(inst.dueDate).toLocaleDateString('pt-BR')
                                          : 'Na Chegada'}
                                      </strong>
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right space-y-0.5">
                                  <span className="font-extrabold text-foreground block">
                                    R$ {parseFloat(inst.amount).toFixed(2)}
                                  </span>
                                  <div>
                                    {isPaid ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.2 rounded-full">
                                        <Check className="h-3 w-3" /> Paga
                                      </span>
                                    ) : isOverdue ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.2 rounded-full">
                                        <AlertCircle className="h-3 w-3" /> Atrasada
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.2 rounded-full">
                                        <Clock className="h-3 w-3" /> Em Aberto
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando pedidos...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
