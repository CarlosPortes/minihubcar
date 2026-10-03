'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commercialApi, OfferDetail } from '@/lib/api/commercial';
import { createPreOrderReservation, PaymentPlan } from '@/lib/api/pre-orders';
import { calculateInstallmentSchedule } from '@/lib/utils/installments';
import {
  ArrowLeft,
  ShoppingBag,
  Star,
  CheckCircle2,
  Package,
  Layers,
  MapPin,
  Tag,
  ShieldCheck,
  AlertCircle,
  Clock,
  Calendar,
  CreditCard,
  MessageCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

export default function VariationOffersPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const variationId = params?.variationId as string;

  const [addedOfferId, setAddedOfferId] = useState<string | null>(null);

  // Pre-Order Reservation Modal State
  const [reservingOffer, setReservingOffer] = useState<OfferDetail | null>(null);
  const [reservationQuantity, setReservationQuantity] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>('DEPOSIT_AND_BALANCE');
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [dueDateDay, setDueDateDay] = useState<number>(10);
  const [reservationNotes, setReservationNotes] = useState<string>('');
  const [reservationSuccess, setReservationSuccess] = useState<any | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['variation-offers', variationId],
    queryFn: () => commercialApi.getVariationOffers(variationId),
    enabled: !!variationId,
  });

  const addToCartMutation = useMutation({
    mutationFn: (offerId: string) => commercialApi.addToCart(offerId, 1),
    onSuccess: (_, offerId) => {
      setAddedOfferId(offerId);
      queryClient.invalidateQueries({ queryKey: ['my-cart'] });
      setTimeout(() => setAddedOfferId(null), 3000);
    },
  });

  // Calculate buyer's first due date based on selected due day
  const getNextDueDate = (day: number) => {
    const today = new Date();
    let targetMonth = today.getMonth();
    let targetYear = today.getFullYear();
    if (day <= today.getDate()) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const clampedDay = Math.min(day, maxDays);
    const m = String(targetMonth + 1).padStart(2, '0');
    const dayStr = String(clampedDay).padStart(2, '0');
    return `${targetYear}-${m}-${dayStr}`;
  };

  const buyerFirstDueDate = getNextDueDate(dueDateDay);
  const maxAvailableUnits = reservingOffer?.availableStock ?? reservingOffer?.inventory?.available ?? 1;
  const buyerUnitPrice = reservingOffer ? parseFloat(reservingOffer.price) || 0 : 0;
  const buyerPrice = buyerUnitPrice * reservationQuantity;
  const buyerDepositPerUnit = reservingOffer?.depositAmount ? parseFloat(reservingOffer.depositAmount) : undefined;
  const buyerDepositAmount = buyerDepositPerUnit ? buyerDepositPerUnit * reservationQuantity : undefined;

  const buyerSchedule = reservingOffer && selectedPlan === 'INSTALLMENTS'
    ? calculateInstallmentSchedule(
        buyerPrice,
        installmentsCount,
        buyerFirstDueDate,
        buyerDepositAmount && installmentsCount > 1 && buyerDepositAmount < buyerPrice
          ? buyerDepositAmount
          : undefined
      )
    : [];

  const reserveMutation = useMutation({
    mutationFn: () => {
      if (!reservingOffer) throw new Error('Nenhuma oferta selecionada');
      return createPreOrderReservation({
        offerId: reservingOffer.id,
        paymentPlan: selectedPlan,
        quantity: reservationQuantity,
        installmentsCount: selectedPlan === 'INSTALLMENTS' ? installmentsCount : undefined,
        dueDateDay: selectedPlan === 'INSTALLMENTS' ? dueDateDay : undefined,
        notes: reservationNotes || undefined,
        customInstallments: selectedPlan === 'INSTALLMENTS' && buyerSchedule.length > 0
          ? buyerSchedule.map((s) => ({
              installmentNumber: s.installmentNumber,
              description: s.description,
              amount: s.amount,
              dueDate: s.dueDateIso,
            }))
          : undefined,
      });
    },
    onSuccess: (res) => {
      setReservationSuccess(res.data);
      queryClient.invalidateQueries({ queryKey: ['variation-offers', variationId] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-pre-orders'] });
    },
  });

  const openReserveModal = (off: OfferDetail) => {
    setReservingOffer(off);
    setReservationSuccess(null);
    setReservationNotes('');
    setReservationQuantity(1);

    // Default plan to the first available option
    if (off.allowDepositAndBalance) {
      setSelectedPlan('DEPOSIT_AND_BALANCE');
    } else if (off.allowFullOnArrival) {
      setSelectedPlan('FULL_ON_ARRIVAL');
    } else if (off.allowInstallments) {
      setSelectedPlan('INSTALLMENTS');
    }
    setInstallmentsCount(Math.min(off.maxInstallments || 4, 10));
    setDueDateDay(10);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-card rounded animate-pulse" />
        <div className="h-48 rounded-xl bg-card border border-border animate-pulse" />
        <div className="space-y-4">
          <div className="h-32 rounded-xl bg-card border border-border animate-pulse" />
          <div className="h-32 rounded-xl bg-card border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  const rawData: any = data;
  const variation = rawData?.variation || rawData?.data?.variation;
  const offers: OfferDetail[] = rawData?.offers || rawData?.data?.offers || [];

  if (error || !data || !variation) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-destructive/20 text-destructive space-y-4">
        <AlertCircle className="mx-auto h-10 w-10" />
        <p>Não foi possível carregar as ofertas para esta miniatura.</p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Marketplace
        </Link>
      </div>

      {/* Mini details header card */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="relative h-44 w-44 shrink-0 rounded-xl bg-secondary/40 border border-border flex items-center justify-center overflow-hidden">
          <MiniatureImage
            src={variation.photoUrl}
            alt={variation.name}
            className="h-full w-full object-cover"
            containerClassName="relative h-full w-full bg-secondary/40 flex items-center justify-center overflow-hidden"
          />
        </div>

        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
              {variation.brandName || 'Miniatura'}
            </span>
            {variation.releaseYear && (
              <span className="rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
                Ano: {variation.releaseYear}
              </span>
            )}
            <span className="rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
              {offers.length} {offers.length === 1 ? 'vendedor' : 'vendedores'}
            </span>
          </div>

          <h1 className="text-2xl font-black text-foreground">{variation.name}</h1>
          {variation.castingName && (
            <p className="text-sm text-muted-foreground">
              Casting base: <span className="text-foreground font-semibold">{variation.castingName}</span>
            </p>
          )}

          <p className="text-xs text-muted-foreground pt-1">
            Compare abaixo os preços, modalidades de pré-venda, condições da embalagem e reputação dos vendedores para esta peça.
          </p>
        </div>
      </div>

      {/* Offers Comparison List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            Ofertas & Pré-Vendas Disponíveis ({offers.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Ordenado por menor preço
          </span>
        </div>

        {offers.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground">
            <p>Nenhuma oferta ativa no momento para esta miniatura.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((off: OfferDetail) => {
              const isJustAdded = addedOfferId === off.id;
              const isPending = addToCartMutation.isPending && addToCartMutation.variables === off.id;
              const availableStock = off.inventory?.available ?? off.availableStock ?? 1;
              const isPre = !!off.isPreOrder;

              return (
                <div
                  key={off.id}
                  className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border transition-all ${
                    isPre
                      ? 'border-amber-500/30 bg-card hover:border-amber-500/60 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  {/* Seller & Offer info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        {off.seller.storeName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <Star className="h-3 w-3 fill-amber-500" />
                        {parseFloat(off.seller.reputationScore).toFixed(1)}
                      </span>
                      {(off.seller.city || off.seller.state) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[off.seller.city, off.seller.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {isPre && (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          <Clock className="h-3 w-3" /> Pré-Venda
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-foreground">{off.title}</p>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-secondary px-2 py-0.5 font-medium text-foreground border border-border">
                        Estado: {off.condition}
                      </span>
                      {off.packagingState && (
                        <span className="rounded bg-secondary px-2 py-0.5 font-medium text-muted-foreground border border-border">
                          Blister: {off.packagingState}
                        </span>
                      )}
                      <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 font-semibold border border-emerald-500/20">
                        {availableStock} disponível(is)
                      </span>
                    </div>

                    {/* Pre-order specific details */}
                    {isPre && (
                      <div className="p-2.5 rounded-lg bg-secondary/30 border border-border space-y-1 text-xs">
                        {off.preOrderEstimatedArrival && (
                          <p className="text-amber-500 font-semibold flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> Chegada Prevista:{' '}
                            {new Date(off.preOrderEstimatedArrival).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {off.allowDepositAndBalance && (
                            <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-500/20">
                              Sinal + Saldo {off.depositAmount ? `(Sinal: R$ ${parseFloat(off.depositAmount).toFixed(2)})` : ''}
                            </span>
                          )}
                          {off.allowFullOnArrival && (
                            <span className="bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-500/20">
                              Integral na Chegada
                            </span>
                          )}
                          {off.allowInstallments && (
                            <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-500/20">
                              Parcelamento em até {off.maxInstallments || 10}x
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {off.description && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        "{off.description}"
                      </p>
                    )}
                  </div>

                  {/* Price and Cart/Reservation Action */}
                  <div className="flex w-full md:w-auto items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-muted-foreground block">
                        {isPre ? 'Valor Total da Pré-Venda' : 'Preço à vista'}
                      </span>
                      <span className="text-2xl font-black text-foreground">
                        R$ {parseFloat(off.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPre ? (
                        <button
                          disabled={availableStock <= 0}
                          onClick={() => openReserveModal(off)}
                          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <Clock className="h-4 w-4" />
                          Reservar Pré-Venda
                        </button>
                      ) : isJustAdded ? (
                        <Link
                          href="/cart"
                          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-emerald-500 text-white text-xs font-bold shadow-glow hover:bg-emerald-600 transition-all"
                        >
                          <CheckCircle2 className="h-4 w-4" /> No Carrinho! Ir Comprar
                        </Link>
                      ) : (
                        <button
                          disabled={availableStock <= 0 || isPending}
                          onClick={() => addToCartMutation.mutate(off.id)}
                          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          {isPending ? 'Adicionando...' : 'Adicionar ao Carrinho'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRE-ORDER RESERVATION MODAL */}
      {reservingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {!reservationSuccess ? (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Reserva de Pré-Venda
                  </h3>
                  <button
                    onClick={() => setReservingOffer(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                {/* Offer Mini Summary */}
                <div className="p-3.5 rounded-xl bg-secondary/30 border border-border flex items-center gap-3">
                  <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    <MiniatureImage
                      src={variation.photoUrl}
                      alt={variation.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{reservingOffer.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Loja: <strong className="text-foreground">{reservingOffer.seller.storeName}</strong>
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-xs font-extrabold text-foreground">
                        {reservationQuantity > 1 ? (
                          <>
                            {reservationQuantity}x de R$ {buyerUnitPrice.toFixed(2)} = <strong className="text-primary">R$ {buyerPrice.toFixed(2)}</strong>
                          </>
                        ) : (
                          <>Valor: R$ {buyerUnitPrice.toFixed(2)}</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity Selector Card */}
                <div className="p-3.5 rounded-xl bg-card border-2 border-primary/30 shadow-sm flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" /> Quantidade Desejada
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Cotas disponíveis neste lote: <strong className="text-foreground">{maxAvailableUnits} un.</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setReservationQuantity(Math.max(1, reservationQuantity - 1))}
                      disabled={reservationQuantity <= 1}
                      className="h-8 w-8 rounded-lg bg-card hover:bg-secondary border border-border/80 flex items-center justify-center font-bold text-foreground disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxAvailableUnits}
                      value={reservationQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setReservationQuantity(Math.min(Math.max(1, val), maxAvailableUnits));
                        }
                      }}
                      className="h-8 w-12 text-center bg-transparent border-0 text-sm font-black text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setReservationQuantity(Math.min(maxAvailableUnits, reservationQuantity + 1))}
                      disabled={reservationQuantity >= maxAvailableUnits}
                      className="h-8 w-8 rounded-lg bg-card hover:bg-secondary border border-border/80 flex items-center justify-center font-bold text-foreground disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Payment Plan Options */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-foreground block">
                    Selecione a Modalidade de Pagamento Desejada:
                  </label>

                  {/* Plan 1: Deposit and Balance */}
                  {reservingOffer.allowDepositAndBalance && (
                    <label
                      className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedPlan === 'DEPOSIT_AND_BALANCE'
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:bg-secondary/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentPlan"
                          checked={selectedPlan === 'DEPOSIT_AND_BALANCE'}
                          onChange={() => setSelectedPlan('DEPOSIT_AND_BALANCE')}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">
                            1. Sinal de Entrada + Saldo na Chegada
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Pague um sinal inicial de{' '}
                            <strong className="text-foreground">
                              R$ {(buyerDepositAmount || (buyerPrice * 0.3)).toFixed(2)}
                            </strong>{' '}
                            para garantir a reserva de {reservationQuantity} miniatura(s). O saldo restante de{' '}
                            <strong className="text-foreground">
                              R$ {(buyerPrice - (buyerDepositAmount || (buyerPrice * 0.3))).toFixed(2)}
                            </strong>{' '}
                            será pago somente quando o lote chegar na loja do vendedor.
                          </p>
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Plan 2: Full on arrival */}
                  {reservingOffer.allowFullOnArrival && (
                    <label
                      className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedPlan === 'FULL_ON_ARRIVAL'
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:bg-secondary/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentPlan"
                          checked={selectedPlan === 'FULL_ON_ARRIVAL'}
                          onChange={() => setSelectedPlan('FULL_ON_ARRIVAL')}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">
                            2. Pagamento Integral na Chegada
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Não pague nada agora. O valor total de{' '}
                            <strong className="text-foreground">
                              R$ {buyerPrice.toFixed(2)}
                            </strong>{' '}
                            ({reservationQuantity} un.) será cobrado somente quando a miniatura estiver pronta para envio.
                          </p>
                        </div>
                      </div>
                    </label>
                  )}

                  {/* Plan 3: Installments */}
                  {reservingOffer.allowInstallments && (
                    <label
                      className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedPlan === 'INSTALLMENTS'
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:bg-secondary/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentPlan"
                          checked={selectedPlan === 'INSTALLMENTS'}
                          onChange={() => setSelectedPlan('INSTALLMENTS')}
                          className="mt-1 h-4 w-4 text-primary"
                        />
                        <div className="space-y-2 flex-1">
                          <p className="text-xs font-bold text-foreground">
                            3. Parcelamento Programado (Vencimentos Mensais)
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Divida o valor total de R$ {buyerPrice.toFixed(2)} ({reservationQuantity} un.) em parcelas com datas de vencimento programadas.
                          </p>

                          {selectedPlan === 'INSTALLMENTS' && (
                            <div className="space-y-3 pt-1">
                              {/* Card de Configuração de Parcelas */}
                              <div className="rounded-xl p-3.5 bg-muted/60 dark:bg-slate-900/80 border border-border/80 shadow-inner space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                      <Layers className="h-3.5 w-3.5 text-primary" />
                                      <span>Número de Parcelas</span>
                                    </label>
                                    <select
                                      value={installmentsCount}
                                      onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10))}
                                      className="w-full h-10 px-3 rounded-xl bg-background border-2 border-slate-300 dark:border-slate-700 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-foreground shadow-sm cursor-pointer transition-colors"
                                    >
                                      {Array.from(
                                        { length: Math.min(reservingOffer.maxInstallments || 10, 10) },
                                        (_, i) => i + 1
                                      ).map((n) => {
                                        const hasCustomFirst = buyerDepositAmount && n > 1 && buyerDepositAmount < buyerPrice;
                                        let label = `${String(n).padStart(2, '0')}x`;
                                        if (n === 1) {
                                          label = `01x de R$ ${buyerPrice.toFixed(2)}`;
                                        } else if (hasCustomFirst) {
                                          const remTotal = buyerPrice - (buyerDepositAmount || 0);
                                          const remCount = n - 1;
                                          const remAvg = (remTotal / remCount).toFixed(2);
                                          label = `${String(n).padStart(2, '0')}x (1ª de R$ ${(buyerDepositAmount || 0).toFixed(2)} + ${remCount}x de R$ ${remAvg})`;
                                        } else {
                                          label = `${String(n).padStart(2, '0')}x de R$ ${(buyerPrice / n).toFixed(2)}`;
                                        }
                                        return (
                                          <option key={n} value={n} className="bg-background text-foreground font-semibold">
                                            {label}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-primary" />
                                      <span>Dia de Vencimento Mensal</span>
                                    </label>
                                    <select
                                      value={dueDateDay}
                                      onChange={(e) => setDueDateDay(parseInt(e.target.value, 10))}
                                      className="w-full h-10 px-3 rounded-xl bg-background border-2 border-slate-300 dark:border-slate-700 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-foreground shadow-sm cursor-pointer transition-colors"
                                    >
                                      <option value="5" className="bg-background text-foreground font-semibold">Dia 05 de cada mês</option>
                                      <option value="10" className="bg-background text-foreground font-semibold">Dia 10 de cada mês</option>
                                      <option value="15" className="bg-background text-foreground font-semibold">Dia 15 de cada mês</option>
                                      <option value="20" className="bg-background text-foreground font-semibold">Dia 20 de cada mês</option>
                                      <option value="25" className="bg-background text-foreground font-semibold">Dia 25 de cada mês</option>
                                      <option value="28" className="bg-background text-foreground font-semibold">Dia 28 de cada mês</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2 p-2 rounded-lg bg-background/80 border border-border text-[11px] text-muted-foreground">
                                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                  <p className="leading-snug">
                                    As parcelas vencerão no <strong>dia {String(dueDateDay).padStart(2, '0')} de cada mês subsequente</strong>.
                                  </p>
                                </div>
                              </div>

                              {buyerSchedule.length > 0 && (
                                <div className="rounded-xl border-2 border-primary/30 bg-card p-3.5 space-y-2.5 shadow-sm">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                      <Sparkles className="h-4 w-4 text-primary" />
                                      Cronograma Previsto das Parcelas
                                    </span>
                                    <span className="text-[11px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                      Total: R$ {buyerPrice.toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {buyerSchedule.map((inst) => (
                                      <div
                                        key={inst.installmentNumber}
                                        className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                                          inst.isFirst && buyerSchedule.length > 1
                                            ? 'bg-primary/15 border-2 border-primary/40 font-semibold shadow-sm'
                                            : 'bg-muted/60 dark:bg-slate-900/60 border border-border/80'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-black ${
                                            inst.isFirst && buyerSchedule.length > 1
                                              ? 'bg-primary text-primary-foreground'
                                              : 'bg-secondary text-foreground'
                                          }`}>
                                            {String(inst.installmentNumber).padStart(2, '0')}
                                          </span>
                                          <div>
                                            <span className="font-bold text-foreground block">
                                              {inst.description}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground block">
                                              Vencimento: <strong className="text-foreground font-semibold">{inst.dueDateFormatted}</strong>
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <span className="text-xs sm:text-sm font-extrabold text-foreground">
                                            R$ {inst.amount}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  )}
                </div>

                {/* Notes input */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Mensagem ou Observação para o Vendedor (opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Gostaria de pagar a entrada via PIX. Meu WhatsApp está atualizado no perfil."
                    value={reservationNotes}
                    onChange={(e) => setReservationNotes(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background border border-border text-xs text-foreground"
                  />
                </div>

                {reserveMutation.error && (
                  <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                    {(reserveMutation.error as any).message || 'Erro ao criar reserva.'}
                  </div>
                )}

                {/* Modal Footer */}
                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => setReservingOffer(null)}
                    className="px-4 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={reserveMutation.isPending}
                    onClick={() => reserveMutation.mutate()}
                    className="px-5 py-2 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 shadow-glow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    {reserveMutation.isPending ? 'Confirmando...' : 'Confirmar Reserva de Pré-Venda'}
                  </button>
                </div>
              </>
            ) : (
              /* Success Screen */
              <div className="py-6 text-center space-y-4">
                <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-foreground">Pré-Venda Reservada com Sucesso!</h3>
                  <p className="text-xs text-muted-foreground">
                    Código da Reserva:{' '}
                    <span className="font-mono font-bold text-primary">{reservationSuccess.preOrderNumber}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-left space-y-2 text-xs">
                  <p className="font-bold text-foreground">Resumo do Plano Selecionado:</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>Quantidade: <strong className="text-foreground">{reservationQuantity} unidade(s)</strong></p>
                    <p>Total: <strong className="text-foreground">R$ {parseFloat(reservationSuccess.totalAmount).toFixed(2)}</strong></p>
                    <p>Parcelas geradas: <strong className="text-foreground">{reservationSuccess.installments?.length || 1}</strong></p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  O vendedor <strong className="text-foreground">{reservingOffer.seller.storeName}</strong> foi notificado sobre a sua reserva e poderá gerenciar as baixas manuais à medida que os pagamentos forem efetuados.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={() => {
                      setReservingOffer(null);
                      setReservationSuccess(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <Link
                    href="/orders?tab=pre-orders"
                    onClick={() => {
                      setReservingOffer(null);
                      setReservationSuccess(null);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow transition-all"
                  >
                    <ShoppingBag className="h-4 w-4" /> Acompanhar em Meus Pedidos
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
