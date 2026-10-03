'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  Search,
  Filter,
  Car,
  Layers,
  Heart,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  MapPin,
  DollarSign,
  Info,
  Tag,
  Building2,
  Barcode,
  Package,
  Sparkles,
  LayoutGrid,
  Calendar,
  Pencil,
  RotateCcw,
  Store,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import { EditCatalogModal } from './EditCatalogModal';
import { MiniatureDetailModal } from '@/components/catalog/MiniatureDetailModal';
import { CatalogCreateOfferModal } from './CatalogCreateOfferModal';
import { commercialApi } from '@/lib/api/commercial';
import { QuickCreateMiniatureModal } from '@/components/seller/QuickCreateMiniatureModal';
import { useTranslation } from '@/i18n';

interface Variation {
  id: string;
  name: string;
  releaseYear: number | null;
  color: string | null;
  packaging?: string | null;
  photoUrl: string | null;
  seriesNumber?: string | null;
  collectorNumber?: string | null;
  lineType?: string | null;
  rarity?: string | null;
  casting: { id: string; name: string };
  brand: { id: string; name: string };
  series: { id: string; name: string } | null;
  scale: { id: string; name: string } | null;
}

interface VariationDetail {
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

function getRarityBadge(rarity: string | null | undefined) {
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

interface CatalogResponse {
  data: Variation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function CatalogPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedRarity, setSelectedRarity] = useState<string>('');
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [page, setPage] = useState(1);

  // Detail Modal State (Ficha Técnica)
  const [detailVariationId, setDetailVariationId] = useState<string | null>(null);

  // Edit Modal State (Admin)
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);


  // Seller Profile & Authorization Check
  const { data: profileRes } = useQuery({
    queryKey: ['my-seller-profile'],
    queryFn: () => commercialApi.getMySellerProfile(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
  const isSeller = profileRes?.data?.authorizationStatus === 'APPROVED';

  // Modal State for Seller Offer / Pre-Order Creation
  const [sellingVariation, setSellingVariation] = useState<Variation | null>(null);
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);

  // Modal State for adding to Collection
  const [modalVariation, setModalVariation] = useState<Variation | null>(null);
  const [conditionCode, setConditionCode] = useState('MINT');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedGridRow, setSelectedGridRow] = useState<number | ''>('');
  const [selectedGridColumn, setSelectedGridColumn] = useState<number | ''>('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch filter options
  const { data: filtersData } = useQuery<{
    data: {
      brands: Array<{ id: string; name: string }>;
      scales: Array<{ id: string; name: string }>;
      years: number[];
      rarities: string[];
      series: Array<{ id: string; name: string; brandId: string }>;
      automakers?: Array<{ id: string; name: string }>;
    };
  }>({
    queryKey: ['catalog', 'filters', { brandId: selectedBrand }],
    queryFn: () =>
      apiClient('/catalog/filters', {
        params: { brandId: selectedBrand || undefined },
      }),
  });

  // Fetch locations for user
  const { data: locationsData } = useQuery<{
    data: {
      list: Array<{
        id: string;
        name: string;
        hasGrid?: boolean;
        gridRows?: number | null;
        gridColumns?: number | null;
      }>;
    };
  }>({
    queryKey: ['locations', 'list'],
    queryFn: () => apiClient('/locations'),
    enabled: isAuthenticated,
  });

  // Fetch catalog search
  const { data: catalogData, isLoading } = useQuery<CatalogResponse>({
    queryKey: [
      'catalog',
      'search',
      {
        q: searchTerm,
        brandId: selectedBrand,
        scaleId: selectedScale,
        year: selectedYear,
        rarity: selectedRarity,
        seriesId: selectedSeries,
        page,
      },
    ],
    queryFn: () =>
      apiClient<CatalogResponse>('/catalog/search', {
        params: {
          q: searchTerm.trim() || undefined,
          brandId: selectedBrand || undefined,
          scaleId: selectedScale || undefined,
          year: selectedYear ? Number(selectedYear) : undefined,
          rarity: selectedRarity || undefined,
          seriesId: selectedSeries || undefined,
          page,
          pageSize: 20,
        },
      }),
  });



  // Mutation: Add to collection
  const addCollectionMutation = useMutation({
    mutationFn: (body: any) =>
      apiClient('/collection/exemplars', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['acquisitions'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['writeOffs'] });
      setModalVariation(null);
      setSelectedLocationId('');
      setSelectedGridRow('');
      setSelectedGridColumn('');
      setAcquisitionCost('');
      setPurchaseLocation('');
      setActionSuccess(t('catalog.addToCollectionSuccess'));
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: any) => {
      alert(err.message || 'Erro ao adicionar exemplar à coleção');
    },
  });

  // Mutation: Add to wishlist
  const addWishlistMutation = useMutation({
    mutationFn: (variationId: string) =>
      apiClient('/wishlist', {
        method: 'POST',
        body: JSON.stringify({ variationId, priority: 1 }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setActionSuccess(t('catalog.addToWishlistSuccess'));
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: any) => {
      alert(err.message || 'Erro ao adicionar à Wishlist');
    },
  });

  const handleAddToCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVariation) return;

    addCollectionMutation.mutate({
      variationId: modalVariation.id,
      conditionCode,
      locationId: selectedLocationId || undefined,
      gridRow: selectedGridRow ? Number(selectedGridRow) : undefined,
      gridColumn: selectedGridColumn ? Number(selectedGridColumn) : undefined,
      cost: acquisitionCost ? parseFloat(acquisitionCost) : undefined,
      sourceName: purchaseLocation.trim() || undefined,
      acquisitionDate: new Date().toISOString().split('T')[0],
      acquisitionType: 'PURCHASE',
    });
  };

  const selectedLoc = locationsData?.data?.list?.find((l) => l.id === selectedLocationId);

  const hasActiveFilters = Boolean(
    searchTerm || selectedBrand || selectedScale || selectedYear || selectedRarity || selectedSeries
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedBrand('');
    setSelectedScale('');
    setSelectedYear('');
    setSelectedRarity('');
    setSelectedSeries('');
    setPage(1);
  };

  const activeBrandName = filtersData?.data?.brands?.find((b) => b.id === selectedBrand)?.name;
  const activeScaleName = filtersData?.data?.scales?.find((s) => s.id === selectedScale)?.name;
  const activeSeriesName = filtersData?.data?.series?.find((s) => s.id === selectedSeries)?.name;

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t('catalog.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t('catalog.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {catalogData?.pagination && (
            <div className="flex items-center gap-2 self-start text-xs font-semibold px-3 py-1.5 rounded-xl bg-card border border-border text-muted-foreground">
              <Car className="h-4 w-4 text-primary" />
              <span>{t('catalog.catalogedMiniatures', { count: catalogData.pagination.total })}</span>
            </div>
          )}
          {isSeller && (
            <button
              onClick={() => setShowQuickCreateModal(true)}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow transition-all"
            >
              <Plus className="h-4 w-4" /> {t('catalog.addNewMiniature')}
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Filter & Search Section */}
      <div className="space-y-3 bg-card/60 p-4 rounded-2xl border border-border">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('catalog.catalogSearchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPage(1);
              }}
              title={t('catalog.clearSearch')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Brand Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              {t('catalog.filterByBrand')}
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setSelectedSeries('');
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">{t('catalog.allBrands')}</option>
              {filtersData?.data?.brands?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Release Year Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              {t('catalog.filterByYear')}
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">{t('catalog.allYears')}</option>
              {filtersData?.data?.years?.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Series Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              {t('catalog.filterBySeries')}
            </label>
            <select
              value={selectedSeries}
              onChange={(e) => {
                setSelectedSeries(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">{t('catalog.allSeries')}</option>
              {filtersData?.data?.series?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rarity Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              {t('catalog.filterByRarity')}
            </label>
            <select
              value={selectedRarity}
              onChange={(e) => {
                setSelectedRarity(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">{t('catalog.allRarities')}</option>
              {filtersData?.data?.rarities?.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Scale Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              {t('catalog.filterByScale')}
            </label>
            <select
              value={selectedScale}
              onChange={(e) => {
                setSelectedScale(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">{t('catalog.allScales')}</option>
              {filtersData?.data?.scales?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Filtros ativos:
            </span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                Busca: &ldquo;{searchTerm}&rdquo;
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPage(1);
                  }}
                  className="hover:text-primary-foreground hover:bg-primary rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedBrand && activeBrandName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                Marca: {activeBrandName}
                <button
                  onClick={() => {
                    setSelectedBrand('');
                    setPage(1);
                  }}
                  className="hover:text-destructive rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedYear && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                Ano: {selectedYear}
                <button
                  onClick={() => {
                    setSelectedYear('');
                    setPage(1);
                  }}
                  className="hover:text-destructive rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedSeries && activeSeriesName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                Série: {activeSeriesName}
                <button
                  onClick={() => {
                    setSelectedSeries('');
                    setPage(1);
                  }}
                  className="hover:text-destructive rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedRarity && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                Raridade: {selectedRarity}
                <button
                  onClick={() => {
                    setSelectedRarity('');
                    setPage(1);
                  }}
                  className="hover:text-destructive rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedScale && activeScaleName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-medium">
                Escala: {activeScaleName}
                <button
                  onClick={() => {
                    setSelectedScale('');
                    setPage(1);
                  }}
                  className="hover:text-destructive rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              onClick={handleClearFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 px-2 rounded-md hover:bg-secondary transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {t('common.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Miniatures Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-card/60 animate-pulse border border-border" />
          ))}
        </div>
      ) : !catalogData?.data || catalogData.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-card border border-border">
          <Car className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">{t('catalog.noResults')}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {t('catalog.noResultsDesc')}
          </p>
          {isSeller && (
            <div className="mt-4 p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 max-w-md mx-auto text-center space-y-2">
              <p className="text-xs font-semibold text-foreground">
                É uma miniatura ou lançamento que ainda não está cadastrado?
              </p>
              <p className="text-[11px] text-muted-foreground">
                Como vendedor homologado, você pode cadastrá-la agora mesmo e já anunciar em pré-venda ou pronta entrega.
              </p>
              <button
                type="button"
                onClick={() => setShowQuickCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary-hover transition-all"
              >
                <Plus className="h-4 w-4" />
                Cadastrar {searchTerm ? `"${searchTerm}"` : 'Nova Miniatura'}
              </button>
            </div>
          )}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar todos os filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {catalogData.data.map((item) => (
            <div
              key={item.id}
              onClick={() => setDetailVariationId(item.id)}
              className="group flex flex-col h-full rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-card-hover transition-all overflow-hidden cursor-pointer"
            >
              {/* Photo Area - Standardized Square Box with Contain Fit */}
              <div className="relative aspect-square w-full bg-gradient-to-b from-secondary/40 to-secondary/15 flex items-center justify-center p-2.5 overflow-hidden border-b border-border">
                <MiniatureImage
                  src={item.photoUrl}
                  alt={item.name}
                  fit="contain"
                  className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                  containerClassName="relative h-full w-full flex items-center justify-center overflow-hidden"
                />
                {/* Scale badge */}
                {item.scale && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/85 backdrop-blur-md text-[10px] font-bold text-foreground border border-border z-10 shadow-sm">
                    {item.scale.name}
                  </span>
                )}
                {/* Year badge */}
                {item.releaseYear && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-background/85 backdrop-blur-md text-[10px] font-semibold text-muted-foreground border border-border z-10 shadow-sm">
                    {item.releaseYear}
                  </span>
                )}
              </div>

              {/* Card Content - Normalized Heights for Uniform Presentation */}
              <div className="flex flex-col flex-1 p-3.5 justify-between">
                <div>
                  {/* Brand & Rarity */}
                  <div className="h-5 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary truncate">
                      {item.brand.name}
                    </span>
                    {getRarityBadge(item.rarity)}
                  </div>

                  {/* Model Name - Fixed 2-line height */}
                  <div className="h-9 mt-1 flex items-center">
                    <h3
                      className="text-xs font-bold text-foreground line-clamp-2 leading-tight title-hover"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                  </div>

                  {/* Series & Number - Fixed 1-line height */}
                  <div className="h-4 mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium truncate">
                    {item.series || item.seriesNumber || item.collectorNumber ? (
                      <>
                        {item.series && <span className="text-accent truncate">{item.series.name}</span>}
                        {item.seriesNumber && (
                          <span className="font-semibold text-foreground/70 bg-secondary/60 px-1 rounded shrink-0">
                            {item.seriesNumber}
                          </span>
                        )}
                        {item.collectorNumber && (
                          <span className="font-mono text-muted-foreground shrink-0">
                            #{item.collectorNumber}
                          </span>
                        )}
                      </>
                    ) : item.casting?.name ? (
                      <span className="text-muted-foreground/70 truncate">{item.casting.name}</span>
                    ) : (
                      <span className="text-transparent select-none">-</span>
                    )}
                  </div>

                  {/* Color / Details - Fixed 1-line height */}
                  <div className="h-4 mt-0.5 flex items-center text-[11px] text-muted-foreground truncate">
                    {item.color ? (
                      <span className="truncate">{item.color}</span>
                    ) : item.packaging ? (
                      <span className="truncate text-muted-foreground/70">{item.packaging}</span>
                    ) : (
                      <span className="text-transparent select-none">-</span>
                    )}
                  </div>
                </div>


                {/* Actions */}
                <div className="mt-auto pt-3 flex items-center gap-1.5 border-t border-border/60">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isAuthenticated) {
                        alert('Faça login para adicionar à sua coleção.');
                        return;
                      }
                      setModalVariation(item);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover transition-colors shadow-glow"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Coleção</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isAuthenticated) {
                        alert('Faça login para salvar na Wishlist.');
                        return;
                      }
                      addWishlistMutation.mutate(item.id);
                    }}
                    title="Salvar na Wishlist"
                    className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-border transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                  </button>

                  {isSeller && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSellingVariation(item);
                      }}
                      title="Anunciar miniatura no Marketplace / Pré-Venda"
                      className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <Store className="h-4 w-4" />
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingVariationId(item.id);
                      }}
                      title="Editar miniatura no catálogo canônico"
                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {catalogData?.pagination && catalogData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
          <span className="text-xs text-muted-foreground">
            Página <strong className="text-foreground">{catalogData.pagination.page}</strong> de{' '}
            <strong className="text-foreground">{catalogData.pagination.totalPages}</strong> ({catalogData.pagination.total} miniaturas)
          </span>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl bg-secondary hover:bg-muted text-foreground disabled:opacity-40 border border-border"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= catalogData.pagination.totalPages}
              onClick={() => setPage((p) => Math.min(catalogData.pagination.totalPages, p + 1))}
              className="p-2 rounded-xl bg-secondary hover:bg-muted text-foreground disabled:opacity-40 border border-border"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Ficha Técnica / Detalhes de Cadastro do Catálogo */}
      <MiniatureDetailModal
        variationId={detailVariationId}
        onClose={() => setDetailVariationId(null)}
        isAdmin={isAdmin}
        isSeller={isSeller}
        onEditVariation={(id) => setEditingVariationId(id)}
        onCreateOffer={(detail) => {
          setSellingVariation(detail as any);
        }}
        onAddToWishlist={(id) => {
          if (!isAuthenticated) {
            alert('Faça login para salvar na Wishlist.');
            return;
          }
          addWishlistMutation.mutate(id);
        }}
        onAddToCollection={(detail) => {
          if (!isAuthenticated) {
            alert('Faça login para adicionar à sua coleção.');
            return;
          }
          setModalVariation({
            id: detail.id,
            name: detail.name,
            releaseYear: detail.releaseYear,
            color: detail.color,
            photoUrl: detail.photoUrl,
            casting: detail.casting,
            brand: detail.brand,
            series: detail.series,
            scale: detail.scale,
          });
        }}
      />

      {/* Modal: Adicionar à Coleção */}
      {modalVariation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Adicionar à Minha Coleção
              </h3>
              <button
                onClick={() => setModalVariation(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
              <div className="h-12 w-12 rounded-lg bg-background overflow-hidden shrink-0 border border-border">
                <MiniatureImage
                  src={modalVariation.photoUrl}
                  alt={modalVariation.name}
                  containerClassName="h-full w-full bg-secondary flex items-center justify-center overflow-hidden"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{modalVariation.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{modalVariation.brand.name}</p>
              </div>
            </div>

            <form onSubmit={handleAddToCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Estado de Conservação
                </label>
                <select
                  value={conditionCode}
                  onChange={(e) => setConditionCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="MINT">Mint (Perfeito)</option>
                  <option value="NEAR_MINT">Near Mint (Excelente)</option>
                  <option value="CARDED">Carded (Lacrado na cartela)</option>
                  <option value="LOOSE">Loose (Fora da cartela)</option>
                  <option value="GOOD">Good (Bom)</option>
                  <option value="DAMAGED">Damaged (Com detalhes)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Localização Física (Opcional)
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => {
                    setSelectedLocationId(e.target.value);
                    setSelectedGridRow('');
                    setSelectedGridColumn('');
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Sem localização definida</option>
                  {locationsData?.data?.list?.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.hasGrid && loc.gridRows && loc.gridColumns ? `[${loc.gridRows}×${loc.gridColumns}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid Slot Selection if Selected Location has Grid */}
              {selectedLoc?.hasGrid && (
                <div className="p-3 rounded-xl bg-secondary/50 border border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" /> Expositor Matricial
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {selectedLoc.gridRows}L × {selectedLoc.gridColumns}C
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                        Linha (1 a {selectedLoc.gridRows})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={selectedLoc.gridRows || 100}
                        value={selectedGridRow}
                        onChange={(e) =>
                          setSelectedGridRow(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="Ex: 1"
                        className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                        Coluna (1 a {selectedLoc.gridColumns})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={selectedLoc.gridColumns || 100}
                        value={selectedGridColumn}
                        onChange={(e) =>
                          setSelectedGridColumn(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="Ex: 5"
                        className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Valor Pago (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 89.90"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Local de Compra
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ri Happy, Shopee, Encontro SP"
                    value={purchaseLocation}
                    onChange={(e) => setPurchaseLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalVariation(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addCollectionMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-glow transition-all disabled:opacity-50"
                >
                  {addCollectionMutation.isPending ? 'Salvando...' : 'Confirmar Adição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Miniatura do Catálogo (Admin) */}
      <EditCatalogModal
        variationId={editingVariationId}
        isOpen={!!editingVariationId}
        onClose={() => setEditingVariationId(null)}
        onSuccess={() => {
          setActionSuccess('Miniatura atualizada com sucesso no catálogo oficial!');
          queryClient.invalidateQueries({ queryKey: ['catalog'] });
        }}
      />

      {/* Modal: Anunciar Miniatura no Marketplace / Pré-Venda (Vendedor Autorizado) */}
      <CatalogCreateOfferModal
        variation={sellingVariation}
        isOpen={!!sellingVariation}
        onClose={() => setSellingVariation(null)}
        onSuccess={(title, isPreOrder) => {
          setActionSuccess(
            `Oferta "${title}" anunciada com sucesso como ${isPreOrder ? 'Pré-Venda' : 'Pronta Entrega'}!`
          );
        }}
      />

      {/* Modal: Cadastrar Nova Miniatura Rápida (Vendedor Autorizado) */}
      <QuickCreateMiniatureModal
        isOpen={showQuickCreateModal}
        onClose={() => setShowQuickCreateModal(false)}
        initialName={searchTerm}
        onCreated={(createdVariation) => {
          setShowQuickCreateModal(false);
          setActionSuccess(`Miniatura "${createdVariation.name}" cadastrada com sucesso!`);
          queryClient.invalidateQueries({ queryKey: ['catalog'] });
          setSellingVariation(createdVariation as any);
        }}
      />
    </div>
  );
}

