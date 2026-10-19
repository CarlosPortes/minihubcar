'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import { getRarityBadge } from '@/components/catalog/MiniatureDetailModal';
import { commercialApi } from '@/lib/api/commercial';
import {
  Car,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Barcode,
  Share2,
  Check,
  Heart,
  Plus,
  Store,
  ChevronLeft,
  Tag,
  Package,
  ShieldCheck,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface VariationData {
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
  casting: {
    id: string;
    name: string;
    description: string | null;
    fantasyFlag: boolean;
    automakerId: string | null;
  };
  brand: {
    id: string;
    name: string;
  };
  series?: {
    id: string;
    name: string;
  } | null;
  scale?: {
    id: string;
    name: string;
  } | null;
  identifiers?: Array<{
    id: string;
    code: string;
    isPrimary: boolean;
  }>;
  vehicles?: Array<{
    automaker: { id: string; name: string };
    vehicleModel: { id: string; name: string };
  }>;
}

interface Props {
  initialData: VariationData;
}

export function MiniatureDetailPageClient({ initialData }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [addedToCollectionSuccess, setAddedToCollectionSuccess] = useState(false);
  const [addedToWishlistSuccess, setAddedToWishlistSuccess] = useState(false);

  // Fetch variation fresh data
  const { data: variation = initialData } = useQuery({
    queryKey: ['catalog-variation', initialData.id],
    queryFn: async () => {
      const res = await apiClient<{ data: VariationData }>(`/catalog/variations/${initialData.id}`);
      return res.data;
    },
    initialData,
  });

  // Fetch Marketplace Offers for this variation
  const { data: offersData } = useQuery({
    queryKey: ['variation-offers', variation.id],
    queryFn: () => commercialApi.getVariationOffers(variation.id),
  });

  const offers = offersData?.offers || [];

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Add to collection mutation
  const addToCollectionMutation = useMutation({
    mutationFn: async () => {
      return apiClient('/collection', {
        method: 'POST',
        body: JSON.stringify({
          variationId: variation.id,
          conditionCode: 'MINT',
          status: 'ACTIVE',
        }),
      });
    },
    onSuccess: () => {
      setAddedToCollectionSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      setTimeout(() => setAddedToCollectionSuccess(false), 4000);
    },
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      return apiClient('/wishlist', {
        method: 'POST',
        body: JSON.stringify({
          variationId: variation.id,
          priority: 3,
        }),
      });
    },
    onSuccess: () => {
      setAddedToWishlistSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      setTimeout(() => setAddedToWishlistSuccess(false), 4000);
    },
  });

  const automakerName =
    variation.vehicles?.[0]?.automaker?.name ||
    (variation.casting?.fantasyFlag ? 'Casting Fantasia / Fictício' : 'Geral');

  const vehicleModelName = variation.vehicles?.[0]?.vehicleModel?.name;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar ao Catálogo Geral
        </Link>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/80 border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-all shadow-sm"
          title="Copiar link desta miniatura para compartilhar"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-bold">Link Copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-primary" />
              <span>Compartilhar</span>
            </>
          )}
        </button>
      </div>

      {/* Main Showcase Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* Left Column: Big Image Display */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-full aspect-square max-w-[420px] rounded-2xl bg-secondary/40 border border-border/80 p-6 flex items-center justify-center overflow-hidden shadow-inner group">
            <MiniatureImage
              src={variation.photoUrl}
              alt={variation.name}
              className="max-h-full max-w-full object-contain filter drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
            />
            {variation.rarity && (
              <div className="absolute top-3 left-3">
                {getRarityBadge(variation.rarity)}
              </div>
            )}
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md text-[11px] font-bold text-foreground border border-border/60 shadow-sm">
                {variation.scale?.name || '1:64'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            Foto oficial catalogada no acervo do MiniHub Car
          </p>
        </div>

        {/* Right Column: Title, Metadata, Specifications & Actions */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            {/* Top Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary border border-primary/20">
                <Car className="h-3.5 w-3.5" /> {variation.brand?.name}
              </span>
              {variation.series?.name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-3 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">
                  <Layers className="h-3.5 w-3.5" /> {variation.series.name}
                  {variation.seriesNumber && ` #${variation.seriesNumber}`}
                </span>
              )}
              {variation.releaseYear && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border/60">
                  <Calendar className="h-3 w-3" /> {variation.releaseYear}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
              {variation.name}
            </h1>

            {/* Subtitle / Casting & Automaker */}
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground">Casting:</span> {variation.casting?.name}
              {automakerName && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="inline-flex items-center gap-1 text-foreground/90 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {automakerName} {vehicleModelName ? `(${vehicleModelName})` : ''}
                  </span>
                </>
              )}
            </p>

            {/* Technical Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-6">
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Cor
                </span>
                <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                  {variation.color || 'Não informada'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Acabamento
                </span>
                <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                  {variation.finish || 'Padrão'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Embalagem
                </span>
                <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                  {variation.packaging || variation.lineType || 'Blister'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Colecionador Nº
                </span>
                <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                  {variation.collectorNumber || '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Série Nº
                </span>
                <span className="text-xs font-semibold text-foreground truncate block mt-0.5">
                  {variation.seriesNumber ? `#${variation.seriesNumber}` : '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Código / Toy #
                </span>
                <span className="text-xs font-mono font-semibold text-foreground truncate block mt-0.5">
                  {variation.identifiers?.[0]?.code || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs for Collectors */}
          <div className="space-y-3 pt-4 border-t border-border">
            {addedToCollectionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Exemplar adicionado à sua coleção com sucesso!
              </div>
            )}
            {addedToWishlistSuccess && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Item adicionado à sua Lista de Desejos!
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {user ? (
                <>
                  <button
                    onClick={() => addToCollectionMutation.mutate()}
                    disabled={addToCollectionMutation.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {addToCollectionMutation.isPending
                      ? 'Adicionando...'
                      : '+ Tenho na Coleção'}
                  </button>

                  <button
                    onClick={() => addToWishlistMutation.mutate()}
                    disabled={addToWishlistMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500 hover:text-white transition-all shadow-sm disabled:opacity-50"
                  >
                    <Heart className="h-4 w-4" />
                    {addToWishlistMutation.isPending ? 'Salvando...' : 'Desejo'}
                  </button>
                </>
              ) : (
                <Link
                  href={`/login?redirect=/catalog/${variation.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Cadastre-se para Salvar na Coleção
                </Link>
              )}

              {offers.length > 0 && (
                <Link
                  href={`/marketplace/${variation.id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs hover:bg-amber-500 hover:text-black transition-all shadow-sm"
                >
                  <Store className="h-4 w-4" />
                  {offers.length} {offers.length === 1 ? 'Oferta Disponível' : 'Ofertas no Marketplace'}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Marketplace Offers Banner / Table (if offers exist) */}
      {offers.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Store className="h-5 w-5 text-amber-500" /> Vendedores com esta miniatura à venda
              </h2>
              <p className="text-xs text-muted-foreground">
                Encontre exemplares novos e lacrados de lojas e colecionadores homologados
              </p>
            </div>
            <Link
              href={`/marketplace/${variation.id}`}
              className="text-xs font-bold text-primary hover:underline"
            >
              Ver todas as ofertas →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {offers.slice(0, 3).map((offer) => (
              <div
                key={offer.id}
                className="p-4 rounded-xl bg-secondary/40 border border-border flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground truncate">
                      {offer.seller?.storeName || 'Loja Homologada'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                      {offer.condition}
                    </span>
                  </div>
                  <div className="text-lg font-black text-emerald-500">
                    R$ {parseFloat(offer.price).toFixed(2).replace('.', ',')}
                  </div>
                </div>

                <Link
                  href={`/marketplace/${variation.id}`}
                  className="w-full text-center py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-bold text-xs hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  Ver Detalhes & Comprar
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
