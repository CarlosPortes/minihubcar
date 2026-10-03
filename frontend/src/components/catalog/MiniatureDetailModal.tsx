'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  Info,
  X,
  Car,
  Building2,
  Sparkles,
  Package,
  Tag,
  Barcode,
  Calendar,
  Layers,
  MapPin,
  Pencil,
  Heart,
  Plus,
  ArrowRightLeft,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Store,
  Trash2,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

export interface VariationDetail {
  id: string;
  name: string;
  releaseYear: number | null;
  color: string | null;
  finish: string | null;
  packaging: string | null;
  edition: string | null;
  seriesNumber?: string | null;
  collectorNumber?: string | null;
  lineType?: string | null;
  rarity?: string | null;
  description: string | null;
  photoUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  casting: {
    id: string;
    name: string;
    description: string | null;
    fantasyFlag: boolean;
  };
  brand: {
    id: string;
    name: string;
  };
  series: {
    id: string;
    name: string;
  } | null;
  scale: {
    id: string;
    name: string;
  } | null;
  identifiers: Array<{
    id: string;
    code: string;
    isPrimary: boolean;
  }>;
  vehicles: Array<{
    modelId: string;
    modelName: string;
    automakerName: string;
    relationshipType: string;
  }>;
}

export interface ExemplarContext {
  id: string;
  status: string;
  condition?: {
    id?: string;
    code?: string;
    name: string;
  } | null;
  location?: {
    id?: string;
    name: string;
    locationType?: string | null;
    hasGrid?: boolean;
    gridRows?: number | null;
    gridColumns?: number | null;
    gridRow?: number | null;
    gridColumn?: number | null;
  } | null;
  acquisitionDate?: string | null;
  acquisitionCost?: number | null;
  purchasePrice?: string | number | null;
  purchaseLocation?: string | null;
  automaker?: { id: string; name: string } | null;
  vehicleModel?: { id: string; name: string } | null;
  series?: { id: string; name: string } | null;
  notes?: string | null;
  onMove?: () => void;
  onSell?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface WishlistContext {
  priority: number;
  notes?: string | null;
  isOwned?: boolean;
}

export function getRarityBadge(rarity: string | null | undefined) {
  if (!rarity || rarity === 'REGULAR') return null;
  if (rarity === 'STH') {
    return (
      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black tracking-wider shadow-sm flex items-center gap-1">
        ⭐ STH
      </span>
    );
  }
  if (rarity === 'TH') {
    return (
      <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] font-black tracking-wider shadow-sm flex items-center gap-1">
        🔥 TH
      </span>
    );
  }
  if (rarity === 'CHASE') {
    return (
      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black tracking-wider shadow-sm flex items-center gap-1">
        🎯 CHASE
      </span>
    );
  }
  if (rarity === 'RLC') {
    return (
      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-black tracking-wider shadow-sm flex items-center gap-1">
        💎 RLC
      </span>
    );
  }
  if (rarity === 'ZAMAC') {
    return (
      <span className="px-2 py-0.5 rounded-md bg-slate-300/20 text-slate-200 border border-slate-300/40 text-[10px] font-black tracking-wider shadow-sm flex items-center gap-1">
        ⚡ ZAMAC
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/40 text-[10px] font-black tracking-wider shadow-sm">
      {rarity}
    </span>
  );
}

interface MiniatureDetailModalProps {
  variationId: string | null;
  onClose: () => void;
  exemplarContext?: ExemplarContext | null;
  wishlistContext?: WishlistContext | null;
  isAdmin?: boolean;
  isSeller?: boolean;
  onEditVariation?: (variationId: string) => void;
  onAddToCollection?: (variation: VariationDetail) => void;
  onAddToWishlist?: (variationId: string) => void;
  onCreateOffer?: (variation: VariationDetail) => void;
  isInWishlist?: boolean;
}

export function MiniatureDetailModal({
  variationId,
  onClose,
  exemplarContext,
  wishlistContext,
  isAdmin = false,
  isSeller = false,
  onEditVariation,
  onAddToCollection,
  onAddToWishlist,
  onCreateOffer,
  isInWishlist = false,
}: MiniatureDetailModalProps) {
  const { data: detailData, isLoading: isLoadingDetail } = useQuery<{
    data: VariationDetail;
  }>({
    queryKey: ['catalog', 'detail', variationId],
    queryFn: () => apiClient(`/catalog/variations/${variationId}`),
    enabled: Boolean(variationId),
  });

  if (!variationId) return null;

  const detail = detailData?.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-card/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                {detail?.name || 'Detalhes da Miniatura'}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {exemplarContext
                  ? 'Exemplar em sua Coleção • Ficha Técnica Oficial'
                  : 'Ficha Técnica & Informações do Catálogo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && detail && onEditVariation && (
              <button
                onClick={() => {
                  onEditVariation(detail.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Editar Cadastro</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background/50">
          {isLoadingDetail ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
              Carregando dados cadastrais da miniatura...
            </div>
          ) : detail ? (
            <>
              {/* Photo & Main Highlights */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-full sm:w-56 aspect-4/3 rounded-xl bg-secondary overflow-hidden border border-border shrink-0 shadow-sm relative group">
                  <MiniatureImage
                    src={detail.photoUrl}
                    alt={detail.name}
                    containerClassName="w-full h-full bg-secondary flex items-center justify-center overflow-hidden"
                  />
                  {detail.scale && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-[10px] font-bold text-foreground border border-border">
                      {detail.scale.name}
                    </span>
                  )}
                  {detail.releaseYear && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-[10px] font-semibold text-muted-foreground border border-border flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" /> {detail.releaseYear}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg">
                      {detail.brand.name}
                    </span>
                    {getRarityBadge(detail.rarity)}
                    {detail.series && (
                      <span className="text-xs font-semibold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-lg">
                        {detail.series.name}
                      </span>
                    )}
                  </div>

                  <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                    {detail.name}
                  </h2>

                  {detail.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {detail.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Exemplar Context Highlight (Quando aberto da Coleção) */}
              {exemplarContext && (
                <div className="p-4 rounded-xl bg-secondary/40 border border-primary/30 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="h-4 w-4" /> Seu Exemplar na Coleção
                    </span>
                    {exemplarContext.status === 'SOLD' ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black">
                        VENDIDO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        ATIVO NA COLEÇÃO
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {/* Estado de Conservação */}
                    <div className="p-2.5 rounded-lg bg-card border border-border/80">
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        Estado de Conservação
                      </span>
                      <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                        <Tag className="h-3 w-3 text-primary" />
                        {exemplarContext.condition?.name || 'Não especificado'}
                      </span>
                    </div>

                    {/* Localização Física */}
                    <div className="p-2.5 rounded-lg bg-card border border-border/80">
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        Localização Física
                      </span>
                      <div className="font-semibold text-foreground mt-0.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-accent shrink-0" />
                          {exemplarContext.location?.name || 'Sem localização definida'}
                        </span>
                        {exemplarContext.location?.gridRow && exemplarContext.location?.gridColumn && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            L{exemplarContext.location.gridRow}:C{exemplarContext.location.gridColumn}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Valor de Compra */}
                    {(exemplarContext.purchasePrice != null || exemplarContext.acquisitionCost != null) && (
                      <div className="p-2.5 rounded-lg bg-card border border-border/80">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Valor Pago
                        </span>
                        <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-400" />
                          R$ {parseFloat(String(exemplarContext.purchasePrice ?? exemplarContext.acquisitionCost ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* Local de Compra */}
                    {exemplarContext.purchaseLocation && (
                      <div className="p-2.5 rounded-lg bg-card border border-border/80">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Local de Compra
                        </span>
                        <span className="font-semibold text-foreground mt-0.5 flex items-center gap-1 truncate">
                          <Store className="h-3 w-3 text-primary shrink-0" />
                          {exemplarContext.purchaseLocation}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notas ou Data de Aquisição */}
                  {(exemplarContext.notes || exemplarContext.acquisitionDate) && (
                    <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-xs text-muted-foreground">
                      {exemplarContext.acquisitionDate && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          Adquirido em: {new Date(exemplarContext.acquisitionDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {exemplarContext.notes && (
                        <span className="flex items-center gap-1 text-[11px] italic truncate">
                          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                          &ldquo;{exemplarContext.notes}&rdquo;
                        </span>
                      )}
                    </div>
                  )}

                  {/* Ações Rápidas do Exemplar */}
                  {exemplarContext.status === 'ACTIVE' && (
                    <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {exemplarContext.onEdit && (
                        <button
                          onClick={() => {
                            onClose();
                            exemplarContext.onEdit?.();
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-secondary text-foreground hover:bg-muted font-semibold text-xs border border-border transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 text-amber-400" />
                          <span>Editar</span>
                        </button>
                      )}
                      {exemplarContext.onMove && (
                        <button
                          onClick={() => {
                            onClose();
                            exemplarContext.onMove?.();
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-secondary text-foreground hover:bg-muted font-semibold text-xs border border-border transition-colors cursor-pointer"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
                          <span>Mover</span>
                        </button>
                      )}
                      {exemplarContext.onSell && (
                        <button
                          onClick={() => {
                            onClose();
                            exemplarContext.onSell?.();
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-secondary text-foreground hover:text-emerald-400 hover:bg-emerald-500/10 font-semibold text-xs border border-border transition-colors cursor-pointer"
                        >
                          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Vender</span>
                        </button>
                      )}
                      {exemplarContext.onDelete && (
                        <button
                          onClick={() => {
                            onClose();
                            exemplarContext.onDelete?.();
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-secondary text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 font-semibold text-xs border border-border transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Wishlist Context Highlight (Quando aberto da Wishlist) */}
              {wishlistContext && (
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" />
                    <span className="font-semibold text-foreground">Item da Wishlist</span>
                    <span className="text-muted-foreground">• Prioridade: {wishlistContext.priority}</span>
                  </div>
                  {wishlistContext.isOwned && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Já Possui na Coleção
                    </span>
                  )}
                </div>
              )}

              {/* Detailed Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Molde / Casting */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-accent" /> Molde Base (Casting)
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    {detail.casting.name}
                  </p>
                  {detail.casting.fantasyFlag && (
                    <span className="inline-block text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      Modelo Fantasia
                    </span>
                  )}
                </div>

                {/* Veículo Real */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-accent" /> Veículo Real
                  </span>
                  {exemplarContext?.automaker?.name ? (
                    <p className="text-xs font-semibold text-foreground">
                      {exemplarContext.automaker.name}{' '}
                      {exemplarContext.vehicleModel?.name ? `• ${exemplarContext.vehicleModel.name}` : ''}
                    </p>
                  ) : detail.vehicles && detail.vehicles.length > 0 ? (
                    <p className="text-xs font-semibold text-foreground">
                      {detail.vehicles[0]?.automakerName} {detail.vehicles[0]?.modelName}
                    </p>
                  ) : (detail.casting as any)?.automaker?.name ? (
                    <p className="text-xs font-semibold text-foreground">
                      {(detail.casting as any).automaker.name}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Não associado a veículo real
                    </p>
                  )}
                </div>

                {/* Cor & Acabamento */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Cor & Acabamento
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    {detail.color || 'Não especificada'}{' '}
                    {detail.finish ? `(${detail.finish})` : ''}
                  </p>
                </div>

                {/* Embalagem & Edição */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-accent" /> Embalagem & Edição
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    {detail.packaging || 'Padrão'}{' '}
                    {detail.edition ? `• ${detail.edition}` : ''}
                  </p>
                </div>

                {/* Dados de Colecionador & Série */}
                <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-2 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-accent" /> Classificação de Colecionador & Série
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                    <div className="bg-secondary/60 p-2 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Raridade</span>
                      <div className="mt-1 flex items-center">
                        {detail.rarity ? (
                          getRarityBadge(detail.rarity) || (
                            <span className="text-xs font-semibold">{detail.rarity}</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">Padrão / Regular</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-secondary/60 p-2 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Linha / Segmento</span>
                      <span className="text-xs font-semibold text-foreground mt-1 block truncate">
                        {detail.lineType || 'Não especificada'}
                      </span>
                    </div>
                    <div className="bg-secondary/60 p-2 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Número na Série</span>
                      <span className="text-xs font-semibold text-foreground mt-1 block">
                        {detail.seriesNumber || '-'}
                      </span>
                    </div>
                    <div className="bg-secondary/60 p-2 rounded-lg border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Cartela / Colecionador</span>
                      <span className="text-xs font-mono font-semibold text-foreground mt-1 block">
                        {detail.collectorNumber ? `#${detail.collectorNumber}` : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Identificadores / Códigos */}
                {detail.identifiers && detail.identifiers.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-card border border-border/80 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Barcode className="h-3.5 w-3.5 text-accent" /> Códigos do Produto (SKU / Barcode)
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {detail.identifiers.map((ident) => (
                        <span
                          key={ident.id}
                          className="text-xs font-mono font-bold text-foreground bg-secondary px-2.5 py-1 rounded-lg border border-border flex items-center gap-1.5"
                        >
                          <span>{ident.code}</span>
                          {ident.isPrimary && (
                            <span className="text-[9px] text-primary font-sans font-semibold uppercase">
                              Principal
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center">
              <AlertCircle className="h-8 w-8 text-destructive/60 mb-2" />
              Não foi possível carregar os detalhes desta miniatura.
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        {detail && (
          <div className="p-4 border-t border-border bg-card/95 flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted font-semibold text-xs border border-border order-2 sm:order-1 transition-colors"
            >
              Fechar
            </button>

            <div className="w-full sm:w-auto flex gap-2 order-1 sm:order-2">
              {isAdmin && onEditVariation && (
                <button
                  onClick={() => {
                    onEditVariation(detail.id);
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 font-bold text-xs transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Editar Cadastro</span>
                </button>
              )}

              {isSeller && onCreateOffer && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateOffer(detail);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Store className="h-4 w-4" />
                  <span>Anunciar / Pré-Venda</span>
                </button>
              )}

              {onAddToWishlist && (
                <button
                  onClick={() => onAddToWishlist(detail.id)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-secondary text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-border font-semibold text-xs transition-colors"
                >
                  <Heart className={`h-4 w-4 ${isInWishlist ? 'text-rose-500 fill-rose-500' : ''}`} />
                  <span>Wishlist</span>
                </button>
              )}

              {onAddToCollection && (
                <button
                  onClick={() => {
                    onClose();
                    onAddToCollection(detail);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary-hover shadow-glow transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar à Coleção</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
