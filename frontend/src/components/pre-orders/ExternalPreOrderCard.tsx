'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  Store,
  DollarSign,
  Calendar,
  Clock,
  Truck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  PackageCheck,
  Trash2,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import {
  ExternalPreOrderItem,
  externalPreOrdersApi,
  ExternalPreOrderStatus,
} from '@/lib/api/external-pre-orders';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

interface ExternalPreOrderCardProps {
  item: ExternalPreOrderItem;
  onAddPayment: (item: ExternalPreOrderItem) => void;
  onConvertToCollection: (item: ExternalPreOrderItem) => void;
}

const statusConfig: Record<
  ExternalPreOrderStatus,
  { label: string; badgeClass: string; desc: string }
> = {
  RESERVED: {
    label: 'Reservado',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
    desc: 'Cota garantida com sinal, aguardando lote da fábrica',
  },
  ARRIVED_AT_SELLER: {
    label: 'Chegou no Vendedor',
    badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30 font-bold',
    desc: 'Lote recebido pelo importador/vendedor; momento de quitar saldo',
  },
  SHIPPED: {
    label: 'Em Trânsito / Enviado',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    desc: 'Despachado para o seu endereço com código de rastreamento',
  },
  RECEIVED: {
    label: 'Recebido / Na Coleção',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold',
    desc: 'Entregue e incorporado ao seu acervo físico',
  },
  CANCELLED: {
    label: 'Cancelado',
    badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
    desc: 'Reserva cancelada ou estornada',
  },
};

export function ExternalPreOrderCard({
  item,
  onAddPayment,
  onConvertToCollection,
}: ExternalPreOrderCardProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const total = parseFloat(item.totalAmount) || 0;
  const paid = parseFloat(item.paidAmount) || 0;
  const remaining = parseFloat(item.remainingAmount) || 0;
  const progressPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const currentStatus = statusConfig[item.status] || statusConfig.RESERVED;

  // Mutation to change status quickly
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: ExternalPreOrderStatus) =>
      externalPreOrdersApi.update(item.id, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders-summary'] });
      setIsUpdatingStatus(false);
    },
  });

  // Mutation to delete
  const deleteMutation = useMutation({
    mutationFn: () => externalPreOrdersApi.delete(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders-summary'] });
    },
  });

  const handleCopyTracking = () => {
    if (!item.trackingCode) return;
    navigator.clipboard.writeText(item.trackingCode);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const handleDelete = () => {
    if (confirm(`Deseja realmente excluir a pré-venda de "${item.displayName}"?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        item.status === 'RECEIVED'
          ? 'border-emerald-500/20 bg-card/60'
          : 'border-border bg-card shadow-sm hover:border-border/80'
      }`}
    >
      {/* Top Banner / Card Body */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Miniature & Identity */}
          <div className="flex items-start gap-3.5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-secondary/50 border border-border overflow-hidden shrink-0">
              <MiniatureImage
                src={item.displayPhoto}
                alt={item.displayName}
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-foreground">
                  {item.displayBrand}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {item.displayScale}
                </span>
                {item.quantity > 1 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {item.quantity}x cotas
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                {item.displayName}
              </h3>

              {/* Seller / Origin info */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-0.5">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground/90">
                  <Store className="h-3.5 w-3.5 text-primary" /> {item.sellerName}
                </span>
                {item.sellerContact && (
                  <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {item.sellerContact}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status & Actions Dropdown */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
            {/* Quick Status Selector */}
            <div className="relative">
              <select
                value={item.status}
                onChange={(e) => updateStatusMutation.mutate(e.target.value as ExternalPreOrderStatus)}
                disabled={item.status === 'RECEIVED'}
                className={`text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border outline-none cursor-pointer appearance-none pr-7 transition-colors ${currentStatus.badgeClass}`}
              >
                <option value="RESERVED">Reservado</option>
                <option value="ARRIVED_AT_SELLER">Chegou no Vendedor</option>
                <option value="SHIPPED">Em Trânsito / Enviado</option>
                <option value="RECEIVED">Recebido / Na Coleção</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-60" />
            </div>

            {item.estimatedArrival && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" /> Prev: {item.estimatedArrival}
              </span>
            )}
          </div>
        </div>

        {/* Financial Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-primary" /> Total:{' '}
              <strong className="text-foreground">R$ {total.toFixed(2)}</strong>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-semibold">
                Pago: R$ {paid.toFixed(2)} ({progressPercent}%)
              </span>
              {remaining > 0 ? (
                <span className="text-amber-500 font-bold">
                  Restante: R$ {remaining.toFixed(2)}
                </span>
              ) : (
                <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Quitado
                </span>
              )}
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progressPercent >= 100
                  ? 'bg-emerald-500'
                  : progressPercent > 0
                  ? 'bg-gradient-to-r from-primary to-amber-500'
                  : 'bg-muted'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Tracking & Logistics if available */}
        {item.trackingCode && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-secondary/50 text-xs border border-border">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-sky-400" />
              <span className="text-muted-foreground">
                {item.trackingCarrier || 'Rastreamento'}:
              </span>
              <span className="font-mono font-bold text-foreground">{item.trackingCode}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyTracking}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded bg-background border border-border transition-colors"
              >
                {copiedTracking ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copiar
                  </>
                )}
              </button>
              <a
                href={`https://rastreamento.correios.com.br/app/index.php?codigo=${item.trackingCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline px-2 py-0.5 rounded bg-primary/10 border border-primary/20"
              >
                Rastrear <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Card Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {/* Action 1: Add Payment */}
            {remaining > 0 && item.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => onAddPayment(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5" /> Registrar Pagamento
              </button>
            )}

            {/* Action 2: Convert to collection */}
            {item.status !== 'RECEIVED' && item.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => onConvertToCollection(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow transition-all"
              >
                <PackageCheck className="h-3.5 w-3.5" /> Mover para Coleção
              </button>
            )}

            {item.status === 'RECEIVED' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" /> No Seu Acervo
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle Payment History */}
            {item.payments && item.payments.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
              >
                {item.payments.length} pagamento(s)
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={handleDelete}
              title="Excluir pré-venda"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expandable Payments History */}
        {isExpanded && item.payments && item.payments.length > 0 && (
          <div className="pt-3 border-t border-border space-y-2">
            <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider">
              Histórico de Pagamentos / Baixas
            </h4>
            <div className="divide-y divide-border/60 rounded-xl bg-secondary/30 border border-border overflow-hidden">
              {item.payments.map((p) => (
                <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-foreground">{p.description}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.paidAt} • {p.paymentMethod}
                      {p.notes ? ` • ${p.notes}` : ''}
                    </div>
                  </div>
                  <div className="font-bold text-emerald-500">R$ {parseFloat(p.amount).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
