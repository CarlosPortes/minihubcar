'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commercialApi } from '@/lib/api/commercial';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import { calculateInstallmentSchedule } from '@/lib/utils/installments';
import {
  X,
  Store,
  Clock,
  Package,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface VariationData {
  id: string;
  name: string;
  photoUrl?: string | null;
  releaseYear?: number | null;
  color?: string | null;
  scale?: { name: string } | string | null;
  brand?: { name: string } | null;
  brandName?: string | null;
}

interface CatalogCreateOfferModalProps {
  variation: VariationData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (offerTitle: string, isPreOrder: boolean) => void;
}

export function CatalogCreateOfferModal({
  variation,
  isOpen,
  onClose,
  onSuccess,
}: CatalogCreateOfferModalProps) {
  const queryClient = useQueryClient();

  // Mode: Pronta Entrega vs Pré-Venda
  const [isPreOrder, setIsPreOrder] = useState(false);

  // Form Fields
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerStock, setOfferStock] = useState('1');
  const [offerCondition, setOfferCondition] = useState('LACRADO');
  const [offerPackaging, setOfferPackaging] = useState('PERFEITO');
  const [offerDescription, setOfferDescription] = useState('');

  // Pre-Order Fields
  const [preOrderEstimatedArrival, setPreOrderEstimatedArrival] = useState('');
  const [allowDepositAndBalance, setAllowDepositAndBalance] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [allowFullOnArrival, setAllowFullOnArrival] = useState(true);
  const [allowInstallments, setAllowInstallments] = useState(true);
  const [installmentsCount, setInstallmentsCount] = useState('4');
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [customFirstInstallment, setCustomFirstInstallment] = useState('');

  // Status state
  const [formError, setFormError] = useState<string | null>(null);
  const [publishedOffer, setPublishedOffer] = useState<{ id: string; title: string; isPreOrder: boolean } | null>(null);

  // Installment schedule calculation
  const parsedPrice = parseFloat(offerPrice) || 0;
  const parsedCount = Math.max(1, Math.min(10, parseInt(installmentsCount, 10) || 1));
  const parsedFirstVal = customFirstInstallment && !isNaN(parseFloat(customFirstInstallment))
    ? parseFloat(customFirstInstallment)
    : undefined;

  const installmentSchedule = calculateInstallmentSchedule(
    parsedPrice,
    parsedCount,
    firstDueDate,
    parsedFirstVal
  );

  const isCustomFirstInvalid = parsedFirstVal !== undefined && parsedCount > 1 && parsedFirstVal >= parsedPrice;

  // Initialize form when variation changes
  useEffect(() => {
    if (variation) {
      setOfferTitle(`${variation.name} - ${isPreOrder ? 'Pré-Venda' : 'Pronta Entrega'}`);
      setOfferPrice('');
      setOfferStock('1');
      setOfferCondition('LACRADO');
      setOfferPackaging('PERFEITO');
      setOfferDescription('');
      setPreOrderEstimatedArrival('');
      setDepositAmount('');
      setInstallmentsCount('4');
      setCustomFirstInstallment('');
      setFormError(null);
      setPublishedOffer(null);
    }
  }, [variation, isPreOrder]);

  const handleTogglePreOrder = (preOrder: boolean) => {
    setIsPreOrder(preOrder);
    if (variation) {
      setOfferTitle(`${variation.name} - ${preOrder ? 'Pré-Venda' : 'Pronta Entrega'}`);
    }
  };

  const createOfferMutation = useMutation({
    mutationFn: async () => {
      if (!variation) throw new Error('Nenhuma miniatura selecionada');
      if (!offerPrice || parseFloat(offerPrice) <= 0) {
        throw new Error('Informe um preço de venda válido.');
      }
      if (!offerTitle.trim()) {
        throw new Error('Informe o título do anúncio.');
      }
      if (isPreOrder && !preOrderEstimatedArrival) {
        throw new Error('Informe a data prevista de chegada da pré-venda.');
      }
      if (isPreOrder && allowInstallments && isCustomFirstInvalid) {
        throw new Error('O valor da 1ª parcela deve ser menor que o valor total da miniatura.');
      }

      // Schedule summary to attach to offer description
      const scheduleSummary = isPreOrder && allowInstallments && installmentSchedule.length > 1
        ? `Cronograma de Parcelamento (${parsedCount}x):\n` +
          installmentSchedule
            .map((s) => `• Parcela ${s.installmentNumber}: ${s.dueDateFormatted} — R$ ${s.amount}${s.isFirst ? ' (Entrada)' : ''}`)
            .join('\n')
        : (isPreOrder && allowInstallments && installmentSchedule.length === 1
          ? `Parcelamento: 1x de R$ ${parsedPrice.toFixed(2)} em ${installmentSchedule[0]?.dueDateFormatted}`
          : '');

      const finalDescription = [
        offerDescription.trim(),
        scheduleSummary,
      ].filter(Boolean).join('\n\n');

      return commercialApi.createSellerOffer({
        variationId: variation.id,
        title: offerTitle.trim(),
        price: parseFloat(offerPrice).toFixed(2),
        condition: offerCondition,
        packagingState: offerPackaging || undefined,
        description: finalDescription || undefined,
        initialStock: parseInt(offerStock, 10) || 1,
        isPreOrder,
        preOrderEstimatedArrival: isPreOrder && preOrderEstimatedArrival ? preOrderEstimatedArrival : undefined,
        allowDepositAndBalance: isPreOrder ? allowDepositAndBalance : undefined,
        depositAmount: isPreOrder && allowInstallments && installmentSchedule[0]
          ? installmentSchedule[0].amount
          : (isPreOrder && allowDepositAndBalance && depositAmount ? parseFloat(depositAmount).toFixed(2) : undefined),
        allowFullOnArrival: isPreOrder ? allowFullOnArrival : undefined,
        allowInstallments: isPreOrder ? allowInstallments : undefined,
        maxInstallments: isPreOrder && allowInstallments ? parsedCount : undefined,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['my-seller-offers'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-variations'] });

      const newOffer = response.data;
      setPublishedOffer({
        id: newOffer.id,
        title: newOffer.title,
        isPreOrder: !!newOffer.isPreOrder,
      });

      if (onSuccess) {
        onSuccess(newOffer.title, !!newOffer.isPreOrder);
      }
    },
    onError: (err: any) => {
      setFormError(err.message || 'Erro ao publicar oferta no marketplace');
    },
  });

  if (!isOpen || !variation) return null;

  const scaleName = typeof variation.scale === 'string'
    ? variation.scale
    : variation.scale?.name || '';
  const brandName = variation.brandName || (typeof variation.brand === 'object' ? variation.brand?.name : '');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-emerald-500/10 via-card to-card flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Vendedor Autorizado
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-secondary text-foreground">
                  Catálogo Oficial
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Anunciar Miniatura no Marketplace
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {publishedOffer ? (
            /* Success State */
            <div className="py-8 px-4 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Anúncio Publicado com Sucesso!</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Sua oferta para <strong className="text-foreground">{publishedOffer.title}</strong> já está ativa
                  {publishedOffer.isPreOrder ? ' no módulo de Pré-Vendas' : ' no Marketplace'}.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-2.5">
                <Link
                  href={`/marketplace/${variation.id}`}
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted text-xs font-semibold border border-border transition-colors"
                >
                  <span>Ver Oferta no Marketplace</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>

                <Link
                  href="/seller"
                  onClick={onClose}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-semibold shadow-glow transition-all"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Gerenciar no Painel de Vendas</span>
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar ao Catálogo
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Resumo da Miniatura Vinculada */}
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/80 flex items-center gap-3">
                <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  <MiniatureImage
                    src={variation.photoUrl}
                    alt={variation.name}
                    className="h-full w-full object-cover"
                    containerClassName="h-full w-full flex items-center justify-center"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                    Item do Catálogo
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {variation.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    {brandName && <span>{brandName}</span>}
                    {scaleName && <span>• Escala {scaleName}</span>}
                    {variation.releaseYear && <span>• Ano {variation.releaseYear}</span>}
                    {variation.color && <span>• Cor: {variation.color}</span>}
                  </div>
                </div>
              </div>

              {/* Seletor de Tipo: Pronta Entrega vs Pré-Venda */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Tipo de Anúncio Comercial
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTogglePreOrder(false)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      !isPreOrder
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-foreground ring-2 ring-emerald-500/20'
                        : 'border-border bg-card hover:bg-secondary/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Package className="h-4 w-4 text-emerald-400" />
                        <span className={!isPreOrder ? 'text-foreground font-extrabold' : ''}>
                          Pronta Entrega
                        </span>
                      </div>
                      {!isPreOrder && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Item já disponível em estoque para envio imediato.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePreOrder(true)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isPreOrder
                        ? 'border-primary/60 bg-primary/10 text-foreground ring-2 ring-primary/20'
                        : 'border-border bg-card hover:bg-secondary/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className={isPreOrder ? 'text-foreground font-extrabold' : ''}>
                          Pré-Venda / Reserva
                        </span>
                      </div>
                      {isPreOrder && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Lote futuro com sinal, prazo de chegada e parcelamento.
                    </span>
                  </button>
                </div>
              </div>

              {/* Título & Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Título do Anúncio *
                  </label>
                  <input
                    type="text"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    placeholder="Ex: RUF SCR 2018 Irish Green 1/64 - Pronta Entrega"
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="189.90"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Condição, Embalagem e Quantidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Condição do Item
                  </label>
                  <select
                    value={offerCondition}
                    onChange={(e) => setOfferCondition(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="LACRADO">Lacrado no Blister / Caixa</option>
                    <option value="NOVO_ABERTO">Novo / Aberto p/ Conferência</option>
                    <option value="EXCELENTE">Excelente Estado</option>
                    <option value="BOM">Bom Estado</option>
                    <option value="COM_DETALHE">Com Detalhes</option>
                    <option value="CUSTOM">Customizado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Estado da Embalagem
                  </label>
                  <select
                    value={offerPackaging}
                    onChange={(e) => setOfferPackaging(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="PERFEITO">Perfeito (Sem Vincos)</option>
                    <option value="LEVES_VINCOS">Leves vincos nos cantos</option>
                    <option value="DANIFICADO">Embalagem com amassados</option>
                    <option value="SEM_EMBALAGEM">Sem embalagem original</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    {isPreOrder ? 'Cotas Disponíveis' : 'Estoque Físico'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerStock}
                    onChange={(e) => setOfferStock(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Bloco de Configurações Específicas de Pré-Venda */}
              {isPreOrder && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary" /> Condições da Pré-Venda
                    </span>
                    <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/20">
                      Módulo Pré-Venda Ativo
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Data Prevista de Chegada na Loja *
                    </label>
                    <input
                      type="date"
                      value={preOrderEstimatedArrival}
                      onChange={(e) => setPreOrderEstimatedArrival(e.target.value)}
                      className="h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Condições de Pagamento Oferecidas:
                    </span>

                    {/* Opção 1: Depósito / Sinal */}
                    <div className="p-3 rounded-lg bg-background/80 border border-border space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={allowDepositAndBalance}
                          onChange={(e) => setAllowDepositAndBalance(e.target.checked)}
                          className="h-4 w-4 rounded text-primary focus:ring-primary"
                        />
                        <span>Sinal de entrada e saldo na chegada da peça</span>
                      </label>
                      {allowDepositAndBalance && (
                        <div className="pl-6 pt-1 flex items-center gap-2">
                          <label className="text-[11px] text-muted-foreground">Valor do Sinal (R$):</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 50.00"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="h-8 w-36 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground"
                          />
                        </div>
                      )}
                    </div>

                    {/* Opção 2: Integral na chegada */}
                    <div className="p-3 rounded-lg bg-background/80 border border-border">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={allowFullOnArrival}
                          onChange={(e) => setAllowFullOnArrival(e.target.checked)}
                          className="h-4 w-4 rounded text-primary focus:ring-primary"
                        />
                        <span>Pagamento integral na chegada da miniatura</span>
                      </label>
                    </div>

                    {/* Opção 3: Parcelamento */}
                    <div className="p-4 rounded-2xl bg-card border-2 border-primary/30 shadow-md space-y-3.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-foreground select-none">
                          <input
                            type="checkbox"
                            checked={allowInstallments}
                            onChange={(e) => setAllowInstallments(e.target.checked)}
                            className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                          <span>3. Parcelamento programado com controle de vencimentos</span>
                        </label>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          01x a 10x
                        </span>
                      </div>

                      {allowInstallments && (
                        <div className="space-y-3 pt-1">
                          {/* Card de Configuração de Parcelas: Número, Vencimento 1ª Parcela e Valor 1ª Parcela */}
                          <div className="rounded-xl p-3.5 bg-muted/60 dark:bg-slate-900/80 border border-border/80 shadow-inner space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* 1. Quantidade de Parcelas */}
                              <div>
                                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                  <Layers className="h-3.5 w-3.5 text-primary" />
                                  <span>Qtd. de Parcelas</span>
                                </label>
                                <div className="relative">
                                  <select
                                    value={installmentsCount}
                                    onChange={(e) => setInstallmentsCount(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl bg-background border-2 border-slate-300 dark:border-slate-700 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-foreground shadow-sm cursor-pointer transition-colors"
                                  >
                                    <option value="1" className="bg-background text-foreground font-semibold">01x (Parcela única na reserva)</option>
                                    <option value="2" className="bg-background text-foreground font-semibold">02x</option>
                                    <option value="3" className="bg-background text-foreground font-semibold">03x</option>
                                    <option value="4" className="bg-background text-foreground font-semibold">04x</option>
                                    <option value="5" className="bg-background text-foreground font-semibold">05x</option>
                                    <option value="6" className="bg-background text-foreground font-semibold">06x</option>
                                    <option value="7" className="bg-background text-foreground font-semibold">07x</option>
                                    <option value="8" className="bg-background text-foreground font-semibold">08x</option>
                                    <option value="9" className="bg-background text-foreground font-semibold">09x</option>
                                    <option value="10" className="bg-background text-foreground font-semibold">10x</option>
                                  </select>
                                </div>
                              </div>

                              {/* 2. Vencimento da 1ª Parcela */}
                              <div>
                                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 mb-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-primary" />
                                  <span>Vencimento 1ª Parcela</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="date"
                                    value={firstDueDate}
                                    onChange={(e) => setFirstDueDate(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl bg-background border-2 border-slate-300 dark:border-slate-700 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-foreground shadow-sm transition-colors cursor-pointer"
                                    style={{ colorScheme: 'dark light' }}
                                  />
                                </div>
                              </div>

                              {/* 3. Valor da 1ª Parcela (Entrada) */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                                    <span>Valor 1ª Parcela</span>
                                  </label>
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase bg-secondary px-1.5 py-0.5 rounded">Opcional</span>
                                </div>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground select-none">
                                    R$
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={
                                      parsedPrice > 0
                                        ? (parsedPrice / parsedCount).toFixed(2)
                                        : 'Ex: 40.00'
                                    }
                                    value={customFirstInstallment}
                                    onChange={(e) => setCustomFirstInstallment(e.target.value)}
                                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border-2 border-slate-300 dark:border-slate-700 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-bold text-foreground placeholder:text-muted-foreground/60 shadow-sm transition-colors"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/80 border border-border text-[11px] text-muted-foreground">
                              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <p className="leading-snug">
                                As parcelas seguintes vencerão automaticamente no <strong>mesmo dia ({firstDueDate ? firstDueDate.split('-')[2] : '10'}) dos meses subsequentes</strong>. O saldo restante após a 1ª parcela é rateado com precisão de centavos.
                              </p>
                            </div>
                          </div>

                          {/* Aviso de erro se o valor da 1ª parcela for inválido */}
                          {isCustomFirstInvalid && (
                            <div className="p-2.5 rounded-xl bg-destructive/10 border-2 border-destructive/30 text-destructive text-xs flex items-center gap-2 font-medium">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <span>O valor da 1ª parcela deve ser menor que o valor total (R$ {parsedPrice.toFixed(2)}) para haver divisão nas parcelas seguintes.</span>
                            </div>
                          )}

                          {/* Tabela / Cronograma Visual das Parcelas */}
                          {parsedPrice > 0 && installmentSchedule.length > 0 && (
                            <div className="rounded-xl border-2 border-primary/30 bg-card p-3.5 space-y-2.5 shadow-sm">
                              <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  Cronograma Previsto de Vencimentos & Valores
                                </span>
                                <span className="text-[11px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  Total: R$ {parsedPrice.toFixed(2)}
                                </span>
                              </div>

                              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {installmentSchedule.map((inst) => (
                                  <div
                                    key={inst.installmentNumber}
                                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                                      inst.isFirst && installmentSchedule.length > 1
                                        ? 'bg-primary/15 border-2 border-primary/40 font-semibold shadow-sm'
                                        : 'bg-muted/60 dark:bg-slate-900/60 border border-border/80'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-black ${
                                        inst.isFirst && installmentSchedule.length > 1
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
                </div>
              )}

              {/* Observações / Descrição */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Observações para os Compradores (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Miniatura lacrada na caixa acrílica oficial. Envio com plástico bolha e caixa reforçada."
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!publishedOffer && (
          <div className="p-4 sm:p-5 border-t border-border bg-card/90 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted font-semibold text-xs border border-border transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={createOfferMutation.isPending || !offerPrice}
              onClick={() => createOfferMutation.mutate()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-glow transition-all disabled:opacity-50 cursor-pointer ${
                isPreOrder ? 'bg-primary hover:bg-primary-hover' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {createOfferMutation.isPending ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  {isPreOrder ? <Clock className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                  <span>{isPreOrder ? 'Publicar Pré-Venda' : 'Publicar Anúncio'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
