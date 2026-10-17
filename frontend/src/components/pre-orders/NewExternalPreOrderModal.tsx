'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Search,
  Car,
  Store,
  DollarSign,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  Truck,
  Plus,
  Loader2,
  Phone,
  Link as LinkIcon,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { externalPreOrdersApi, CreateExternalPreOrderInput } from '@/lib/api/external-pre-orders';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

export type PaymentCondition = 'FULL_ON_DELIVERY' | 'DEPOSIT_AND_BALANCE' | 'INSTALLMENTS';

interface NewExternalPreOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewExternalPreOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: NewExternalPreOrderModalProps) {
  const queryClient = useQueryClient();

  // Mode: 'CATALOG' | 'MANUAL'
  const [sourceMode, setSourceMode] = useState<'CATALOG' | 'MANUAL'>('CATALOG');

  // Search in catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariation, setSelectedVariation] = useState<any | null>(null);

  // Manual fields
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('Mini GT');
  const [customScale, setCustomScale] = useState('1/64');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');

  // Seller info
  const [sellerName, setSellerName] = useState('');
  const [sellerContact, setSellerContact] = useState('');

  // Values & Dates
  const [paymentCondition, setPaymentCondition] = useState<PaymentCondition>('DEPOSIT_AND_BALANCE');
  const [installmentCount, setInstallmentCount] = useState<number>(3);
  const [paidInstallmentsCount, setPaidInstallmentsCount] = useState<number>(1);

  const [quantity, setQuantity] = useState('1');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConditionChange = (condition: PaymentCondition) => {
    setPaymentCondition(condition);
    const total = parseFloat(totalAmount.replace(',', '.')) || 0;

    if (condition === 'FULL_ON_DELIVERY') {
      setPaidAmount('0');
    } else if (condition === 'DEPOSIT_AND_BALANCE') {
      if (total > 0 && (!paidAmount || paidAmount === '0')) {
        setPaidAmount((total * 0.3).toFixed(2));
      }
    } else if (condition === 'INSTALLMENTS') {
      if (total > 0) {
        const perInst = total / installmentCount;
        setPaidAmount((perInst * paidInstallmentsCount).toFixed(2));
      }
    }
  };

  const handleApplyPercentage = (pct: number) => {
    const total = parseFloat(totalAmount.replace(',', '.')) || 0;
    if (total > 0) {
      setPaidAmount(((total * pct) / 100).toFixed(2));
    }
  };

  const handleInstallmentCountChange = (count: number) => {
    setInstallmentCount(count);
    const total = parseFloat(totalAmount.replace(',', '.')) || 0;
    if (total > 0 && paidInstallmentsCount > 0) {
      const perInst = total / count;
      setPaidAmount((perInst * Math.min(paidInstallmentsCount, count)).toFixed(2));
    }
  };

  const handlePaidInstallmentsChange = (paidCount: number) => {
    setPaidInstallmentsCount(paidCount);
    const total = parseFloat(totalAmount.replace(',', '.')) || 0;
    if (total > 0) {
      const perInst = total / installmentCount;
      setPaidAmount((perInst * paidCount).toFixed(2));
    }
  };

  // Search catalog variations query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['catalog-search-external-pre-order', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) return [];
      const res = await apiClient<{ data: any[] }>('/catalog/variations', {
        params: { q: searchQuery.trim(), pageSize: 8 },
      });
      return res.data || [];
    },
    enabled: sourceMode === 'CATALOG' && searchQuery.trim().length >= 2,
    staleTime: 1000 * 60,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateExternalPreOrderInput) => externalPreOrdersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders-summary'] });
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Erro ao registrar pré-venda externa.');
    },
  });

  const resetForm = () => {
    setSelectedVariation(null);
    setSearchQuery('');
    setCustomName('');
    setCustomBrand('Mini GT');
    setCustomScale('1/64');
    setCustomPhotoUrl('');
    setSellerName('');
    setSellerContact('');
    setQuantity('1');
    setTotalAmount('');
    setPaidAmount('');
    setPaymentCondition('DEPOSIT_AND_BALANCE');
    setInstallmentCount(3);
    setPaidInstallmentsCount(1);
    setOrderDate(new Date().toISOString().slice(0, 10));
    setEstimatedArrival('');
    setTrackingCode('');
    setTrackingCarrier('');
    setNotes('');
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const total = parseFloat(totalAmount.replace(',', '.')) || 0;
    const paid = parseFloat(paidAmount.replace(',', '.')) || 0;

    if (!sellerName.trim()) {
      setErrorMsg('Informe o nome do vendedor ou origem da reserva.');
      return;
    }

    if (sourceMode === 'CATALOG' && !selectedVariation) {
      setErrorMsg('Selecione uma miniatura do catálogo ou alterne para modo manual.');
      return;
    }

    if (sourceMode === 'MANUAL' && !customName.trim()) {
      setErrorMsg('Informe o nome da miniatura.');
      return;
    }

    if (total <= 0) {
      setErrorMsg('Informe um valor total válido para a pré-venda.');
      return;
    }

    if (paid > total) {
      setErrorMsg('O valor pago de sinal não pode exceder o valor total da compra.');
      return;
    }

    let conditionTag = '';
    if (paymentCondition === 'FULL_ON_DELIVERY') {
      conditionTag = '[Condição: 100% no recebimento]';
    } else if (paymentCondition === 'DEPOSIT_AND_BALANCE') {
      conditionTag = `[Condição: Sinal de R$ ${paid.toFixed(2)} + restante na chegada]`;
    } else if (paymentCondition === 'INSTALLMENTS') {
      const perInst = installmentCount > 0 ? (total / installmentCount).toFixed(2) : '0.00';
      conditionTag = `[Condição: Parcelado em ${installmentCount}x de R$ ${perInst} (${paidInstallmentsCount} paga(s))]`;
    }

    const finalNotes = notes.trim()
      ? `${conditionTag} ${notes.trim()}`
      : conditionTag;

    const payload: CreateExternalPreOrderInput = {
      variationId: sourceMode === 'CATALOG' ? selectedVariation?.id : null,
      customMiniatureName: sourceMode === 'MANUAL' ? customName.trim() : null,
      customBrand: sourceMode === 'MANUAL' ? customBrand.trim() : null,
      customScale: sourceMode === 'MANUAL' ? customScale : '1/64',
      customPhotoUrl: sourceMode === 'MANUAL' ? (customPhotoUrl.trim() || null) : null,
      sellerName: sellerName.trim(),
      sellerContact: sellerContact.trim() || null,
      quantity: parseInt(quantity, 10) || 1,
      totalAmount: total,
      paidAmount: paid,
      orderDate,
      estimatedArrival: estimatedArrival.trim() || null,
      status: 'RESERVED',
      trackingCode: trackingCode.trim() || null,
      trackingCarrier: trackingCarrier.trim() || null,
      notes: finalNotes || null,
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Nova Pré-Venda Externa</h2>
              <p className="text-xs text-muted-foreground">
                Cadastre cotas adquiridas em grupos de WhatsApp, redes sociais ou outras lojas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Escolha da Miniatura */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Car className="h-4 w-4 text-primary" /> Miniatura da Reserva
              </label>

              {/* Mode Toggle */}
              <div className="flex items-center p-1 bg-secondary rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('CATALOG');
                    setSelectedVariation(null);
                  }}
                  className={`px-3 py-1 rounded-md transition-all ${
                    sourceMode === 'CATALOG'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Buscar no Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('MANUAL');
                    setSelectedVariation(null);
                  }}
                  className={`px-3 py-1 rounded-md transition-all ${
                    sourceMode === 'MANUAL'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Inserir Manualmente
                </button>
              </div>
            </div>

            {sourceMode === 'CATALOG' ? (
              <div className="space-y-2.5">
                {selectedVariation ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-lg bg-secondary/50 border border-border overflow-hidden shrink-0">
                        <MiniatureImage
                          src={selectedVariation.photoUrl}
                          alt={selectedVariation.name}
                          className="h-full w-full object-contain p-1"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                          {selectedVariation.brand?.name || 'Catálogo Oficial'}
                        </span>
                        <h4 className="text-sm font-bold text-foreground">
                          {selectedVariation.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {selectedVariation.casting?.name} • {selectedVariation.scale?.name || '1/64'}
                          {selectedVariation.releaseYear ? ` • ${selectedVariation.releaseYear}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedVariation(null)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Ex: Skyline R34, Kaido House, Porsche 911, LBWK..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 text-xs rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                      )}
                    </div>

                    {/* Results dropdown */}
                    {searchResults && searchResults.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-xl p-1.5 space-y-1">
                        {searchResults.map((v: any) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariation(v);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/60 text-left transition-colors"
                          >
                            <div className="h-10 w-10 rounded bg-secondary overflow-hidden shrink-0">
                              <MiniatureImage
                                src={v.photoUrl}
                                alt={v.name}
                                className="h-full w-full object-contain p-0.5"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-foreground truncate">
                                {v.brand?.name ? `${v.brand.name} ` : ''}{v.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {v.casting?.name} • {v.scale?.name || '1/64'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQuery.trim().length >= 2 && searchResults && searchResults.length === 0 && !isSearching && (
                      <div className="p-3 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl mt-1.5">
                        Nenhuma miniatura encontrada no catálogo. Você pode alternar para <strong>"Inserir Manualmente"</strong> acima.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Nome da Miniatura *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Nissan GT-R R34 Kaido House #15"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Marca / Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Kaido House, Mini GT, Inno64"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Escala</label>
                  <input
                    type="text"
                    placeholder="1/64"
                    value={customScale}
                    onChange={(e) => setCustomScale(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">URL da Foto (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={customPhotoUrl}
                    onChange={(e) => setCustomPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Vendedor / Origem da Compra */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Store className="h-4 w-4 text-primary" /> Vendedor ou Grupo de Origem
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Nome do Vendedor / Grupo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Beto Miniaturas (WhatsApp), Grupo Kaido Brasil..."
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">WhatsApp / Contato (Opcional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-9999 ou @instagram"
                    value={sellerContact}
                    onChange={(e) => setSellerContact(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Condições de Pagamento & Valores */}
          <div className="space-y-4 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-primary" /> Condição de Pagamento & Valores
              </label>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Selecione como combinou com o vendedor
              </span>
            </div>

            {/* 3 Botões de Seleção da Condição */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleConditionChange('FULL_ON_DELIVERY')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentCondition === 'FULL_ON_DELIVERY'
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                    : 'border-border bg-card hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold text-foreground">1. Total no Recebimento</span>
                  {paymentCondition === 'FULL_ON_DELIVERY' ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-border" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Paga 100% apenas quando a miniatura chegar no vendedor / for enviada.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleConditionChange('DEPOSIT_AND_BALANCE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentCondition === 'DEPOSIT_AND_BALANCE'
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                    : 'border-border bg-card hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold text-foreground">2. Sinal + Restante</span>
                  {paymentCondition === 'DEPOSIT_AND_BALANCE' ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-border" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Paga uma entrada agora para garantir a cota e o saldo na entrega.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleConditionChange('INSTALLMENTS')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentCondition === 'INSTALLMENTS'
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40'
                    : 'border-border bg-card hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold text-foreground">3. Parcelamento</span>
                  {paymentCondition === 'INSTALLMENTS' ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-border" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Divide em parcelas mensais combinadas diretamente com o vendedor.
                </p>
              </button>
            </div>

            {/* Inputs de Valores e Quantidade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Qtd. Cotas</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Valor Total (R$) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 180,00"
                  value={totalAmount}
                  onChange={(e) => {
                    setTotalAmount(e.target.value);
                    const val = parseFloat(e.target.value.replace(',', '.')) || 0;
                    if (paymentCondition === 'FULL_ON_DELIVERY') {
                      setPaidAmount('0');
                    } else if (paymentCondition === 'INSTALLMENTS' && val > 0) {
                      const perInst = val / installmentCount;
                      setPaidAmount((perInst * paidInstallmentsCount).toFixed(2));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none font-bold text-foreground"
                />
              </div>

              {/* Terceiro campo varia conforme a condição escolhida */}
              {paymentCondition === 'FULL_ON_DELIVERY' ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Adiantamento / Sinal</label>
                  <input
                    type="text"
                    disabled
                    value="R$ 0,00 (100% na chegada)"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-secondary/50 border border-border text-muted-foreground outline-none font-semibold cursor-not-allowed"
                  />
                </div>
              ) : paymentCondition === 'DEPOSIT_AND_BALANCE' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-muted-foreground">Sinal Já Pago (R$)</label>
                    {parseFloat(totalAmount.replace(',', '.')) > 0 && (
                      <div className="flex items-center gap-1">
                        {[20, 30, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleApplyPercentage(pct)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary hover:bg-primary/20 hover:text-primary text-muted-foreground transition-colors cursor-pointer"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: 50,00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none text-emerald-500 font-semibold"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Total Já Pago Hoje (R$)</label>
                  <input
                    type="text"
                    placeholder="Ex: 60,00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none text-emerald-500 font-semibold"
                  />
                </div>
              )}
            </div>

            {/* Painel extra específico para a condição Parcelamento */}
            {paymentCondition === 'INSTALLMENTS' && (
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                      <span>Número de Parcelas:</span>
                      {parseFloat(totalAmount.replace(',', '.')) > 0 && (
                        <span className="text-primary font-bold">
                          R${' '}
                          {(
                            (parseFloat(totalAmount.replace(',', '.')) || 0) /
                            installmentCount
                          ).toFixed(2)}{' '}
                          / parcela
                        </span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[2, 3, 4, 5, 6, 10, 12].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleInstallmentCountChange(num)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            installmentCount === num
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                          }`}
                        >
                          {num}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Quantas parcelas você já pagou hoje?
                    </label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[0, 1, 2, 3, 4]
                        .filter((n) => n <= installmentCount)
                        .map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => handlePaidInstallmentsChange(n)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              paidInstallmentsCount === n
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                            }`}
                          >
                            {n === 0 ? 'Nenhuma (0)' : `${n} paga${n > 1 ? 's' : ''}`}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cálculo visual do saldo restante */}
            {totalAmount && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-secondary/50 text-xs border border-border">
                <span className="text-muted-foreground">
                  {paymentCondition === 'FULL_ON_DELIVERY'
                    ? 'Valor total a quitar na entrega:'
                    : paymentCondition === 'INSTALLMENTS'
                    ? `Saldo restante a parcelar (${Math.max(
                        0,
                        installmentCount - paidInstallmentsCount
                      )} parcelas restantes):`
                    : 'Saldo restante a pagar na chegada:'}
                </span>
                <span className="font-bold text-amber-500">
                  R${' '}
                  {Math.max(
                    0,
                    (parseFloat(totalAmount.replace(',', '.')) || 0) -
                      (parseFloat(paidAmount.replace(',', '.')) || 0)
                  ).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* 4. Previsões e Logística */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> Datas & Previsões
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Data da Reserva</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Previsão de Chegada</label>
                <input
                  type="text"
                  placeholder="Ex: Nov/2026, Q4 2026, 1ª Quinzena..."
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Código de Rastreio (Se já enviado)</label>
                <input
                  type="text"
                  placeholder="Ex: AA123456789BR"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Transportadora</label>
                <input
                  type="text"
                  placeholder="Correios, Jadlog, Loggi..."
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Observações / Anotações</label>
              <textarea
                rows={2}
                placeholder="Ex: Combinado retirada pessoalmente, lote número 3..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow transition-all disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Registrar Pré-Venda
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
