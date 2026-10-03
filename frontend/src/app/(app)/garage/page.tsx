'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  garageApi,
  MyGarageResponse,
  SellerGarageGroup,
  GarageItemView,
  ShippingOption,
  ShippingQuoteResult,
} from '@/lib/api/garage';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import {
  Warehouse,
  Package,
  Store,
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Scale,
  Undo2,
  X,
  Search,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export default function MyGaragePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Selected seller and items for dispatch modal
  const [dispatchSeller, setDispatchSeller] = useState<SellerGarageGroup | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [customWeight, setCustomWeight] = useState<string>('');
  const [destinationZip, setDestinationZip] = useState<string>((user as any)?.postalCode || '');
  const [recipientName, setRecipientName] = useState<string>(user?.name || '');
  const [street, setStreet] = useState<string>((user as any)?.street || '');
  const [number, setNumber] = useState<string>((user as any)?.number || '');
  const [complement, setComplement] = useState<string>((user as any)?.complement || '');
  const [neighborhood, setNeighborhood] = useState<string>((user as any)?.neighborhood || '');
  const [city, setCity] = useState<string>((user as any)?.city || '');
  const [state, setState] = useState<string>((user as any)?.state || '');
  const [phone, setPhone] = useState<string>((user as any)?.whatsapp || (user as any)?.phone || '');

  // Shipping quote query state
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(true);
  const [quoteResult, setQuoteResult] = useState<ShippingQuoteResult | null>(null);
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption | null>(null);
  const [isQuoting, setIsQuoting] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Item cancellation modal state
  const [cancellingItem, setCancellingItem] = useState<GarageItemView | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // 1. Garage query
  const { data: garageData, isLoading, refetch } = useQuery({
    queryKey: ['my-garage', user?.id],
    queryFn: () => garageApi.getMyGarage(),
    enabled: !!user?.id,
  });

  // Calculate selected miniatures declared total value
  const selectedDeclaredValue = useMemo(() => {
    if (!dispatchSeller) return 0;
    return dispatchSeller.items
      .filter((it) => selectedItemIds.includes(it.id))
      .reduce((acc, it) => acc + it.totalPrice, 0);
  }, [dispatchSeller, selectedItemIds]);

  // Cancel item mutation
  const cancelMutation = useMutation({
    mutationFn: ({ orderItemId, reason }: { orderItemId: string; reason?: string }) =>
      garageApi.cancelGarageItem(orderItemId, reason),
    onSuccess: () => {
      setCancellingItem(null);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: ['my-garage'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-search'] });
    },
  });

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: (payload: any) => garageApi.dispatchGarage(payload),
    onSuccess: () => {
      setDispatchSeller(null);
      setQuoteResult(null);
      setSelectedShippingOption(null);
      queryClient.invalidateQueries({ queryKey: ['my-garage'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
  });

  // Auto-fill address via ViaCEP
  const handleZipBlur = async () => {
    const cleanZip = destinationZip.replace(/\D/g, '');
    if (cleanZip.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
        const json = await res.json();
        if (!json.erro) {
          if (json.logradouro) setStreet(json.logradouro);
          if (json.bairro) setNeighborhood(json.bairro);
          if (json.localidade) setCity(json.localidade);
          if (json.uf) setState(json.uf);
        }
      } catch (e) {
        console.error('ViaCEP lookup failed', e);
      }
    }
  };

  // Open dispatch modal for a seller
  const openDispatchModal = (sellerGroup: SellerGarageGroup) => {
    setDispatchSeller(sellerGroup);
    // Select all ready items by default
    const readyIds = sellerGroup.items.filter((it) => it.canDispatch).map((it) => it.id);
    setSelectedItemIds(readyIds);
    setCustomWeight('');
    setIncludeInsurance(true);
    setQuoteResult(null);
    setSelectedShippingOption(null);
    setQuoteError(null);
  };

  // Trigger real-time shipping quote
  const calculateShipping = async () => {
    if (!dispatchSeller || selectedItemIds.length === 0) return;
    const cleanZip = destinationZip.replace(/\D/g, '');
    if (cleanZip.length < 8) {
      setQuoteError('Informe um CEP de destino válido (8 dígitos)');
      return;
    }

    setIsQuoting(true);
    setQuoteError(null);
    try {
      const res = await garageApi.getShippingQuote({
        sellerId: dispatchSeller.sellerId,
        itemIds: selectedItemIds,
        destinationZip: cleanZip,
        customWeightGrams: customWeight ? parseInt(customWeight, 10) : undefined,
        includeInsurance,
      });
      setQuoteResult(res);
      if (res.options.length > 0) {
        setSelectedShippingOption(res.options[0]); // default to lowest/first option
      }
    } catch (err: any) {
      setQuoteError(err.message || 'Falha ao cotar frete. Verifique o CEP informado.');
    } finally {
      setIsQuoting(false);
    }
  };

  const handleConfirmDispatch = () => {
    if (!dispatchSeller || !selectedShippingOption) return;
    if (!recipientName || !street || !number || !city || !state || !destinationZip) {
      alert('Preencha todos os campos obrigatórios do endereço de entrega.');
      return;
    }

    dispatchMutation.mutate({
      sellerId: dispatchSeller.sellerId,
      itemIds: selectedItemIds,
      customWeightGrams: customWeight ? parseInt(customWeight, 10) : undefined,
      includeInsurance,
      insuranceAmount: includeInsurance ? (selectedShippingOption.insuranceCost || 0) : 0,
      shippingMethod: {
        carrier: selectedShippingOption.carrier,
        serviceName: selectedShippingOption.serviceName,
        price: selectedShippingOption.price,
        basePrice: selectedShippingOption.basePrice,
        insuranceCost: selectedShippingOption.insuranceCost,
        deliveryDays: selectedShippingOption.deliveryDays,
      },
      shippingAddress: {
        recipientName,
        postalCode: destinationZip,
        street,
        number,
        complement: complement || undefined,
        neighborhood,
        city,
        state,
        phone: phone || undefined,
      },
    });
  };

  const sellers = garageData?.sellers || [];
  const summary = garageData?.summary || {
    totalItems: 0,
    totalValue: 0,
    totalSellers: 0,
    readyForDispatchCount: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500/20 via-primary/10 to-card border border-purple-500/30 p-6 md:p-8">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/30">
            <Warehouse className="h-4 w-4" /> Armário Virtual & Consolidação de Envios
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            Minha Garagem do Colecionador
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Suas miniaturas adquiridas ficam guardadas com segurança no estoque dos vendedores parceiros.
            Junte vários itens de uma mesma loja ao longo do tempo e solicite um único envio com frete consolidado.
          </p>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total na Garagem</span>
            <Package className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-foreground">{summary.totalItems}</p>
          <span className="text-[10px] text-muted-foreground">peça(s) armazenada(s)</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Lojas Diferentes</span>
            <Store className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-foreground">{summary.totalSellers}</p>
          <span className="text-[10px] text-muted-foreground">origens de despacho</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Valor em Garagem</span>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-500">
            R$ {summary.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-muted-foreground">patrimônio guardado</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Prontas p/ Envio</span>
            <Truck className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-500">{summary.readyForDispatchCount}</p>
          <span className="text-[10px] text-muted-foreground">disponíveis agora</span>
        </div>
      </div>

      {/* Main Content: Sellers with Garage Items */}
      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground text-sm space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p>Carregando sua Garagem...</p>
        </div>
      ) : sellers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Warehouse className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-foreground">Sua garagem está vazia</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ao comprar miniaturas no Marketplace ou participar de Pré-Vendas, selecione a opção
              <strong className="text-foreground"> "Na Garagem"</strong> no carrinho para acumular miniaturas e consolidar fretes.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-glow hover:bg-primary/90 transition-all"
          >
            Explorar Marketplace <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sellers.map((sellerGroup) => (
            <div
              key={sellerGroup.sellerId}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all"
            >
              {/* Seller Header */}
              <div className="p-4 md:p-5 bg-secondary/30 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                      <Store className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        {sellerGroup.storeName}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({sellerGroup.totalItems} miniatura{sellerGroup.totalItems > 1 ? 's' : ''})
                        </span>
                      </h2>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        Origem: {sellerGroup.city || 'Cidade'}, {sellerGroup.state || 'UF'}{' '}
                        {sellerGroup.postalCode && `(CEP: ${sellerGroup.postalCode})`}
                        {sellerGroup.dispatchAddressLabel && (
                          <span className="text-foreground font-semibold"> • {sellerGroup.dispatchAddressLabel}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Subtotal Loja</span>
                    <span className="text-base font-black text-foreground">
                      R$ {sellerGroup.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <button
                    onClick={() => openDispatchModal(sellerGroup)}
                    disabled={sellerGroup.readyForDispatchCount === 0}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      sellerGroup.readyForDispatchCount === 0
                        ? 'Nenhum item desta loja está pronto para despacho no momento'
                        : 'Calcular frete e solicitar envio consolidado'
                    }
                  >
                    <Truck className="h-4 w-4" />
                    Despachar ({sellerGroup.readyForDispatchCount})
                  </button>
                </div>
              </div>

              {/* Items Grid */}
              <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellerGroup.items.map((item) => {
                  const isInGarage = item.fulfillmentStatus === 'NA_GARAGEM';
                  const isAwaitingShipment = item.fulfillmentStatus === 'AGUARDANDO_ENVIO';

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/80 bg-background/60 p-3.5 flex flex-col justify-between gap-3 hover:border-purple-500/40 transition-all relative group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 rounded-lg bg-secondary shrink-0 overflow-hidden border border-border flex items-center justify-center">
                            {item.photoUrl ? (
                              <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block truncate">
                              {item.brandName} • {item.scaleName}
                            </span>
                            <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                              {item.title}
                            </h4>
                            <p className="text-xs font-black text-primary pt-0.5">
                              R$ {item.unitPrice.toFixed(2)}{' '}
                              {item.quantity > 1 && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({item.quantity}x = R$ {item.totalPrice.toFixed(2)})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {item.sourceType === 'PRE_ORDER' ? (
                            item.hasArrived ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Pré-Venda Chegou
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Pré-Venda em Trânsito
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Pronta Entrega
                            </span>
                          )}

                          {isInGarage ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                              <Warehouse className="h-2.5 w-2.5" /> Na Garagem
                            </span>
                          ) : isAwaitingShipment ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Truck className="h-2.5 w-2.5" /> Despacho Solicitado
                            </span>
                          ) : null}

                          <span className="px-2 py-0.5 rounded-full text-[10px] text-muted-foreground bg-secondary/80 border border-border flex items-center gap-1">
                            <Scale className="h-2.5 w-2.5" />
                            {item.packageWeightGrams ? `${item.packageWeightGrams}g` : '150g padrão'}
                          </span>
                        </div>
                      </div>

                      {/* Item Footer Actions */}
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </span>

                        {item.canCancel && (
                          <button
                            onClick={() => setCancellingItem(item)}
                            className="inline-flex items-center gap-1 text-[11px] text-destructive hover:text-destructive/80 font-semibold transition-colors"
                            title="Cancelar compra e tirar da garagem (a oferta volta ao Marketplace)"
                          >
                            <Undo2 className="h-3 w-3" /> Cancelar Compra
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: CANCEL COMPRA / REMOVER DA GARAGEM */}
      {cancellingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <AlertTriangle className="h-4 w-4" /> Cancelar Compra na Garagem
              </div>
              <button
                onClick={() => setCancellingItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                Você está solicitando o cancelamento do item:
              </p>
              <div className="p-3 rounded-xl bg-background border border-border flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                  {cancellingItem.photoUrl ? (
                    <img src={cancellingItem.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground line-clamp-1">{cancellingItem.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Valor: R$ {cancellingItem.totalPrice.toFixed(2)} • Qtd: {cancellingItem.quantity}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 space-y-1">
                <p className="font-bold">O que acontece ao confirmar:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>O item sai da sua Garagem imediatamente.</li>
                  <li>O estoque físico é devolvido ao vendedor.</li>
                  <li>O anúncio da miniatura volta a ficar <strong className="text-white">Ativo</strong> para novos compradores no Marketplace.</li>
                </ul>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Motivo do cancelamento (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Desisti antes do despacho / Comprei por engano"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {cancelMutation.error && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {(cancelMutation.error as any).message || 'Erro ao cancelar item.'}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground border border-border"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    orderItemId: cancellingItem.id,
                    reason: cancelReason || undefined,
                  })
                }
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DESPACHAR GARAGEM & COTAÇÃO DE FRETE */}
      {dispatchSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Truck className="h-5 w-5 text-purple-400" />
                  Despachar Garagem: {dispatchSeller.storeName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Selecione as miniaturas, ajuste o peso da embalagem se necessário e escolha a opção de frete.
                </p>
              </div>
              <button
                onClick={() => setDispatchSeller(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step 1: Select items to ship */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">1. Miniaturas a despachar:</span>
                <span className="text-muted-foreground">
                  {selectedItemIds.length} selecionada(s)
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border bg-background/50 p-2 space-y-1">
                {dispatchSeller.items
                  .filter((it) => it.canDispatch)
                  .map((it) => {
                    const isSelected = selectedItemIds.includes(it.id);

                    return (
                      <label
                        key={it.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItemIds([...selectedItemIds, it.id]);
                            } else {
                              setSelectedItemIds(selectedItemIds.filter((id) => id !== it.id));
                            }
                            setQuoteResult(null);
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                        />
                        <div className="h-8 w-8 rounded bg-secondary shrink-0 overflow-hidden border border-border flex items-center justify-center">
                          {it.photoUrl ? (
                            <img src={it.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground line-clamp-1">{it.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {it.brandName} • R$ {it.totalPrice.toFixed(2)} •{' '}
                            {it.packageWeightGrams ? `${it.packageWeightGrams}g` : '150g padrão'}
                          </p>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Step 2: Weight adjustment option */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-purple-400" /> Peso Total da Embalagem
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Cálculo automático inteligente por miniatura
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  placeholder="Ex: 500 (deixe em branco para usar o peso calculado)"
                  value={customWeight}
                  onChange={(e) => {
                    setCustomWeight(e.target.value);
                    setQuoteResult(null);
                  }}
                  className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">gramas</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                * O sistema calcula a soma dos pesos das miniaturas selecionadas mais a tara da caixa. Caso queira, informe um peso customizado acima.
              </p>
            </div>

            {/* Step 3: Freight Insurance / Declared Value */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> 3. Seguro de Carga / Valor Declarado
                </span>
                <span className="text-[11px] font-bold text-emerald-400">
                  Valor Declarado: R$ {selectedDeclaredValue.toFixed(2)}
                </span>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includeInsurance}
                  onChange={(e) => {
                    setIncludeInsurance(e.target.checked);
                    setQuoteResult(null);
                    setSelectedShippingOption(null);
                  }}
                  className="mt-0.5 rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground">
                    Proteger envio com seguro de carga (Recomendado)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Garante indenização de 100% do valor das peças em casos de extravio, roubo ou avarias durante o transporte (Correios / Jadlog).
                  </p>
                </div>
              </label>
            </div>

            {/* Step 4: Destination Address */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" /> 4. Endereço de Entrega
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Nome Completo do Destinatário *"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="CEP *"
                    value={destinationZip}
                    onChange={(e) => setDestinationZip(e.target.value)}
                    onBlur={handleZipBlur}
                    className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Rua / Logradouro *"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="col-span-2 h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Número *"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Bairro *"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Cidade *"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="UF *"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Step 5: Shipping Quotation CTA */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">5. Opções de Frete Disponíveis</span>
                <button
                  type="button"
                  disabled={isQuoting || selectedItemIds.length === 0}
                  onClick={calculateShipping}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  <Search className="h-3.5 w-3.5" />
                  {isQuoting ? 'Cotando...' : 'Calcular Frete em Tempo Real'}
                </button>
              </div>

              {quoteError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {quoteError}
                </div>
              )}

              {/* Quotation Results Cards */}
              {quoteResult && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between px-1">
                    <span>
                      Origem: {quoteResult.originCity}/{quoteResult.originState} ({quoteResult.originPostalCode})
                    </span>
                    <span>
                      Peso final: {quoteResult.package.weightGrams}g ({quoteResult.package.weightKg}kg)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {quoteResult.options.map((opt) => {
                      const isSelected = selectedShippingOption?.id === opt.id;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => setSelectedShippingOption(opt)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/10 shadow-sm'
                              : 'border-border bg-background/80 hover:border-purple-500/30'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-foreground">
                                {opt.carrier} {opt.serviceName}
                              </span>
                              {opt.badge && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary">
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Prazo: {opt.deliveryEstimate}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-foreground">
                              R$ {opt.price.toFixed(2)}
                            </span>
                            {includeInsurance && opt.insuranceCost && opt.insuranceCost > 0 ? (
                              <p className="text-[10px] text-emerald-500 font-medium">
                                Frete: R$ {opt.basePrice?.toFixed(2)} + Seg: R$ {opt.insuranceCost.toFixed(2)}
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                Sem seguro
                              </p>
                            )}
                            <div className="h-4 w-4 ml-auto mt-1 rounded-full border flex items-center justify-center border-purple-500">
                              {isSelected && <div className="h-2 w-2 rounded-full bg-purple-500" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setDispatchSeller(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground border border-border"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  !selectedShippingOption ||
                  dispatchMutation.isPending ||
                  selectedItemIds.length === 0
                }
                onClick={handleConfirmDispatch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                {dispatchMutation.isPending
                  ? 'Confirmando Despacho...'
                  : selectedShippingOption
                  ? `Confirmar Despacho (R$ ${selectedShippingOption.price.toFixed(2)}${includeInsurance ? ' c/ Seguro' : ''})`
                  : 'Selecione uma opção de frete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
