'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  Car,
  Database,
  Plus,
  Check,
  Building2,
  Tag,
  Sparkles,
  Layers,
  Ruler,
  Package,
  Barcode,
  Image as ImageIcon,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Pencil,
  Search,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import { EditCatalogModal } from '../../catalog/EditCatalogModal';



// Tipos para as entidades auxiliares
interface Automaker {
  id: string;
  name: string;
  country: string | null;
}

interface VehicleModel {
  id: string;
  name: string;
  automakerId: string;
  automakerName: string;
}

interface MiniatureBrand {
  id: string;
  name: string;
  description: string | null;
}

interface SeriesItem {
  id: string;
  name: string;
  miniatureBrandId: string;
  brandName?: string;
}

interface ScaleItem {
  id: string;
  name: string;
  numerator: number;
  denominator: number;
}

export default function AdminCatalogPage() {
  const queryClient = useQueryClient();
  const { user, claimAdmin } = useAuth();
  const isAdmin = user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN');

  // Tabs de nível superior
  const [activeTab, setActiveTab] = useState<'create-variation' | 'edit-variation' | 'auxiliary-tables'>('create-variation');
  // Sub-tab das tabelas auxiliares
  const [auxTab, setAuxTab] = useState<'automakers' | 'models' | 'brands' | 'series' | 'scales'>('automakers');

  // Edit variation modal state
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);

  // Search state for tab 'edit-variation'
  const [searchVariationTerm, setSearchVariationTerm] = useState('');

  // Feedback messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdVariationId, setCreatedVariationId] = useState<string | null>(null);


  // ----------------------------------------------------
  // Form State: Cadastrar Miniatura no Catálogo
  // ----------------------------------------------------
  const [brandId, setBrandId] = useState('');
  const [castingName, setCastingName] = useState('');
  const [fantasyFlag, setFantasyFlag] = useState(false);
  const [selectedAutomakerId, setSelectedAutomakerId] = useState('');
  const [vehicleModelId, setVehicleModelId] = useState('');
  const [scaleId, setScaleId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [lineType, setLineType] = useState('MAINLINE');
  const [rarity, setRarity] = useState('REGULAR');
  const [seriesNumber, setSeriesNumber] = useState('');
  const [collectorNumber, setCollectorNumber] = useState('');
  const [variationName, setVariationName] = useState('');
  const [releaseYear, setReleaseYear] = useState<number | ''>(new Date().getFullYear());
  const [color, setColor] = useState('');
  const [finish, setFinish] = useState('');
  const [packaging, setPackaging] = useState('Cartela Longa');
  const [edition, setEdition] = useState('');
  const [productCode, setProductCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setErrorMessage(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient<{ data: { url: string } }>('/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (res?.data?.url) {
        setPhotoUrl(res.data.url);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao fazer upload da foto');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // ----------------------------------------------------
  // Form States: Tabelas Auxiliares
  // ----------------------------------------------------
  const [newAutomakerName, setNewAutomakerName] = useState('');
  const [newAutomakerCountry, setNewAutomakerCountry] = useState('');

  const [newModelAutomakerId, setNewModelAutomakerId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');

  const [newSeriesBrandId, setNewSeriesBrandId] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');

  const [newScaleName, setNewScaleName] = useState('');
  const [newScaleNumerator, setNewScaleNumerator] = useState(1);
  const [newScaleDenominator, setNewScaleDenominator] = useState(64);

  // ----------------------------------------------------
  // Queries
  // ----------------------------------------------------
  const { data: automakersData } = useQuery<{ data: Automaker[] }>({
    queryKey: ['admin', 'automakers'],
    queryFn: () => apiClient('/admin/catalog/automakers'),
    enabled: isAdmin,
  });

  const { data: modelsData } = useQuery<{ data: VehicleModel[] }>({
    queryKey: ['admin', 'vehicle-models', selectedAutomakerId],
    queryFn: () =>
      apiClient(
        selectedAutomakerId
          ? `/admin/catalog/vehicle-models?automakerId=${selectedAutomakerId}`
          : '/admin/catalog/vehicle-models'
      ),
    enabled: isAdmin,
  });

  const { data: allModelsData } = useQuery<{ data: VehicleModel[] }>({
    queryKey: ['admin', 'all-vehicle-models'],
    queryFn: () => apiClient('/admin/catalog/vehicle-models'),
    enabled: isAdmin,
  });

  const { data: brandsData } = useQuery<{ data: MiniatureBrand[] }>({
    queryKey: ['admin', 'miniature-brands'],
    queryFn: () => apiClient('/admin/catalog/brands'),
    enabled: isAdmin,
  });

  const { data: seriesData } = useQuery<{ data: SeriesItem[] }>({
    queryKey: ['admin', 'series', brandId],
    queryFn: () =>
      apiClient(brandId ? `/admin/catalog/series?brandId=${brandId}` : '/admin/catalog/series'),
    enabled: isAdmin,
  });

  const { data: allSeriesData } = useQuery<{ data: SeriesItem[] }>({
    queryKey: ['admin', 'all-series'],
    queryFn: () => apiClient('/admin/catalog/series'),
    enabled: isAdmin,
  });

  const { data: scalesData } = useQuery<{ data: ScaleItem[] }>({
    queryKey: ['admin', 'scales'],
    queryFn: () => apiClient('/admin/catalog/scales'),
    enabled: isAdmin,
  });

  const { data: searchCatalogData, isLoading: isSearchingCatalog } = useQuery<{
    data: Array<{
      id: string;
      name: string;
      releaseYear: number | null;
      color: string | null;
      photoUrl: string | null;
      seriesNumber?: string | null;
      collectorNumber?: string | null;
      rarity?: string | null;
      brand: { name: string };
      casting: { name: string };
      scale: { name: string } | null;
    }>;
  }>({
    queryKey: ['admin', 'catalog-search', searchVariationTerm],
    queryFn: () =>
      apiClient('/catalog/search', {
        params: {
          q: searchVariationTerm || undefined,
          pageSize: 24,
        },
      }),
    enabled: isAdmin && activeTab === 'edit-variation',
  });


  // ----------------------------------------------------
  // Mutations
  // ----------------------------------------------------
  const createVariationMutation = useMutation({
    mutationFn: (body: any) =>
      apiClient('/admin/catalog/variations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (res: any) => {
      setSuccessMessage('Miniatura cadastrada com sucesso no catálogo oficial!');
      setCreatedVariationId(res?.data?.variationId || null);
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      // Reset form fields
      setVariationName('');
      setCastingName('');
      setColor('');
      setFinish('');
      setProductCode('');
      setPhotoUrl('');
      setSeriesNumber('');
      setCollectorNumber('');
      setDescription('');
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Erro ao cadastrar miniatura no catálogo');
    },
  });

  // Auxiliary Mutations
  const createAutomakerMutation = useMutation({
    mutationFn: (body: { name: string; country?: string }) =>
      apiClient('/admin/catalog/automakers', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'automakers'] });
      setNewAutomakerName('');
      setNewAutomakerCountry('');
      setSuccessMessage('Montadora cadastrada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => setErrorMessage(err?.message || 'Erro ao criar montadora'),
  });

  const createModelMutation = useMutation({
    mutationFn: (body: { automakerId: string; name: string }) =>
      apiClient('/admin/catalog/vehicle-models', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vehicle-models'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-vehicle-models'] });
      setNewModelName('');
      setSuccessMessage('Modelo de veículo cadastrado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => setErrorMessage(err?.message || 'Erro ao criar modelo'),
  });

  const createBrandMutation = useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      apiClient('/admin/catalog/brands', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'miniature-brands'] });
      setNewBrandName('');
      setNewBrandDesc('');
      setSuccessMessage('Marca de miniatura cadastrada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => setErrorMessage(err?.message || 'Erro ao criar marca'),
  });

  const createSeriesMutation = useMutation({
    mutationFn: (body: { miniatureBrandId: string; name: string }) =>
      apiClient('/admin/catalog/series', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'series'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-series'] });
      setNewSeriesName('');
      setSuccessMessage('Série cadastrada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => setErrorMessage(err?.message || 'Erro ao criar série'),
  });

  const createScaleMutation = useMutation({
    mutationFn: (body: { name: string; numerator: number; denominator: number }) =>
      apiClient('/admin/catalog/scales', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'scales'] });
      setNewScaleName('');
      setSuccessMessage('Escala cadastrada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => setErrorMessage(err?.message || 'Erro ao criar escala'),
  });

  // Handler Submit Cadastrar Miniatura
  const handleCreateVariation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!brandId) {
      setErrorMessage('Por favor, selecione a marca da miniatura.');
      return;
    }
    if (!castingName.trim()) {
      setErrorMessage('Por favor, informe o nome do molde (casting).');
      return;
    }
    if (!variationName.trim()) {
      setErrorMessage('Por favor, informe o nome da variação da miniatura.');
      return;
    }

    createVariationMutation.mutate({
      miniatureBrandId: brandId,
      castingName: castingName.trim(),
      fantasyFlag,
      vehicleModelId: !fantasyFlag && vehicleModelId ? vehicleModelId : null,
      seriesId: seriesId || null,
      scaleId: scaleId || null,
      name: variationName.trim(),
      releaseYear: releaseYear ? Number(releaseYear) : null,
      color: color.trim() || null,
      finish: finish.trim() || null,
      packaging: packaging.trim() || null,
      edition: edition.trim() || null,
      seriesNumber: seriesNumber.trim() || null,
      collectorNumber: collectorNumber.trim() || null,
      lineType: lineType || null,
      rarity: rarity || null,
      description: description.trim() || null,
      photoUrl: photoUrl.trim() || null,
      productCode: productCode.trim() || null,
    });
  };

  // Se não for admin, exibe aviso com opção de auto-promoção para desenvolvimento
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 max-w-lg mx-auto">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acesso Restrito à Governança</h2>
        <p className="text-sm text-muted-foreground">
          O usuário logado atualmente (<strong className="text-foreground">{user?.email || 'Visitante'}</strong>) ainda não possui as credenciais de <strong className="text-primary">Administrador do Catálogo</strong>.
        </p>

        <div className="p-4 rounded-xl bg-card border border-border w-full text-left space-y-2">
          <p className="text-xs font-semibold text-foreground">Como acessar:</p>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li>Faça login com a conta de admin: <span className="font-mono text-foreground font-semibold">admin@minihubcar.com.br</span> / <span className="font-mono text-foreground font-semibold">Password123!</span></li>
            <li>Ou clique no botão abaixo para ativar a função de Administrador nesta conta:</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            onClick={async () => {
              await claimAdmin();
              setSuccessMessage('Permissões de Administrador ativadas com sucesso!');
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Ativar Permissões de Administrador nesta Conta</span>
          </button>
          <Link
            href="/catalog"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-xs border border-border text-center"
          >
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-wider">
              Painel de Governança
            </span>
            <span className="text-xs text-muted-foreground">• Catálogo Canônico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            Gerenciador do Catálogo Oficial
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Cadastre novas miniaturas canônicas e administre montadoras, modelos, marcas, séries e escalas.
          </p>
        </div>

        <Link
          href="/catalog"
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-foreground hover:bg-muted border border-border text-xs font-semibold transition-colors"
        >
          <span>Visualizar Catálogo</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          {createdVariationId && (
            <Link
              href={`/catalog`}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 text-[11px] font-bold underline flex items-center gap-1"
            >
              Ver no Catálogo <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navegação entre Abas Principais */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => {
            setActiveTab('create-variation');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'create-variation'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Plus className="h-4 w-4" />
          Cadastrar Miniatura Canônica
        </button>

        <button
          onClick={() => {
            setActiveTab('edit-variation');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'edit-variation'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Pencil className="h-4 w-4" />
          Buscar & Editar Miniaturas Existentes
        </button>

        <button
          onClick={() => {
            setActiveTab('auxiliary-tables');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'auxiliary-tables'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <Database className="h-4 w-4" />
          Tabelas Auxiliares (Montadoras, Modelos, etc.)
        </button>
      </div>


      {/* ==================================================== */}
      {/* ABA 1: FORMULÁRIO DE CADASTRO DE MINIATURA CANÔNICA  */}
      {/* ==================================================== */}
      {activeTab === 'create-variation' && (
        <form onSubmit={handleCreateVariation} className="space-y-6 animate-in fade-in">
          {/* Sessão 1: Marca & Molde */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Car className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                1. Marca Fabricante & Molde Base (Casting)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Marca da Miniatura *
                </label>
                <select
                  value={brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value);
                    setSeriesId('');
                  }}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecione a Marca...</option>
                  {brandsData?.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Nome do Molde (Casting) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: '71 Datsun 510 ou Porsche 911 GT3"
                  value={castingName}
                  onChange={(e) => {
                    setCastingName(e.target.value);
                    if (!variationName) setVariationName(e.target.value);
                  }}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fantasyFlag}
                    onChange={(e) => setFantasyFlag(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Molde Fantasia / Fictício (sem carro real)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Sessão 2: Vínculo com Veículo Real (se não for fantasia) */}
          {!fantasyFlag && (
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  2. Veículo Real (Montadora & Modelo Automotivo)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Montadora do Carro Real
                  </label>
                  <select
                    value={selectedAutomakerId}
                    onChange={(e) => {
                      setSelectedAutomakerId(e.target.value);
                      setVehicleModelId('');
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Selecione a Montadora (Ex: Porsche, Nissan...)</option>
                    {automakersData?.data?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.country ? `(${a.country})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Modelo do Veículo
                  </label>
                  <select
                    value={vehicleModelId}
                    onChange={(e) => setVehicleModelId(e.target.value)}
                    disabled={!selectedAutomakerId}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    <option value="">
                      {selectedAutomakerId
                        ? 'Selecione o Modelo do Veículo...'
                        : 'Primeiro selecione a montadora acima'}
                    </option>
                    {modelsData?.data?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Sessão 3: Escala, Série & Classificação de Colecionador */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                3. Série, Escala & Classificação de Colecionador (STH, TH, Cartela)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Escala da Miniatura
                </label>
                <select
                  value={scaleId}
                  onChange={(e) => setScaleId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecione a Escala...</option>
                  {scalesData?.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.numerator}:{s.denominator})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Série / Sub-coleção
                </label>
                <select
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Nenhuma / Série Padrão</option>
                  {seriesData?.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Linha / Segmento
                </label>
                <select
                  value={lineType}
                  onChange={(e) => setLineType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="MAINLINE">Mainline (Básico de Linha)</option>
                  <option value="PREMIUM">Premium (Pneus de Borracha / Metal)</option>
                  <option value="EXCLUSIVE">Exclusivo (Loja / Evento)</option>
                  <option value="THEMED">Temático</option>
                  <option value="RLC">Red Line Club (RLC)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Classificação / Raridade
                </label>
                <select
                  value={rarity}
                  onChange={(e) => setRarity(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-semibold"
                >
                  <option value="REGULAR">Regular (Comum)</option>
                  <option value="TH">🔥 TH (Treasure Hunt)</option>
                  <option value="STH">⭐ STH (Super Treasure Hunt)</option>
                  <option value="CHASE">🎯 CHASE (Edição Perseguição / 0/5)</option>
                  <option value="RLC">💎 RLC (Edição de Colecionador)</option>
                  <option value="ZAMAC">⚡ ZAMAC (Sem Pintura)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Número na Série (Ex: 4/5)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 4/5 ou 01/10"
                  value={seriesNumber}
                  onChange={(e) => setSeriesNumber(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Nº Cartela / Colecionador
                </label>
                <input
                  type="text"
                  placeholder="Ex: 142/250 ou MGT00038"
                  value={collectorNumber}
                  onChange={(e) => setCollectorNumber(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Sessão 4: Variação, Acabamento, Foto & SKU */}
          <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                4. Especificações da Variação & Foto
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Nome da Variação no Catálogo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: '71 Datsun 510 Spectraflame Blue STH"
                  value={variationName}
                  onChange={(e) => setVariationName(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Ano de Lançamento
                </label>
                <input
                  type="number"
                  placeholder="Ex: 2024"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Cor Principal
                </label>
                <input
                  type="text"
                  placeholder="Ex: Spectraflame Blue, Vermelho Metálico"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Acabamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Spectraflame, Metálico, Fosco, Zamac"
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Embalagem
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cartela Longa, Curta, Caixa Acrílica"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Edição Especial / Detalhes
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1ª Edição, Coleção 2024"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Código do Produto / SKU / Barcode
                </label>
                <input
                  type="text"
                  placeholder="Ex: HRY45 ou 074299057854"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Foto Oficial da Miniatura
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                  <label
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:bg-primary-hover transition-colors shadow-glow shrink-0 ${
                      isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload do Computador</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-muted-foreground shrink-0">ou link / caminho:</span>
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      placeholder="ex: /catalog-media/hw/2026/JJH30.jpg ou https://..."
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Descrição & Histórico da Variação
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais sobre o modelo, adesivos, rodas especiais ou curiosidades históricas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Preview da Foto se inserida */}
            {photoUrl && (
              <div className="pt-2 border-t border-border/60">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Pré-visualização da Imagem:
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-48 aspect-4/3 rounded-xl bg-secondary overflow-hidden border border-border">
                    <MiniatureImage
                      src={photoUrl}
                      alt="Preview"
                      containerClassName="w-full h-full bg-secondary flex items-center justify-center overflow-hidden"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover foto
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botão de Envio */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={createVariationMutation.isPending}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-hover shadow-glow flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>
                {createVariationMutation.isPending
                  ? 'Cadastrando no Catálogo...'
                  : 'Salvar no Catálogo Oficial'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* ==================================================== */}
      {/* ABA 2: BUSCAR & EDITAR MINIATURAS EXISTENTES         */}
      {/* ==================================================== */}
      {activeTab === 'edit-variation' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Search bar */}
          <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquise por nome, marca, molde ou código para editar..."
                value={searchVariationTerm}
                onChange={(e) => setSearchVariationTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0 font-medium">
              {searchCatalogData?.data?.length || 0} miniaturas listadas
            </span>
          </div>

          {/* Results Grid */}
          {isSearchingCatalog ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-xs">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
              Carregando miniaturas do catálogo oficial...
            </div>
          ) : !searchCatalogData?.data || searchCatalogData.data.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-card border border-border text-muted-foreground text-xs">
              Nenhuma miniatura encontrada com o termo pesquisado. Digite outro nome acima.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchCatalogData.data.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-card border border-border hover:border-primary/50 flex items-center gap-3 transition-all"
                >
                  <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden border border-border shrink-0 flex items-center justify-center">
                    <MiniatureImage
                      src={item.photoUrl}
                      alt={item.name}
                      containerClassName="w-full h-full bg-secondary flex items-center justify-center overflow-hidden"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-primary truncate">
                        {item.brand.name}
                      </span>
                      {item.scale && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                          {item.scale.name}
                        </span>
                      )}
                      {item.rarity && item.rarity !== 'REGULAR' && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          {item.rarity}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-foreground truncate mt-0.5" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.casting?.name} {item.releaseYear ? `• ${item.releaseYear}` : ''}
                    </p>
                  </div>

                  <button
                    onClick={() => setEditingVariationId(item.id)}
                    className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Editar Cadastro"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* ABA 3: GERENCIAMENTO DE TABELAS AUXILIARES           */}
      {/* ==================================================== */}
      {activeTab === 'auxiliary-tables' && (

        <div className="space-y-6 animate-in fade-in">
          {/* Sub-tabs pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAuxTab('automakers')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                auxTab === 'automakers'
                  ? 'bg-secondary text-primary border border-primary/30 shadow-sm'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Montadoras ({automakersData?.data?.length || 0})
            </button>

            <button
              onClick={() => setAuxTab('models')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                auxTab === 'models'
                  ? 'bg-secondary text-primary border border-primary/30 shadow-sm'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              <Car className="h-3.5 w-3.5" />
              Modelos de Veículos ({allModelsData?.data?.length || 0})
            </button>

            <button
              onClick={() => setAuxTab('brands')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                auxTab === 'brands'
                  ? 'bg-secondary text-primary border border-primary/30 shadow-sm'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              Marcas de Miniaturas ({brandsData?.data?.length || 0})
            </button>

            <button
              onClick={() => setAuxTab('series')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                auxTab === 'series'
                  ? 'bg-secondary text-primary border border-primary/30 shadow-sm'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Séries & Coleções ({allSeriesData?.data?.length || 0})
            </button>

            <button
              onClick={() => setAuxTab('scales')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                auxTab === 'scales'
                  ? 'bg-secondary text-primary border border-primary/30 shadow-sm'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              <Ruler className="h-3.5 w-3.5" />
              Escalas ({scalesData?.data?.length || 0})
            </button>
          </div>

          {/* SUB-ABA: MONTADORAS */}
          {auxTab === 'automakers' && (
            <div className="space-y-4">
              {/* Form Nova Montadora */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newAutomakerName.trim()) return;
                  createAutomakerMutation.mutate({
                    name: newAutomakerName.trim(),
                    country: newAutomakerCountry.trim() || undefined,
                  });
                }}
                className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center gap-3"
              >
                <input
                  type="text"
                  placeholder="Nome da Montadora (ex: Porsche, Ferrari, Nissan)"
                  value={newAutomakerName}
                  onChange={(e) => setNewAutomakerName(e.target.value)}
                  required
                  className="w-full sm:flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="text"
                  placeholder="País de Origem (ex: Alemanha, Japão)"
                  value={newAutomakerCountry}
                  onChange={(e) => setNewAutomakerCountry(e.target.value)}
                  className="w-full sm:w-56 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={createAutomakerMutation.isPending}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Montadora
                </button>
              </form>

              {/* Tabela de Montadoras */}
              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Montadora</th>
                      <th className="py-3 px-4">País</th>
                      <th className="py-3 px-4 text-right">Identificador (UUID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {automakersData?.data?.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{item.country || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground">
                          {item.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA: MODELOS DE VEÍCULOS */}
          {auxTab === 'models' && (
            <div className="space-y-4">
              {/* Form Novo Modelo vinculado à Montadora */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newModelAutomakerId || !newModelName.trim()) return;
                  createModelMutation.mutate({
                    automakerId: newModelAutomakerId,
                    name: newModelName.trim(),
                  });
                }}
                className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center gap-3"
              >
                <select
                  value={newModelAutomakerId}
                  onChange={(e) => setNewModelAutomakerId(e.target.value)}
                  required
                  className="w-full sm:w-64 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecione a Montadora *</option>
                  {automakersData?.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nome do Modelo do Veículo (ex: 911 GT3 RS, Skyline GT-R R34)"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  required
                  className="w-full sm:flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={createModelMutation.isPending}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Modelo
                </button>
              </form>

              {/* Tabela de Modelos */}
              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Modelo do Carro</th>
                      <th className="py-3 px-4">Montadora Vinculada</th>
                      <th className="py-3 px-4 text-right">Identificador (UUID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {allModelsData?.data?.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-md bg-secondary text-foreground font-semibold border border-border">
                            {item.automakerName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground">
                          {item.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA: MARCAS DE MINIATURAS */}
          {auxTab === 'brands' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newBrandName.trim()) return;
                  createBrandMutation.mutate({
                    name: newBrandName.trim(),
                    description: newBrandDesc.trim() || undefined,
                  });
                }}
                className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center gap-3"
              >
                <input
                  type="text"
                  placeholder="Nome da Marca de Miniatura (ex: Hot Wheels, Mini GT, Matchbox)"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  required
                  className="w-full sm:flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="text"
                  placeholder="Descrição ou Fabricante Principal (opcional)"
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  className="w-full sm:w-64 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={createBrandMutation.isPending}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Marca
                </button>
              </form>

              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Marca de Miniatura</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4 text-right">Identificador (UUID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {brandsData?.data?.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{item.description || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground">
                          {item.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA: SÉRIES & COLEÇÕES */}
          {auxTab === 'series' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSeriesBrandId || !newSeriesName.trim()) return;
                  createSeriesMutation.mutate({
                    miniatureBrandId: newSeriesBrandId,
                    name: newSeriesName.trim(),
                  });
                }}
                className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center gap-3"
              >
                <select
                  value={newSeriesBrandId}
                  onChange={(e) => setNewSeriesBrandId(e.target.value)}
                  required
                  className="w-full sm:w-64 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecione a Marca *</option>
                  {brandsData?.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nome da Série / Coleção (ex: HW Heavyweights, Car Culture, Boulevard)"
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  required
                  className="w-full sm:flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="submit"
                  disabled={createSeriesMutation.isPending}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Série
                </button>
              </form>

              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Série / Sub-coleção</th>
                      <th className="py-3 px-4">Marca Vinculada</th>
                      <th className="py-3 px-4 text-right">Identificador (UUID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {allSeriesData?.data?.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-md bg-secondary text-primary font-semibold border border-border">
                            {item.brandName || 'Marca'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground">
                          {item.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-ABA: ESCALAS */}
          {auxTab === 'scales' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newScaleName.trim()) return;
                  createScaleMutation.mutate({
                    name: newScaleName.trim(),
                    numerator: Number(newScaleNumerator) || 1,
                    denominator: Number(newScaleDenominator) || 64,
                  });
                }}
                className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center gap-3"
              >
                <input
                  type="text"
                  placeholder="Nome da Escala (ex: 1:64, 1:87, 1:43)"
                  value={newScaleName}
                  onChange={(e) => setNewScaleName(e.target.value)}
                  required
                  className="w-full sm:flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Razão:</span>
                  <input
                    type="number"
                    value={newScaleNumerator}
                    onChange={(e) => setNewScaleNumerator(Number(e.target.value))}
                    className="w-16 h-10 px-2 rounded-xl bg-background border border-border text-sm text-center text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">:</span>
                  <input
                    type="number"
                    value={newScaleDenominator}
                    onChange={(e) => setNewScaleDenominator(Number(e.target.value))}
                    className="w-20 h-10 px-2 rounded-xl bg-background border border-border text-sm text-center text-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createScaleMutation.isPending}
                  className="w-full sm:w-auto h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Escala
                </button>
              </form>

              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground uppercase tracking-wider font-bold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Escala</th>
                      <th className="py-3 px-4">Proporção Matemática</th>
                      <th className="py-3 px-4 text-right">Identificador (UUID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {scalesData?.data?.map((item) => (
                      <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {item.numerator} para {item.denominator}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground">
                          {item.id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Edição de Miniatura (Admin) */}
      <EditCatalogModal
        variationId={editingVariationId}
        isOpen={!!editingVariationId}
        onClose={() => setEditingVariationId(null)}
        onSuccess={() => {
          setSuccessMessage('Miniatura atualizada com sucesso no catálogo oficial!');
          queryClient.invalidateQueries({ queryKey: ['admin', 'catalog-search'] });
          queryClient.invalidateQueries({ queryKey: ['catalog'] });
        }}
      />
    </div>
  );
}

