'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  Layers,
  MapPin,
  Car,
  Search,
  ArrowRightLeft,
  DollarSign,
  Check,
  X,
  Tag,
  Calendar,
  LayoutGrid,
  AlertCircle,
  Store,
  Pencil,
  Trash2,
  Building2,
  Sparkles,
  AlertOctagon,
  Download,
  Filter,
  Upload,
  Plus,
  List,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import { MiniatureDetailModal } from '@/components/catalog/MiniatureDetailModal';
import { exportCollectionToCSV } from '@/lib/export/collection-exporter';
import { ImportCollectionModal } from '@/components/collection/ImportCollectionModal';
import { useTranslation } from '@/i18n';

interface Exemplar {
  id: string;
  status: string;
  notes: string | null;
  acquisitionDate: string | null;
  purchasePrice?: string | null;
  purchaseLocation?: string | null;
  createdAt: string;
  primaryCode?: string | null;
  collectionCode?: string | null;
  variation: {
    id: string;
    name: string;
    releaseYear: number | null;
    color: string | null;
    photoUrl: string | null;
    code?: string | null;
  };
  casting: { id: string; name: string };
  brand: { id: string; name: string };
  series?: { id: string; name: string } | null;
  automaker?: { id: string; name: string } | null;
  vehicleModel?: { id: string; name: string } | null;
  condition: { id: string; code: string; name: string };
  location: {
    id: string;
    name: string;
    locationType: string | null;
    hasGrid?: boolean;
    gridRows?: number | null;
    gridColumns?: number | null;
    gridRow?: number | null;
    gridColumn?: number | null;
  } | null;
}

interface GroupedMiniature {
  variationId: string;
  variation: Exemplar['variation'];
  casting: Exemplar['casting'];
  brand: Exemplar['brand'];
  series?: Exemplar['series'];
  automaker?: Exemplar['automaker'];
  vehicleModel?: Exemplar['vehicleModel'];
  primaryCode: string | null;
  collectionCode: string | null;
  exemplars: Exemplar[];
  totalQuantity: number;
  totalCost: number;
  hasPrices: boolean;
  status: string;
}

function formatCollectionCode(brandName: string, primaryCode?: string | null, backendCollectionCode?: string | null) {
  if (backendCollectionCode) return backendCollectionCode;
  if (!primaryCode) return brandName;
  const brand = brandName.toLowerCase() === 'mini gt' ? 'MINI GT' : brandName;
  return `${brand} - ${primaryCode}`;
}

export default function CollectionPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'SOLD' | 'DISCARDED'>('ACTIVE');
  const [selectedAutomaker, setSelectedAutomaker] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [moveExemplar, setMoveExemplar] = useState<Exemplar | null>(null);
  const [selectedTargetLocation, setSelectedTargetLocation] = useState('');
  const [targetGridRow, setTargetGridRow] = useState<number | ''>('');
  const [targetGridColumn, setTargetGridColumn] = useState<number | ''>('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [sellExemplar, setSellExemplar] = useState<Exemplar | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [detailExemplar, setDetailExemplar] = useState<Exemplar | null>(null);

  // Edit Exemplar State
  const [editExemplar, setEditExemplar] = useState<Exemplar | null>(null);
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editPurchaseLocation, setEditPurchaseLocation] = useState('');
  const [editAutomakerId, setEditAutomakerId] = useState('');
  const [editVehicleModelId, setEditVehicleModelId] = useState('');
  const [editConditionCode, setEditConditionCode] = useState('MINT');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete / Write-off Exemplar State
  const [deleteExemplar, setDeleteExemplar] = useState<Exemplar | null>(null);
  const [removalMode, setRemovalMode] = useState<'WRITE_OFF' | 'DELETE'>('WRITE_OFF');
  const [writeOffReason, setWriteOffReason] = useState<'QUEBRA' | 'PERDA' | 'DEFEITO' | 'DESCARTE' | 'OUTRO'>('QUEBRA');
  const [writeOffDate, setWriteOffDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [writeOffNotes, setWriteOffNotes] = useState('');
  const [writeOffError, setWriteOffError] = useState<string | null>(null);

  // View mode & Grouped state
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [selectedGroup, setSelectedGroup] = useState<GroupedMiniature | null>(null);

  // Quick add inside acquisitions modal
  const [isAddingAnother, setIsAddingAnother] = useState(false);
  const [newAcqPrice, setNewAcqPrice] = useState('');
  const [newAcqLocation, setNewAcqLocation] = useState('');
  const [newAcqCondition, setNewAcqCondition] = useState('MINT');
  const [newAcqDate, setNewAcqDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newAcqTargetLocationId, setNewAcqTargetLocationId] = useState('');
  const [newAcqGridRow, setNewAcqGridRow] = useState<number | ''>('');
  const [newAcqGridColumn, setNewAcqGridColumn] = useState<number | ''>('');
  const [newAcqNotes, setNewAcqNotes] = useState('');
  const [newAcqError, setNewAcqError] = useState<string | null>(null);

  // Fetch locations
  const { data: locationsData } = useQuery<{
    data: {
      list: Array<{
        id: string;
        name: string;
        locationType: string | null;
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

  // Fetch catalog brands for filter
  const { data: filtersData } = useQuery<{
    data: {
      brands: Array<{ id: string; name: string }>;
    };
  }>({
    queryKey: ['catalog', 'filters'],
    queryFn: () => apiClient('/catalog/filters'),
    enabled: isAuthenticated,
  });

  // Fetch user's collection
  const { data: collectionData, isLoading } = useQuery<{
    data: Exemplar[];
    pagination: { total: number };
  }>({
    queryKey: [
      'collection',
      'list',
      user?.id,
      {
        status: statusFilter,
        q: searchTerm,
        automakerId: selectedAutomaker,
        locationId: selectedLocation,
        conditionCode: selectedCondition,
        brandId: selectedBrand,
      },
    ],
    queryFn: () =>
      apiClient('/collection/exemplars', {
        params: {
          status: statusFilter,
          q: searchTerm.trim() || undefined,
          automakerId: selectedAutomaker || undefined,
          locationId: selectedLocation || undefined,
          conditionCode: selectedCondition || undefined,
          brandId: selectedBrand || undefined,
        },
      }),
    enabled: isAuthenticated && !!user?.id,
  });

  // Mutation: Move exemplar
  const moveMutation = useMutation({
    mutationFn: ({
      id,
      toLocationId,
      toGridRow,
      toGridColumn,
    }: {
      id: string;
      toLocationId: string;
      toGridRow?: number | null;
      toGridColumn?: number | null;
    }) =>
      apiClient(`/collection/exemplars/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({
          toLocationId,
          toGridRow: toGridRow || undefined,
          toGridColumn: toGridColumn || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setMoveExemplar(null);
      setMoveError(null);
      setSuccessMsg('Exemplar movimentado para nova localização com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setMoveError(err.message || 'Falha ao movimentar exemplar.');
    },
  });

  // Mutation: Record sale
  const sellMutation = useMutation({
    mutationFn: ({ exemplarId, salePrice, buyerName }: any) =>
      apiClient('/sales', {
        method: 'POST',
        body: JSON.stringify({
          exemplarId,
          salePrice: parseFloat(salePrice),
          buyerName,
          saleDate: new Date().toISOString().split('T')[0],
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['acquisitions'] });
      setSellExemplar(null);
      setSuccessMsg('Venda registrada e exemplar marcado como SOLD!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  // Query: Automakers for edit modal & filter
  const { data: automakersData } = useQuery<{
    data: Array<{ id: string; name: string; country: string | null }>;
  }>({
    queryKey: ['catalog', 'automakers'],
    queryFn: () => apiClient('/catalog/automakers'),
    enabled: isAuthenticated,
  });

  // Query: Vehicle Models for edit modal
  const { data: vehicleModelsData } = useQuery<{
    data: Array<{ id: string; name: string; automakerId: string }>;
  }>({
    queryKey: ['catalog', 'vehicle-models', editAutomakerId],
    queryFn: () =>
      apiClient(
        editAutomakerId
          ? `/catalog/vehicle-models?automakerId=${editAutomakerId}`
          : '/catalog/vehicle-models'
      ),
    enabled: isAuthenticated && Boolean(editExemplar),
  });

  // Mutation: Update exemplar fields
  const updateExemplarMutation = useMutation({
    mutationFn: ({
      id,
      purchasePrice,
      purchaseLocation,
      automakerId,
      vehicleModelId,
      conditionCode,
      notes,
    }: {
      id: string;
      purchasePrice?: number | null;
      purchaseLocation?: string | null;
      automakerId?: string | null;
      vehicleModelId?: string | null;
      conditionCode?: string;
      notes?: string | null;
    }) =>
      apiClient(`/collection/exemplars/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          purchasePrice,
          purchaseLocation,
          automakerId: automakerId || null,
          vehicleModelId: vehicleModelId || null,
          conditionCode,
          notes,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['acquisitions'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['writeOffs'] });
      setEditExemplar(null);
      setEditError(null);
      setSuccessMsg('Informações do exemplar atualizadas com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setEditError(err.message || 'Falha ao atualizar exemplar.');
    },
  });

  // Mutation: Delete exemplar from collection
  const deleteExemplarMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/collection/exemplars/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['writeOffs'] });
      queryClient.invalidateQueries({ queryKey: ['acquisitions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteExemplar(null);
      setSuccessMsg('Miniatura removida da sua coleção com sucesso.');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      alert(err.message || 'Erro ao remover miniatura da coleção.');
    },
  });

  // Mutation: Record write-off
  const writeOffMutation = useMutation({
    mutationFn: ({ exemplarId, reason, writeOffDate, notes }: any) =>
      apiClient('/write-offs', {
        method: 'POST',
        body: JSON.stringify({
          exemplarId,
          reason,
          writeOffDate,
          notes: notes || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['writeOffs'] });
      queryClient.invalidateQueries({ queryKey: ['acquisitions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteExemplar(null);
      setSuccessMsg('Baixa de exemplar registrada com sucesso no histórico de Aquisições & Vendas!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setWriteOffError(err.message || 'Falha ao registrar baixa.');
    },
  });

  // Mutation: Add another exemplar for an existing variation
  const addAnotherExemplarMutation = useMutation({
    mutationFn: (body: any) =>
      apiClient('/collection/exemplars', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['acquisitions'] });
      setIsAddingAnother(false);
      setNewAcqPrice('');
      setNewAcqLocation('');
      setNewAcqNotes('');
      setNewAcqTargetLocationId('');
      setNewAcqGridRow('');
      setNewAcqGridColumn('');
      setNewAcqError(null);
      setSuccessMsg('Novo exemplar adicionado com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setNewAcqError(err.message || 'Falha ao adicionar novo exemplar.');
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await apiClient<{ data: Exemplar[] }>('/collection/exemplars', {
        params: {
          status: statusFilter,
          q: searchTerm.trim() || undefined,
          automakerId: selectedAutomaker || undefined,
          locationId: selectedLocation || undefined,
          conditionCode: selectedCondition || undefined,
          brandId: selectedBrand || undefined,
          page: 1,
          pageSize: 1000,
        },
      });
      const items = res.data || [];
      if (items.length === 0) {
        alert('Nenhuma miniatura encontrada para exportar com os filtros atuais.');
        return;
      }
      exportCollectionToCSV(items);
    } catch (err: any) {
      alert(err.message || 'Erro ao exportar coleção.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm || selectedAutomaker || selectedLocation || selectedCondition || selectedBrand
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedAutomaker('');
    setSelectedLocation('');
    setSelectedCondition('');
    setSelectedBrand('');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Layers className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground">{t('collection.loginRequired')}</h2>
        <Link
          href="/login"
          className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow transition-all"
        >
          {t('common.login')}
        </Link>
      </div>
    );
  }

  const exemplars = collectionData?.data || [];

  // Group exemplars by variationId when in grouped view
  const groupedMiniatures = React.useMemo<GroupedMiniature[]>(() => {
    const map = new Map<string, GroupedMiniature>();
    for (const ex of exemplars) {
      const vId = ex.variation.id;
      let group = map.get(vId);
      const price = ex.purchasePrice ? parseFloat(ex.purchasePrice) : 0;
      if (!group) {
        group = {
          variationId: vId,
          variation: ex.variation,
          casting: ex.casting,
          brand: ex.brand,
          series: ex.series,
          automaker: ex.automaker,
          vehicleModel: ex.vehicleModel,
          primaryCode: ex.primaryCode || ex.variation.code || null,
          collectionCode: ex.collectionCode || null,
          exemplars: [],
          totalQuantity: 0,
          totalCost: 0,
          hasPrices: false,
          status: ex.status,
        };
        map.set(vId, group);
      }
      group.exemplars.push(ex);
      group.totalQuantity += 1;
      if (ex.purchasePrice) {
        group.totalCost += price;
        group.hasPrices = true;
      }
    }
    return Array.from(map.values());
  }, [exemplars]);

  // Keep activeSelectedGroup synchronized with updated collection queries
  const activeSelectedGroup = React.useMemo(() => {
    if (!selectedGroup) return null;
    return groupedMiniatures.find((g) => g.variationId === selectedGroup.variationId) || null;
  }, [groupedMiniatures, selectedGroup]);

  return (
    <div className="space-y-6">
      {/* Top Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t('collection.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t('collection.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {t('collection.activeFilter')} ({statusFilter === 'ACTIVE' ? collectionData?.pagination?.total ?? exemplars.length : ''})
          </button>
          <button
            onClick={() => setStatusFilter('SOLD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'SOLD'
                ? 'bg-emerald-600 text-white shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {t('collection.soldFilter')}
          </button>
          <button
            onClick={() => setStatusFilter('DISCARDED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'DISCARDED'
                ? 'bg-amber-600 text-white shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {t('collection.discardedFilter')}
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-muted border border-border shadow-sm transition-all disabled:opacity-50 ml-auto sm:ml-0"
            title="Exportar dados da coleção para Excel (.csv)"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            {isExporting ? t('collection.exporting') : t('collection.exportCSV')}
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/30 shadow-sm transition-all"
            title="Importar miniaturas em lote através de planilha Excel / CSV"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-400" />
            {t('collection.importCSV')}
          </button>

          {/* Toggle Modo de Visualização */}
          <div className="flex items-center rounded-xl bg-secondary/80 p-0.5 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grouped'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-primary" />
              <span>{t('collection.groupedMode')} ({groupedMiniatures.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5 text-accent" />
              <span>{t('collection.listMode')} ({exemplars.length})</span>
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="space-y-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('collection.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Quick Clear Button if any filter active */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/50 border border-border hover:bg-secondary transition-colors"
            >
              <X className="h-3.5 w-3.5" /> {t('collection.clearFilters')}
            </button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Montadora Real */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Car className="h-3 w-3 text-primary" /> Montadora Real
            </label>
            <select
              value={selectedAutomaker}
              onChange={(e) => setSelectedAutomaker(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 truncate"
            >
              <option value="">{t('collection.allAutomakers')}</option>
              {automakersData?.data?.map((auto) => (
                <option key={auto.id} value={auto.id}>
                  {auto.name} {auto.country ? `(${auto.country})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Localização Física / Expositor */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" /> Expositor / Local
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 truncate"
            >
              <option value="">{t('collection.allLocations')}</option>
              {locationsData?.data?.list?.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.hasGrid && loc.gridRows ? `[${loc.gridRows}×${loc.gridColumns}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Estado de Conservação */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3 text-primary" /> Conservação
            </label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 truncate"
            >
              <option value="">{t('collection.allConditions')}</option>
              <option value="MINT">Mint (Perfeito)</option>
              <option value="NEAR_MINT">Near Mint (Excelente)</option>
              <option value="CARDED">Carded (Na Cartela)</option>
              <option value="LOOSE">Loose (Fora da cartela)</option>
              <option value="GOOD">Good (Bom)</option>
              <option value="DAMAGED">Damaged (Com detalhes)</option>
            </select>
          </div>

          {/* Marca da Miniatura */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Marca Diecast
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 truncate"
            >
              <option value="">{t('collection.allBrands')}</option>
              {filtersData?.data?.brands?.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Exemplars List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-card/60 animate-pulse border border-border" />
          ))}
        </div>
      ) : exemplars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-card border border-border">
          <Layers className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">
            {statusFilter === 'ACTIVE'
              ? t('collection.emptyCollection')
              : statusFilter === 'SOLD'
              ? 'Nenhuma miniatura vendida'
              : 'Nenhuma baixa registrada'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {statusFilter === 'ACTIVE'
              ? t('collection.emptyCollectionDesc')
              : statusFilter === 'SOLD'
              ? 'Quando vender um exemplar da sua coleção, ele aparecerá aqui com seu lucro registrado.'
              : 'Miniaturas que sofrerem quebra, perda ou avaria registradas na coleção aparecerão aqui.'}
          </p>
          {statusFilter === 'ACTIVE' && (
            <Link
              href="/catalog"
              className="mt-6 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow transition-all"
            >
              {t('catalog.title')}
            </Link>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {groupedMiniatures.map((group) => {
            const distinctLocs = Array.from(
              new Set(group.exemplars.map((e) => e.location?.name).filter(Boolean))
            );

            return (
              <div
                key={group.variationId}
                onClick={() => setSelectedGroup(group)}
                className="group flex flex-col h-full rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/50 hover:shadow-card-hover transition-all shadow-card cursor-pointer"
              >
                {/* Photo & Badges - Standardized Square Box with Contain Fit */}
                <div className="relative aspect-square w-full bg-gradient-to-b from-secondary/40 to-secondary/15 flex items-center justify-center p-2.5 overflow-hidden border-b border-border">
                  <MiniatureImage
                    src={group.variation.photoUrl}
                    alt={group.variation.name}
                    fit="contain"
                    className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                    containerClassName="relative h-full w-full flex items-center justify-center overflow-hidden"
                  />

                  {/* Quantity Badge on Top-Right */}
                  {group.totalQuantity > 1 ? (
                    <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-primary to-accent text-white text-[11px] font-black shadow-md flex items-center gap-1">
                      <Layers className="h-3 w-3" /> {group.totalQuantity}x
                    </span>
                  ) : group.status === 'SOLD' ? (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-black text-white">
                      VENDIDO
                    </span>
                  ) : group.status === 'DISCARDED' ? (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-600 text-[10px] font-black text-white">
                      BAIXA
                    </span>
                  ) : null}

                  {/* Exemplars / Condition pill on Top-Left */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/85 backdrop-blur-md text-[10px] font-bold text-foreground border border-border flex items-center gap-1">
                    {group.totalQuantity > 1 ? (
                      <>
                        <Coins className="h-3 w-3 text-primary" /> {group.totalQuantity} exemplares
                      </>
                    ) : (
                      <>
                        <Tag className="h-3 w-3 text-primary" /> {group.exemplars[0]?.condition.name}
                      </>
                    )}
                  </span>
                </div>

                {/* Information */}
                <div className="flex flex-col flex-1 p-3.5">
                  {/* Collection Code & Series */}
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/25 text-primary text-[10px] font-mono font-bold tracking-wide truncate max-w-full"
                      title={`Código da Coleção: ${formatCollectionCode(group.brand.name, group.primaryCode, group.collectionCode)}`}
                    >
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {formatCollectionCode(group.brand.name, group.primaryCode, group.collectionCode)}
                      </span>
                    </span>

                    {group.series?.name && (
                      <span
                        className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded truncate"
                        title={`Série: ${group.series.name}`}
                      >
                        {group.series.name}
                      </span>
                    )}
                  </div>

                  {/* Variation Name */}
                  <h3 className="text-xs font-bold text-foreground line-clamp-2 mt-1.5 group-hover:text-primary transition-colors">
                    {group.variation.name}
                  </h3>

                  {/* Real Vehicle / Automaker */}
                  {group.automaker?.name && (
                    <div
                      className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground font-medium truncate"
                      title={`Veículo Real: ${group.automaker.name}${group.vehicleModel?.name ? ` • ${group.vehicleModel.name}` : ''}`}
                    >
                      <Building2 className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">
                        {group.automaker.name}
                        {group.vehicleModel?.name ? ` • ${group.vehicleModel.name}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Storage Location summary */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="truncate flex items-center gap-1.5">
                      {group.totalQuantity === 1 ? (
                        group.exemplars[0]?.location ? (
                          <>
                            <span className="truncate">{group.exemplars[0].location.name}</span>
                            {group.exemplars[0].location.gridRow && group.exemplars[0].location.gridColumn && (
                              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                L{group.exemplars[0].location.gridRow}:C{group.exemplars[0].location.gridColumn}
                              </span>
                            )}
                          </>
                        ) : (
                          <em className="text-muted-foreground/60">Sem localização</em>
                        )
                      ) : distinctLocs.length === 1 ? (
                        <span className="truncate">{distinctLocs[0]}</span>
                      ) : distinctLocs.length > 1 ? (
                        <span className="text-foreground/80 font-medium">
                          Em {distinctLocs.length} locais de armazenamento
                        </span>
                      ) : (
                        <em className="text-muted-foreground/60">Sem localização</em>
                      )}
                    </span>
                  </div>

                  {/* Purchase / Investment Info */}
                  {group.hasPrices && (
                    <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground gap-1">
                      <span className="truncate">
                        {group.totalQuantity > 1 ? `Total (${group.totalQuantity} un):` : 'Preço pago:'}
                      </span>
                      <span className="font-semibold text-emerald-400 shrink-0 font-mono">
                        R$ {group.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {/* Card Footer: CTA to open acquisitions grid */}
                  <div className="mt-auto pt-2.5 flex items-center justify-between gap-1 text-[11px] font-semibold text-primary group-hover:text-primary-hover border-t border-border/60">
                    <span className="flex items-center gap-1">
                      <Store className="h-3 w-3" />
                      {group.totalQuantity === 1 ? 'Ver aquisição' : `Ver ${group.totalQuantity} aquisições`}
                    </span>
                    <span className="text-[10px] text-muted-foreground group-hover:translate-x-0.5 transition-transform">
                      Abrir grade &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {exemplars.map((ex) => (
            <div
              key={ex.id}
              onClick={() => setDetailExemplar(ex)}
              className="group flex flex-col h-full rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/50 hover:shadow-card-hover transition-all shadow-card cursor-pointer"
            >
              {/* Photo & Condition Badge - Standardized Square Box with Contain Fit */}
              <div className="relative aspect-square w-full bg-gradient-to-b from-secondary/40 to-secondary/15 flex items-center justify-center p-2.5 overflow-hidden border-b border-border">
                <MiniatureImage
                  src={ex.variation.photoUrl}
                  alt={ex.variation.name}
                  fit="contain"
                  className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                  containerClassName="relative h-full w-full flex items-center justify-center overflow-hidden"
                />

                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-[10px] font-bold text-foreground border border-border flex items-center gap-1">
                  <Tag className="h-3 w-3 text-primary" /> {ex.condition.name}
                </span>

                {ex.status === 'SOLD' && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-black text-white">
                    VENDIDO
                  </span>
                )}
                {ex.status === 'DISCARDED' && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-600 text-[10px] font-black text-white">
                    BAIXA
                  </span>
                )}
              </div>

              {/* Information */}
              <div className="flex flex-col flex-1 p-3.5">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/25 text-primary text-[10px] font-mono font-bold tracking-wide truncate max-w-full"
                    title={`Código da Coleção: ${formatCollectionCode(ex.brand.name, ex.primaryCode, ex.collectionCode)}`}
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {formatCollectionCode(ex.brand.name, ex.primaryCode, ex.collectionCode)}
                    </span>
                  </span>

                  {ex.series?.name && (
                    <span
                      className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded truncate"
                      title={`Série: ${ex.series.name}`}
                    >
                      {ex.series.name}
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-bold text-foreground line-clamp-2 mt-1">
                  {ex.variation.name}
                </h3>

                {/* Veículo Real / Montadora */}
                {ex.automaker?.name && (
                  <div
                    className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground font-medium truncate"
                    title={`Veículo Real: ${ex.automaker.name}${ex.vehicleModel?.name ? ` • ${ex.vehicleModel.name}` : ''}`}
                  >
                    <Building2 className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate">
                      {ex.automaker.name}
                      {ex.vehicleModel?.name ? ` • ${ex.vehicleModel.name}` : ''}
                    </span>
                  </div>
                )}

                {/* Location indicator */}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="truncate flex items-center gap-1.5">
                    {ex.location ? (
                      <>
                        <span className="truncate">{ex.location.name}</span>
                        {ex.location.gridRow && ex.location.gridColumn && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            L{ex.location.gridRow}:C{ex.location.gridColumn}
                          </span>
                        )}
                      </>
                    ) : (
                      <em className="text-muted-foreground/60">Sem localização</em>
                    )}
                  </span>
                </div>

                {/* Purchase Info */}
                {(ex.purchaseLocation || ex.purchasePrice) && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground gap-1">
                    {ex.purchaseLocation ? (
                      <span className="truncate flex items-center gap-1" title={`Local de compra: ${ex.purchaseLocation}`}>
                        <Store className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{ex.purchaseLocation}</span>
                      </span>
                    ) : <span />}
                    {ex.purchasePrice && (
                      <span className="font-semibold text-emerald-400 shrink-0 font-mono">
                        R$ {parseFloat(ex.purchasePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons (only for active items) */}
                {ex.status === 'ACTIVE' && (
                  <div className="mt-auto pt-3 flex items-center gap-1.5 border-t border-border/60">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditExemplar(ex);
                        setEditPurchasePrice(ex.purchasePrice || '');
                        setEditPurchaseLocation(ex.purchaseLocation || '');
                        setEditAutomakerId(ex.automaker?.id || '');
                        setEditVehicleModelId(ex.vehicleModel?.id || '');
                        setEditConditionCode(ex.condition.code);
                        setEditNotes(ex.notes || '');
                        setEditError(null);
                      }}
                      title="Editar dados do exemplar"
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-muted border border-border transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3 w-3 text-amber-400" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTargetLocation(ex.location?.id || '');
                        setTargetGridRow(ex.location?.gridRow || '');
                        setTargetGridColumn(ex.location?.gridColumn || '');
                        setMoveError(null);
                        setMoveExemplar(ex);
                      }}
                      title="Mover exemplar de nicho ou expositor"
                      className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSalePrice('');
                        setBuyerName('');
                        setSellExemplar(ex);
                      }}
                      title="Registrar venda"
                      className="p-1.5 rounded-lg bg-secondary text-foreground hover:text-emerald-400 hover:bg-emerald-500/10 border border-border transition-colors cursor-pointer"
                    >
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemovalMode('WRITE_OFF');
                        setWriteOffReason('QUEBRA');
                        setWriteOffDate(new Date().toISOString().split('T')[0]);
                        setWriteOffNotes('');
                        setWriteOffError(null);
                        setDeleteExemplar(ex);
                      }}
                      title="Dar baixa ou excluir miniatura da coleção"
                      className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 border border-border transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Mover Exemplar */}
      {moveExemplar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" /> Mover Exemplar
              </h3>
              <button onClick={() => setMoveExemplar(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-foreground font-semibold mt-3 truncate">{moveExemplar.variation.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span>Local atual:</span>
              <span className="font-medium text-foreground">
                {moveExemplar.location?.name || 'Nenhum'}
                {moveExemplar.location?.gridRow && moveExemplar.location?.gridColumn && (
                  <span className="ml-1 text-[10px] text-emerald-400 font-mono font-bold">
                    (L{moveExemplar.location.gridRow}:C{moveExemplar.location.gridColumn})
                  </span>
                )}
              </span>
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-foreground mb-1">Nova Localização</label>
              <select
                value={selectedTargetLocation}
                onChange={(e) => {
                  setSelectedTargetLocation(e.target.value);
                  setTargetGridRow('');
                  setTargetGridColumn('');
                  setMoveError(null);
                }}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Selecione um destino...</option>
                {locationsData?.data?.list?.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.hasGrid && loc.gridRows && loc.gridColumns ? `[${loc.gridRows}×${loc.gridColumns}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid Coordinates if Target Location has Grid */}
            {(() => {
              const targetLoc = locationsData?.data?.list?.find(
                (l) => l.id === selectedTargetLocation
              );
              if (!targetLoc?.hasGrid) return null;

              return (
                <div className="mt-3 p-3 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <LayoutGrid className="h-3.5 w-3.5" /> Expositor Matricial
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {targetLoc.gridRows}L × {targetLoc.gridColumns}C ({Number(targetLoc.gridRows) * Number(targetLoc.gridColumns)} nichos)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                        Linha (1 a {targetLoc.gridRows})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={targetLoc.gridRows || 100}
                        value={targetGridRow}
                        onChange={(e) =>
                          setTargetGridRow(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="Ex: 2"
                        className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                        Coluna (1 a {targetLoc.gridColumns})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={targetLoc.gridColumns || 100}
                        value={targetGridColumn}
                        onChange={(e) =>
                          setTargetGridColumn(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="Ex: 5"
                        className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70">
                    Opcional: deixe vazio para guardar sem especificar o nicho exato.
                  </p>
                </div>
              );
            })()}

            {moveError && (
              <div className="mt-3 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{moveError}</span>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setMoveExemplar(null)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedTargetLocation || moveMutation.isPending}
                onClick={() =>
                  moveMutation.mutate({
                    id: moveExemplar.id,
                    toLocationId: selectedTargetLocation,
                    toGridRow: targetGridRow ? Number(targetGridRow) : null,
                    toGridColumn: targetGridColumn ? Number(targetGridColumn) : null,
                  })
                }
                className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-glow disabled:opacity-50"
              >
                {moveMutation.isPending ? 'Movendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Venda */}
      {sellExemplar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" /> Registrar Venda
              </h3>
              <button onClick={() => setSellExemplar(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-foreground font-semibold mt-3 truncate">{sellExemplar.variation.name}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sellMutation.mutate({
                  exemplarId: sellExemplar.id,
                  salePrice,
                  buyerName,
                });
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ex: 150.00"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Comprador (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Marcos Colecionador"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSellExemplar(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!salePrice || sellMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 shadow-glow disabled:opacity-50"
                >
                  {sellMutation.isPending ? 'Salvando...' : 'Confirmar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Exemplar da Coleção */}
      {editExemplar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Pencil className="h-4 w-4 text-amber-400" /> Editar Exemplar na Coleção
              </h3>
              <button
                onClick={() => setEditExemplar(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-3 flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
              <div className="h-12 w-12 rounded-lg bg-background overflow-hidden shrink-0 border border-border">
                <MiniatureImage
                  src={editExemplar.variation.photoUrl}
                  alt={editExemplar.variation.name}
                  containerClassName="h-full w-full bg-secondary flex items-center justify-center overflow-hidden"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{editExemplar.variation.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span className="font-bold text-primary">{editExemplar.brand.name}</span>
                  {editExemplar.series?.name && <span>• {editExemplar.series.name}</span>}
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEditError(null);
                updateExemplarMutation.mutate({
                  id: editExemplar.id,
                  purchasePrice: editPurchasePrice ? parseFloat(editPurchasePrice) : null,
                  purchaseLocation: editPurchaseLocation.trim() || null,
                  automakerId: editAutomakerId || null,
                  vehicleModelId: editVehicleModelId || null,
                  conditionCode: editConditionCode as any,
                  notes: editNotes.trim() || null,
                });
              }}
              className="space-y-4"
            >
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
                    value={editPurchasePrice}
                    onChange={(e) => setEditPurchasePrice(e.target.value)}
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
                    value={editPurchaseLocation}
                    onChange={(e) => setEditPurchaseLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Montadora & Veículo Real */}
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/80 space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary" /> Montadora & Veículo Real
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Montadora
                    </label>
                    <select
                      value={editAutomakerId}
                      onChange={(e) => {
                        setEditAutomakerId(e.target.value);
                        setEditVehicleModelId('');
                      }}
                      className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Nenhuma / Não especificada</option>
                      {automakersData?.data?.map((am) => (
                        <option key={am.id} value={am.id}>
                          {am.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Modelo do Veículo
                    </label>
                    <select
                      value={editVehicleModelId}
                      onChange={(e) => setEditVehicleModelId(e.target.value)}
                      disabled={!editAutomakerId}
                      className="w-full h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    >
                      <option value="">Nenhum / Não especificado</option>
                      {vehicleModelsData?.data?.map((vm) => (
                        <option key={vm.id} value={vm.id}>
                          {vm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Associe esta miniatura à montadora e modelo real para fins de catálogo e relatórios.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Estado de Conservação
                  </label>
                  <select
                    value={editConditionCode}
                    onChange={(e) => setEditConditionCode(e.target.value)}
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
                    Observações Pessoais
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cartela curta, lote B..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {editError && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditExemplar(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateExemplarMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-glow transition-all disabled:opacity-50"
                >
                  {updateExemplarMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Baixa ou Exclusão de Exemplar */}
      {deleteExemplar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-amber-400" />
                Remover da Coleção Ativa
              </h3>
              <button
                onClick={() => setDeleteExemplar(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="my-4 flex items-center gap-3 p-3 rounded-xl bg-secondary/60 border border-border">
              <div className="h-12 w-12 rounded-lg bg-background overflow-hidden shrink-0 border border-border">
                <MiniatureImage
                  src={deleteExemplar.variation.photoUrl}
                  alt={deleteExemplar.variation.name}
                  containerClassName="h-full w-full bg-secondary flex items-center justify-center overflow-hidden"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{deleteExemplar.variation.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{deleteExemplar.brand.name}</p>
              </div>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-secondary border border-border">
              <button
                type="button"
                onClick={() => setRemovalMode('WRITE_OFF')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  removalMode === 'WRITE_OFF'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dar Baixa (Perda/Quebra)
              </button>
              <button
                type="button"
                onClick={() => setRemovalMode('DELETE')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  removalMode === 'DELETE'
                    ? 'bg-destructive text-destructive-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Erro de Cadastro
              </button>
            </div>

            {removalMode === 'WRITE_OFF' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setWriteOffError(null);
                  writeOffMutation.mutate({
                    exemplarId: deleteExemplar.id,
                    reason: writeOffReason,
                    writeOffDate,
                    notes: writeOffNotes.trim() || undefined,
                  });
                }}
                className="space-y-3"
              >
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                  <p className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                    <AlertOctagon className="h-3.5 w-3.5" /> Recomendado para perdas e quebras
                  </p>
                  Esta ação registra a saída no histórico de <strong>Aquisições & Vendas (Baixas)</strong> com valor R$ 0,00, mantendo seu histórico original de compra e desocupando o nicho ou expositor físico.
                </div>

                {writeOffError && (
                  <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                    {writeOffError}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Motivo da Baixa
                  </label>
                  <select
                    value={writeOffReason}
                    onChange={(e) => setWriteOffReason(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="QUEBRA">Quebra / Avaria Física</option>
                    <option value="PERDA">Perda / Extravio</option>
                    <option value="DEFEITO">Defeito de Fabricação</option>
                    <option value="DESCARTE">Descarte</option>
                    <option value="OUTRO">Outro Motivo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Data da Baixa
                  </label>
                  <input
                    type="date"
                    value={writeOffDate}
                    onChange={(e) => setWriteOffDate(e.target.value)}
                    required
                    className="w-full h-9 px-3 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Observações (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={writeOffNotes}
                    onChange={(e) => setWriteOffNotes(e.target.value)}
                    placeholder="Ex: Caiu da prateleira e quebrou o retrovisor..."
                    className="w-full p-2.5 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div className="mt-5 flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setDeleteExemplar(null)}
                    className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={writeOffMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 text-xs font-bold text-white hover:bg-amber-500 shadow-glow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {writeOffMutation.isPending ? 'Registrando...' : 'Confirmar Baixa'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive/90 leading-relaxed">
                  <p className="font-semibold text-destructive mb-1 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Atenção: Exclusão Permanente
                  </p>
                  Utilize esta opção apenas se você <strong>cadastrou esta miniatura por engano</strong>. O exemplar e o registro de compra gerado na adição serão <strong>completamente apagados</strong> do sistema.
                </div>

                <div className="mt-5 flex gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setDeleteExemplar(null)}
                    className="flex-1 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deleteExemplarMutation.isPending}
                    onClick={() => deleteExemplarMutation.mutate(deleteExemplar.id)}
                    className="flex-1 py-2.5 rounded-xl bg-destructive text-xs font-bold text-destructive-foreground hover:bg-destructive/90 shadow-glow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {deleteExemplarMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Grid de Aquisições da Miniatura Agrupada */}
      {activeSelectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-3 bg-card/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-16 w-20 sm:h-20 sm:w-28 rounded-xl overflow-hidden bg-secondary border border-border shrink-0">
                  <MiniatureImage
                    src={activeSelectedGroup.variation.photoUrl}
                    alt={activeSelectedGroup.variation.name}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-mono font-bold">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      {formatCollectionCode(
                        activeSelectedGroup.brand.name,
                        activeSelectedGroup.primaryCode,
                        activeSelectedGroup.collectionCode
                      )}
                    </span>
                    {activeSelectedGroup.series?.name && (
                      <span className="text-[11px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md">
                        {activeSelectedGroup.series.name}
                      </span>
                    )}
                    {activeSelectedGroup.variation.releaseYear && (
                      <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                        {activeSelectedGroup.variation.releaseYear}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-foreground truncate mt-1">
                    {activeSelectedGroup.variation.name}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-foreground/80">{activeSelectedGroup.casting.name}</span>
                    {activeSelectedGroup.automaker?.name && (
                      <>
                        <span>&bull;</span>
                        <Building2 className="h-3 w-3 text-primary" />
                        <span>
                          {activeSelectedGroup.automaker.name}
                          {activeSelectedGroup.vehicleModel?.name ? ` ${activeSelectedGroup.vehicleModel.name}` : ''}
                        </span>
                      </>
                    )}
                    {activeSelectedGroup.variation.color && (
                      <>
                        <span>&bull;</span>
                        <span>Cor: {activeSelectedGroup.variation.color}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const firstEx = activeSelectedGroup.exemplars[0];
                    if (firstEx) {
                      setDetailExemplar(firstEx);
                    }
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                  title="Abrir ficha técnica completa desta miniatura"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-accent" />
                  <span>Ver no Catálogo</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedGroup(null);
                    setIsAddingAnother(false);
                  }}
                  className="p-1.5 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Stats & Add Button Bar */}
            <div className="px-4 sm:px-5 py-3 bg-secondary/30 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Exemplares:</span>
                  <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary font-bold font-mono">
                    {activeSelectedGroup.totalQuantity} {activeSelectedGroup.totalQuantity === 1 ? 'unidade' : 'unidades'}
                  </span>
                </div>
                {activeSelectedGroup.hasPrices && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Total Investido:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        R$ {activeSelectedGroup.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {activeSelectedGroup.totalQuantity > 1 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Média / Peça:</span>
                        <span className="font-bold text-teal-400 font-mono">
                          R${' '}
                          {(activeSelectedGroup.totalCost / activeSelectedGroup.totalQuantity).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAddingAnother(!isAddingAnother)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                  isAddingAnother
                    ? 'bg-secondary text-foreground border border-border'
                    : 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow'
                }`}
              >
                {isAddingAnother ? (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>Fechar Formulário</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Adicionar Outro Exemplar</span>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible Fast Add Form */}
            {isAddingAnother && (
              <div className="p-4 sm:p-5 bg-card/90 border-b border-border animate-in slide-in-from-top duration-200">
                <div className="max-w-3xl mx-auto space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-primary" /> Registrar Nova Aquisição deste Modelo
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Preço Pago (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 85.00"
                        value={newAcqPrice}
                        onChange={(e) => setNewAcqPrice(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Loja / Origem de Compra
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Mercado Livre, Loja Hobby..."
                        value={newAcqLocation}
                        onChange={(e) => setNewAcqLocation(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Data de Aquisição
                      </label>
                      <input
                        type="date"
                        value={newAcqDate}
                        onChange={(e) => setNewAcqDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Conservação
                      </label>
                      <select
                        value={newAcqCondition}
                        onChange={(e) => setNewAcqCondition(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="MINT">Mint (Perfeito no blister)</option>
                        <option value="NEAR_MINT">Near Mint (Excelente estado)</option>
                        <option value="CARDED">Carded (Na Cartela)</option>
                        <option value="LOOSE">Loose (Fora da cartela)</option>
                        <option value="GOOD">Good (Bom estado)</option>
                        <option value="DAMAGED">Damaged (Com avarias)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Localização / Expositor Físico
                      </label>
                      <select
                        value={newAcqTargetLocationId}
                        onChange={(e) => {
                          setNewAcqTargetLocationId(e.target.value);
                          setNewAcqGridRow('');
                          setNewAcqGridColumn('');
                        }}
                        className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">Sem localização inicial</option>
                        {locationsData?.data?.list?.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} {loc.hasGrid && loc.gridRows ? `[${loc.gridRows}×${loc.gridColumns}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const selLoc = locationsData?.data?.list?.find((l) => l.id === newAcqTargetLocationId);
                    if (!selLoc?.hasGrid) return null;
                    return (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 border border-border text-xs">
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <LayoutGrid className="h-3.5 w-3.5" /> Coordenadas no Expositor Matricial:
                        </span>
                        <div className="flex items-center gap-2">
                          <span>Linha:</span>
                          <input
                            type="number"
                            min="1"
                            max={selLoc.gridRows || 20}
                            value={newAcqGridRow}
                            onChange={(e) => setNewAcqGridRow(e.target.value ? Number(e.target.value) : '')}
                            placeholder="L"
                            className="w-16 h-8 px-2 rounded bg-background border border-border text-xs text-center font-mono font-bold"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Coluna:</span>
                          <input
                            type="number"
                            min="1"
                            max={selLoc.gridColumns || 20}
                            value={newAcqGridColumn}
                            onChange={(e) => setNewAcqGridColumn(e.target.value ? Number(e.target.value) : '')}
                            placeholder="C"
                            className="w-16 h-8 px-2 rounded bg-background border border-border text-xs text-center font-mono font-bold"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Observações desta Aquisição
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Edição especial, comprado em lote com desconto..."
                      value={newAcqNotes}
                      onChange={(e) => setNewAcqNotes(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  {newAcqError && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{newAcqError}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingAnother(false)}
                      className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={addAnotherExemplarMutation.isPending}
                      onClick={() => {
                        addAnotherExemplarMutation.mutate({
                          variationId: activeSelectedGroup.variationId,
                          conditionCode: newAcqCondition,
                          cost: newAcqPrice ? parseFloat(newAcqPrice) : undefined,
                          sourceName: newAcqLocation || undefined,
                          acquisitionDate: newAcqDate,
                          acquisitionType: 'PURCHASE',
                          locationId: newAcqTargetLocationId || undefined,
                          gridRow: newAcqGridRow ? Number(newAcqGridRow) : undefined,
                          gridColumn: newAcqGridColumn ? Number(newAcqGridColumn) : undefined,
                          notes: newAcqNotes || undefined,
                        });
                      }}
                      className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow disabled:opacity-50"
                    >
                      {addAnotherExemplarMutation.isPending ? 'Salvando...' : 'Confirmar e Adicionar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Grid / Tabela de Aquisições */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="rounded-2xl border border-border overflow-hidden bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-3 w-12 text-center">#</th>
                        <th className="py-3 px-3">Data Aquisição</th>
                        <th className="py-3 px-3">Condição</th>
                        <th className="py-3 px-3">Preço Pago</th>
                        <th className="py-3 px-3">Loja / Origem</th>
                        <th className="py-3 px-3">Localização / Expositor</th>
                        <th className="py-3 px-3">Notas</th>
                        <th className="py-3 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {activeSelectedGroup.exemplars.map((ex, idx) => (
                        <tr key={ex.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 text-center font-mono font-bold text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-foreground">
                              <Calendar className="h-3 w-3 text-primary shrink-0" />
                              {ex.acquisitionDate
                                ? new Date(ex.acquisitionDate + 'T00:00:00').toLocaleDateString('pt-BR')
                                : <span className="text-muted-foreground/60">Não informada</span>}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[11px] font-semibold text-foreground border border-border">
                              <Tag className="h-2.5 w-2.5 text-primary" />
                              {ex.condition.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-semibold">
                            {ex.purchasePrice ? (
                              <span className="text-emerald-400">
                                R$ {parseFloat(ex.purchasePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap max-w-[150px] truncate text-muted-foreground">
                            {ex.purchaseLocation ? (
                              <span className="flex items-center gap-1 text-foreground" title={ex.purchaseLocation}>
                                <Store className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate">{ex.purchaseLocation}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-muted-foreground">
                            {ex.location ? (
                              <span className="flex items-center gap-1 text-foreground">
                                <MapPin className="h-3 w-3 text-accent shrink-0" />
                                <span className="truncate">{ex.location.name}</span>
                                {ex.location.gridRow && ex.location.gridColumn && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                    L{ex.location.gridRow}:C{ex.location.gridColumn}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <em className="text-muted-foreground/50">Sem local</em>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-[160px] truncate text-muted-foreground" title={ex.notes || ''}>
                            {ex.notes || <span className="text-muted-foreground/40">-</span>}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {ex.status === 'ACTIVE' ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditExemplar(ex);
                                    setEditPurchasePrice(ex.purchasePrice || '');
                                    setEditPurchaseLocation(ex.purchaseLocation || '');
                                    setEditAutomakerId(ex.automaker?.id || '');
                                    setEditVehicleModelId(ex.vehicleModel?.id || '');
                                    setEditConditionCode(ex.condition.code);
                                    setEditNotes(ex.notes || '');
                                    setEditError(null);
                                  }}
                                  title="Editar dados desta aquisição"
                                  className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-amber-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTargetLocation(ex.location?.id || '');
                                    setTargetGridRow(ex.location?.gridRow || '');
                                    setTargetGridColumn(ex.location?.gridColumn || '');
                                    setMoveError(null);
                                    setMoveExemplar(ex);
                                  }}
                                  title="Mover este exemplar de expositor ou nicho"
                                  className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5 text-accent" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSalePrice('');
                                    setBuyerName('');
                                    setSellExemplar(ex);
                                  }}
                                  title="Registrar venda deste exemplar"
                                  className="p-1.5 rounded-lg bg-secondary text-foreground hover:text-emerald-400 hover:bg-emerald-500/10 border border-border transition-colors cursor-pointer"
                                >
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRemovalMode('WRITE_OFF');
                                    setWriteOffReason('QUEBRA');
                                    setWriteOffDate(new Date().toISOString().split('T')[0]);
                                    setWriteOffNotes('');
                                    setWriteOffError(null);
                                    setDeleteExemplar(ex);
                                  }}
                                  title="Dar baixa ou remover da coleção"
                                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 border border-border transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                {ex.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-secondary/30 border-t border-border flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Exibindo {activeSelectedGroup.exemplars.length} exemplar(es) cadastrado(s) para este modelo.
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedGroup(null);
                  setIsAddingAnother(false);
                }}
                className="px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-muted border border-border font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalhes Completos da Miniatura & Exemplar */}
      {detailExemplar && (
        <MiniatureDetailModal
          variationId={detailExemplar.variation.id}
          onClose={() => setDetailExemplar(null)}
          exemplarContext={{
            id: detailExemplar.id,
            status: detailExemplar.status,
            condition: detailExemplar.condition,
            location: detailExemplar.location,
            acquisitionDate: detailExemplar.acquisitionDate,
            purchasePrice: detailExemplar.purchasePrice,
            purchaseLocation: detailExemplar.purchaseLocation,
            automaker: detailExemplar.automaker,
            vehicleModel: detailExemplar.vehicleModel,
            series: detailExemplar.series,
            notes: detailExemplar.notes,
            onMove: () => {
              setSelectedTargetLocation(detailExemplar.location?.id || '');
              setTargetGridRow(detailExemplar.location?.gridRow || '');
              setTargetGridColumn(detailExemplar.location?.gridColumn || '');
              setMoveError(null);
              setMoveExemplar(detailExemplar);
            },
            onSell: () => {
              setSalePrice('');
              setBuyerName('');
              setSellExemplar(detailExemplar);
            },
            onEdit: () => {
              setEditExemplar(detailExemplar);
              setEditPurchasePrice(detailExemplar.purchasePrice || '');
              setEditPurchaseLocation(detailExemplar.purchaseLocation || '');
              setEditAutomakerId(detailExemplar.automaker?.id || '');
              setEditVehicleModelId(detailExemplar.vehicleModel?.id || '');
              setEditConditionCode(detailExemplar.condition.code);
              setEditNotes(detailExemplar.notes || '');
              setEditError(null);
            },
            onDelete: () => {
              setRemovalMode('WRITE_OFF');
              setWriteOffReason('QUEBRA');
              setWriteOffDate(new Date().toISOString().split('T')[0]);
              setWriteOffNotes('');
              setWriteOffError(null);
              setDeleteExemplar(detailExemplar);
            },
          }}
        />
      )}

      {/* Modal: Importar Coleção em Lote */}
      <ImportCollectionModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['collection'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['acquisitions'] });
          setSuccessMsg('Importação concluída com sucesso!');
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />
    </div>
  );
}
