'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  MapPin,
  FolderTree,
  Plus,
  Box,
  Trash2,
  Check,
  X,
  LayoutGrid,
  Sparkles,
  Car,
  AlertCircle,
  Eye,
  Sliders,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from '@/i18n';

const Location3DViewer = dynamic(
  () => import('@/components/locations/Location3DViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] rounded-2xl bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3 border border-border">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs font-semibold">Carregando ambiente 3D...</span>
      </div>
    ),
  }
);

interface LocationNode {
  id: string;
  name: string;
  locationType: string | null;
  parentLocationId: string | null;
  hasGrid?: boolean;
  gridRows?: number | null;
  gridColumns?: number | null;
  status: string;
  occupiedCount?: number;
  totalCapacity?: number | null;
  availableCount?: number | null;
  occupancyPercent?: number | null;
  availabilityPercent?: number | null;
  children: LocationNode[];
}

interface LocationSummary {
  totalLocations: number;
  gridLocationsCount: number;
  globalCapacity: number;
  globalOccupied: number;
  globalAvailable: number;
  globalOccupancyPercent: number;
  globalAvailabilityPercent: number;
}

interface OccupiedSlot {
  exemplarId: string;
  gridRow: number;
  gridColumn: number;
  notes: string | null;
  variation: {
    id: string;
    name: string;
    color: string | null;
    releaseYear: number | null;
    photoUrl: string | null;
  };
  casting: {
    id: string;
    name: string;
  };
  brand: {
    id: string;
    name: string;
  };
  condition: {
    code: string;
    name: string;
  };
}

export default function LocationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [parentLocationId, setParentLocationId] = useState('');
  const [locationType, setLocationType] = useState('DISPLAY');
  const [hasGrid, setHasGrid] = useState(true);
  const [gridRows, setGridRows] = useState<number | ''>(5);
  const [gridColumns, setGridColumns] = useState<number | ''>(10);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal for Viewing Expositor Grid / 3D
  const [viewingGridLocation, setViewingGridLocation] = useState<LocationNode | null>(null);
  const [gridModalTab, setGridModalTab] = useState<'3D' | '2D'>('3D');
  const [percentViewMode, setPercentViewMode] = useState<'OCCUPANCY' | 'AVAILABILITY'>('OCCUPANCY');

  // Fetch locations
  const { data, isLoading } = useQuery<{
    data: {
      list: Array<{
        id: string;
        name: string;
        hasGrid?: boolean;
        gridRows?: number | null;
        gridColumns?: number | null;
        occupiedCount?: number;
        totalCapacity?: number | null;
        availableCount?: number | null;
        occupancyPercent?: number | null;
        availabilityPercent?: number | null;
      }>;
      tree: LocationNode[];
      summary?: LocationSummary;
    };
  }>({
    queryKey: ['locations', 'tree', user?.id],
    queryFn: () => apiClient('/locations'),
    enabled: isAuthenticated && !!user?.id,
  });

  // Query for active grid data when viewing modal is open
  const { data: gridQueryData, isLoading: isLoadingGrid } = useQuery<{
    data: {
      location: {
        id: string;
        name: string;
        locationType: string | null;
        hasGrid: boolean;
        gridRows: number | null;
        gridColumns: number | null;
      };
      occupiedSlots: OccupiedSlot[];
    };
  }>({
    queryKey: ['locations', viewingGridLocation?.id, 'grid', user?.id],
    queryFn: () => apiClient(`/locations/${viewingGridLocation?.id}/grid`),
    enabled: Boolean(viewingGridLocation?.id) && !!user?.id,
  });

  // Mutation: Create location
  const createMutation = useMutation({
    mutationFn: (body: any) =>
      apiClient('/locations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsCreating(false);
      setName('');
      setParentLocationId('');
      setHasGrid(true);
      setGridRows(5);
      setGridColumns(10);
      setSuccessMsg(t('locations.createSuccess'));
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  // Mutation: Delete location
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/locations/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setSuccessMsg(t('locations.deleteSuccess'));
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      parentLocationId: parentLocationId || undefined,
      locationType,
      hasGrid,
      gridRows: hasGrid && gridRows ? Number(gridRows) : undefined,
      gridColumns: hasGrid && gridColumns ? Number(gridColumns) : undefined,
    });
  };

  const renderTreeNodes = (nodes: LocationNode[], level = 0) => {
    return (
      <div className={`space-y-1.5 ${level > 0 ? 'ml-6 border-l border-border/70 pl-3' : ''}`}>
        {nodes.map((node) => {
          const totalNichos =
            node.hasGrid && node.gridRows && node.gridColumns
              ? node.gridRows * node.gridColumns
              : 0;

          return (
            <div key={node.id} className="space-y-1.5">
              <div className="group flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-accent/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-accent shrink-0">
                    <Box className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs font-semibold text-foreground">{node.name}</span>
                    {node.locationType && (
                      <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                        {node.locationType}
                      </span>
                    )}

                    {/* Grid and Occupancy / Availability Badges */}
                    {node.hasGrid && node.totalCapacity ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Occupancy / Availability Badge */}
                        {percentViewMode === 'OCCUPANCY' ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              (node.occupancyPercent ?? 0) >= 90
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : (node.occupancyPercent ?? 0) >= 70
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            <LayoutGrid className="h-2.5 w-2.5" />
                            {node.occupiedCount ?? 0}/{node.totalCapacity} nichos ({node.occupancyPercent ?? 0}% preenchido)
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              (node.availableCount ?? 0) === 0
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : (node.availabilityPercent ?? 0) <= 20
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {node.availableCount ?? 0} vagas livres ({node.availabilityPercent ?? 0}% disponível)
                          </span>
                        )}

                        {/* Mini Progress Bar */}
                        <div
                          className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden hidden sm:block border border-border/40"
                          title={`${node.occupancyPercent ?? 0}% preenchido • ${node.availabilityPercent ?? 0}% disponível`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (node.occupancyPercent ?? 0) >= 90
                                ? 'bg-amber-400'
                                : (node.occupancyPercent ?? 0) >= 70
                                ? 'bg-primary'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, node.occupancyPercent ?? 0)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      (node.occupiedCount ?? 0) > 0 && (
                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary border border-border flex items-center gap-1">
                          <Car className="h-2.5 w-2.5" />
                          {node.occupiedCount} {node.occupiedCount === 1 ? 'miniatura' : 'miniaturas'}
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {node.hasGrid && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setViewingGridLocation(node);
                          setGridModalTab('3D');
                        }}
                        title={t('locations.view3D')}
                        className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Box className="h-3.5 w-3.5" />
                        <span>{t('locations.view3D')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setViewingGridLocation(node);
                          setGridModalTab('2D');
                        }}
                        title={t('locations.view2D')}
                        className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <LayoutGrid className="h-3 w-3" />
                        <span className="hidden sm:inline">{t('locations.view2D')}</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setParentLocationId(node.id);
                      setIsCreating(true);
                    }}
                    title={t('locations.sublocation')}
                    className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('locations.sublocation')}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(t('locations.deleteLocationConfirm', { name: node.name }))) {
                        deleteMutation.mutate(node.id);
                      }
                    }}
                    title={t('common.delete')}
                    className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {node.children && node.children.length > 0 && renderTreeNodes(node.children, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const tree = data?.data?.tree || [];
  const flatList = data?.data?.list || [];
  const summary: LocationSummary = data?.data?.summary || {
    totalLocations: 0,
    gridLocationsCount: 0,
    globalCapacity: 0,
    globalOccupied: 0,
    globalAvailable: 0,
    globalOccupancyPercent: 0,
    globalAvailabilityPercent: 100,
  };

  // Computed slots for the active viewing modal
  const activeLocation = gridQueryData?.data?.location || viewingGridLocation;
  const occupiedSlots = gridQueryData?.data?.occupiedSlots || [];
  const totalSlotsCount =
    activeLocation?.gridRows && activeLocation?.gridColumns
      ? activeLocation.gridRows * activeLocation.gridColumns
      : 0;
  const occupiedMap = new Map<string, OccupiedSlot>();
  for (const slot of occupiedSlots) {
    if (slot.gridRow && slot.gridColumn) {
      occupiedMap.set(`${slot.gridRow}:${slot.gridColumn}`, slot);
    }
  }

  return (
    <div className="space-y-6">
      {/* Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t('locations.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t('locations.subtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setParentLocationId('');
            setIsCreating(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow transition-all self-start"
        >
          <Plus className="h-4 w-4" />
          {t('locations.newLocation')}
        </button>
      </div>

      {/* KPI Summary Cards: Ocupação e Disponibilidade */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Capacidade Total */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('locations.totalCapacity')}</span>
            <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-primary">
              <LayoutGrid className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground">
              {summary.globalCapacity}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('locations.capacitySubtitle', {
                count: summary.gridLocationsCount,
                locations: summary.gridLocationsCount === 1 ? 'local' : 'locais',
              })}
            </p>
          </div>
        </div>

        {/* Card 2: Miniaturas Alocadas (Preenchimento) */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('locations.occupancyFill')}</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Car className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">
                {summary.globalOccupancyPercent}%
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {t('locations.occupiedCount', { count: summary.globalOccupied })}
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.globalOccupancyPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Espaço Disponível (Vagas Livres) */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('locations.availability')}</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-400">
                {summary.globalAvailabilityPercent}%
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {t('locations.availableCount', { count: summary.globalAvailable })}
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden mt-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.globalAvailabilityPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Foco de Visualização (Alternador) */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">{t('locations.treeFocus')}</span>
            <Sliders className="h-4 w-4 text-accent" />
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex p-1 rounded-xl bg-secondary/80 border border-border text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPercentViewMode('OCCUPANCY')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  percentViewMode === 'OCCUPANCY'
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('locations.percentOccupied')}
              </button>
              <button
                type="button"
                onClick={() => setPercentViewMode('AVAILABILITY')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  percentViewMode === 'AVAILABILITY'
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('locations.percentAvailable')}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {percentViewMode === 'OCCUPANCY'
                ? 'Destaque para o percentual preenchido'
                : 'Destaque para vagas restantes'}
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Create Location Modal / Card */}
      {isCreating && (
        <div className="p-5 rounded-2xl bg-card border border-primary/40 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> {t('locations.newLocation')}
            </h3>
            <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">{t('locations.locationName')}</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Expositor Acrílico 01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">{t('locations.locationType')}</label>
                <select
                  value={locationType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocationType(val);
                    if (val === 'DISPLAY' || val === 'DRAWER') {
                      setHasGrid(true);
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="DISPLAY">Expositor / Vitrine (Parede/LxC)</option>
                  <option value="DRAWER">Gaveteiro / Estojo com Nichos</option>
                  <option value="SHELF">Prateleira Corrida</option>
                  <option value="CASE">Maleta de Colecionador</option>
                  <option value="CLOSET">Armário / Estante Fechada</option>
                  <option value="BOX">Caixa Organizadora</option>
                  <option value="ROOM">Cômodo / Sala</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">{t('locations.parentLocation')}</label>
                <select
                  value={parentLocationId}
                  onChange={(e) => setParentLocationId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">{t('locations.rootLocation')}</option>
                  {flatList.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid Configuration Section */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasGrid}
                    onChange={(e) => setHasGrid(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5 text-accent" />
                    {t('locations.hasGridCheckbox')}
                  </span>
                </label>

                {hasGrid && gridRows && gridColumns && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {t('locations.capacity')}: {Number(gridRows) * Number(gridColumns)} {t('locations.niches')}
                  </span>
                )}
              </div>

              {hasGrid && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      {t('locations.rowsCount')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required={hasGrid}
                      value={gridRows}
                      onChange={(e) => setGridRows(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                      placeholder="Ex: 5"
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      {t('locations.colsCount')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required={hasGrid}
                      value={gridColumns}
                      onChange={(e) => setGridColumns(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                      placeholder="Ex: 10"
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
                className="px-5 py-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-glow disabled:opacity-50"
              >
                {createMutation.isPending ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tree Visualization */}
      <div className="p-5 rounded-2xl bg-card border border-border">
        <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-accent" /> {t('locations.treeTitle')}
        </h2>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-card/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Box className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-xs">{t('locations.emptyTree')}</p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              {t('locations.emptyTreeDesc')}
            </p>
          </div>
        ) : (
          renderTreeNodes(tree)
        )}
      </div>

      {/* Modal: Interactive Expositor Grid Map */}
      {viewingGridLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-card/95">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  {gridModalTab === '3D' ? <Box className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    {activeLocation?.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>
                      Grade: {activeLocation?.gridRows}L × {activeLocation?.gridColumns}C ({totalSlotsCount} nichos)
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      {occupiedSlots.length} ocupados ({totalSlotsCount > 0 ? Math.round((occupiedSlots.length / totalSlotsCount) * 100) : 0}%)
                    </span>
                    <span>•</span>
                    <span>{totalSlotsCount - occupiedSlots.length} livres</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 3D vs 2D Switch */}
                <div className="flex items-center p-1 rounded-xl bg-secondary/80 border border-border">
                  <button
                    type="button"
                    onClick={() => setGridModalTab('3D')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      gridModalTab === '3D'
                        ? 'bg-primary text-primary-foreground shadow-glow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Box className="h-3.5 w-3.5" />
                    <span>{t('locations.shelf3D')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridModalTab('2D')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      gridModalTab === '2D'
                        ? 'bg-primary text-primary-foreground shadow-glow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>{t('locations.grid2D')}</span>
                  </button>
                </div>

                <button
                  onClick={() => setViewingGridLocation(null)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {gridModalTab === '3D' && activeLocation ? (
              <div className="flex-1 bg-zinc-950 p-2 sm:p-4 min-h-[580px] overflow-hidden flex flex-col">
                <Location3DViewer
                  location={{
                    id: activeLocation.id,
                    name: activeLocation.name,
                    locationType: activeLocation.locationType || 'DISPLAY',
                    hasGrid: Boolean(activeLocation.hasGrid),
                    gridRows: activeLocation.gridRows ?? 5,
                    gridColumns: activeLocation.gridColumns ?? 10,
                  }}
                  occupiedSlots={occupiedSlots}
                  onClose={() => setViewingGridLocation(null)}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4 sm:p-6 bg-background/50">
                {isLoadingGrid ? (
                  <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                    {t('common.loading')}
                  </div>
                ) : !activeLocation?.gridRows || !activeLocation?.gridColumns ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    {t('locations.emptyLocation')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Grid table */}
                    <div className="overflow-x-auto pb-4">
                      <div
                        className="grid gap-2 min-w-max"
                        style={{
                          gridTemplateColumns: `repeat(${activeLocation.gridColumns}, minmax(110px, 1fr))`,
                        }}
                      >
                        {Array.from({ length: activeLocation.gridRows }).map((_, rowIndex) => {
                          const r = rowIndex + 1;
                          return Array.from({ length: activeLocation.gridColumns! }).map((_, colIndex) => {
                            const c = colIndex + 1;
                            const key = `${r}:${c}`;
                            const item = occupiedMap.get(key);

                            return (
                              <div
                                key={key}
                                className={`group relative flex flex-col justify-between p-2 rounded-xl border transition-all ${
                                  item
                                    ? 'bg-card border-primary/30 shadow-sm hover:border-primary hover:shadow-md'
                                    : 'bg-card/30 border-border/60 border-dashed hover:border-border hover:bg-secondary/20'
                                } min-h-[120px]`}
                              >
                                {/* Slot label */}
                                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                  <span className={`font-bold ${item ? 'text-primary' : 'text-muted-foreground/60'}`}>
                                    L{r}:C{c}
                                  </span>
                                  {item ? (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                      {item.condition.code}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-muted-foreground/40 font-sans">{t('locations.available')}</span>
                                  )}
                                </div>

                                {/* Slot Content */}
                                {item ? (
                                  <div className="flex-1 flex flex-col justify-between space-y-1.5">
                                    {/* Compact Contained Image Cradle */}
                                    <div className="relative w-full h-14 rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-center p-1 overflow-hidden group-hover:bg-secondary/70 transition-colors">
                                      {item.variation.photoUrl ? (
                                        <img
                                          src={item.variation.photoUrl}
                                          alt={item.variation.name}
                                          className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                                          <Car className="h-5 w-5" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="truncate">
                                      <p className="text-[9px] font-bold text-accent truncate uppercase leading-tight">
                                        {item.brand.name}
                                      </p>
                                      <p className="text-[10px] font-semibold text-foreground truncate leading-tight mt-0.5" title={item.variation.name}>
                                        {item.variation.name}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="my-auto flex flex-col items-center justify-center text-muted-foreground/40 py-2">
                                    <Box className="h-4 w-4" />
                                    <span className="text-[9px] mt-0.5">{t('locations.available')}</span>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer (Only in 2D mode) */}
            {gridModalTab === '2D' && (
              <div className="p-4 border-t border-border bg-card/90 flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>{t('locations.nicheOccupied')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border border-dashed border-border bg-card/40" />
                    <span>{t('locations.nicheFree')}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingGridLocation(null)}
                  className="px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-muted font-semibold border border-border"
                >
                  {t('locations.close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
