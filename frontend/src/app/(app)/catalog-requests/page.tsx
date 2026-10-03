'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  Inbox,
  Plus,
  Check,
  X,
  Clock,
  Car,
  Tag,
  Building2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Lightbulb,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import { FeedbackSuggestionsSection } from '@/features/feedback/FeedbackSuggestionsSection';

interface CatalogRequest {
  id: string;
  requestType: string;
  proposedData: {
    name?: string;
    brand?: string;
    isNewBrand?: boolean;
    newBrandName?: string;
    isFantasy?: boolean;
    automaker?: string;
    vehicleModel?: string;
    year?: number;
    scale?: string;
    series?: string;
    lineType?: string;
    rarity?: string;
    color?: string;
    finish?: string;
    packaging?: string;
    productCode?: string;
    photoUrl?: string;
    notes?: string;
  };
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedAt: string | null;
  createdAt: string;
}

interface FilterOptions {
  brands: Array<{ id: string; name: string }>;
  automakers: Array<{ id: string; name: string; country?: string }>;
  scales: Array<{ id: string; name: string; numerator: number; denominator: number }>;
}

export default function CatalogRequestsPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN');

  const [pageSection, setPageSection] = useState<'MINIATURES' | 'SUGGESTIONS'>('MINIATURES');
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Form Fields
  const [modelName, setModelName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Hot Wheels');
  const [isNewBrand, setIsNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [isFantasy, setIsFantasy] = useState(false);
  const [automaker, setAutomaker] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [year, setYear] = useState('');
  const [scale, setScale] = useState('1:64');
  const [series, setSeries] = useState('');
  const [lineType, setLineType] = useState('MAINLINE');
  const [rarity, setRarity] = useState('REGULAR');
  const [color, setColor] = useState('');
  const [finish, setFinish] = useState('');
  const [productCode, setProductCode] = useState('');
  const [packaging, setPackaging] = useState('Cartela');
  const [notes, setNotes] = useState('');

  // Photo upload
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch catalog filter options (brands, automakers, etc.)
  const { data: filterData } = useQuery<{ data: FilterOptions }>({
    queryKey: ['catalog', 'filters'],
    queryFn: () => apiClient('/catalog/filters'),
  });

  const { data, isLoading } = useQuery<{ data: CatalogRequest[] }>({
    queryKey: ['catalog-requests', 'mine'],
    queryFn: () => apiClient('/catalog-requests/mine'),
    enabled: isAuthenticated,
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setPhotoUploadError(null);
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
      setPhotoUploadError(err.message || 'Erro ao realizar upload da imagem');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const createMutation = useMutation({
    mutationFn: (body: any) =>
      apiClient('/catalog-requests', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-requests'] });
      setIsCreating(false);
      resetForm();
      setSuccessMsg('Solicitação enviada para a moderação com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Erro ao enviar solicitação');
    },
  });

  const resetForm = () => {
    setModelName('');
    setSelectedBrand('Hot Wheels');
    setIsNewBrand(false);
    setNewBrandName('');
    setIsFantasy(false);
    setAutomaker('');
    setVehicleModel('');
    setYear('');
    setScale('1:64');
    setSeries('');
    setLineType('MAINLINE');
    setRarity('REGULAR');
    setColor('');
    setFinish('');
    setProductCode('');
    setPackaging('Cartela');
    setNotes('');
    setPhotoUrl('');
    setPhotoUploadError(null);
    setErrorMsg(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) return;

    if (isNewBrand && !newBrandName.trim()) {
      setErrorMsg('Por favor, informe o nome do novo fabricante.');
      return;
    }

    const brandValue = isNewBrand ? newBrandName.trim() : selectedBrand;

    createMutation.mutate({
      requestType: 'CREATE',
      proposedData: {
        name: modelName.trim(),
        brand: brandValue,
        isNewBrand,
        newBrandName: isNewBrand ? newBrandName.trim() : undefined,
        isFantasy,
        automaker: !isFantasy && automaker ? automaker.trim() : undefined,
        vehicleModel: !isFantasy && vehicleModel ? vehicleModel.trim() : undefined,
        year: year ? parseInt(year, 10) : undefined,
        scale,
        series: series.trim() || undefined,
        lineType,
        rarity,
        color: color.trim() || undefined,
        finish: finish.trim() || undefined,
        packaging: packaging.trim() || undefined,
        productCode: productCode.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      reason: notes.trim() || undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground">Acesse sua conta</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Você precisa estar logado para enviar sugestões de miniaturas para o catálogo oficial.
        </p>
        <Link
          href="/login"
          className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow"
        >
          Fazer Login
        </Link>
      </div>
    );
  }

  const requests = data?.data || [];
  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
            Aprovada
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 text-[10px] font-bold">
            Rejeitada
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
            Pendente
          </span>
        );
    }
  };

  const defaultBrands = [
    'Hot Wheels',
    'Matchbox',
    'Mini GT',
    'Kaido House',
    'Tarmac Works',
    'Inno64',
    'Tomica',
    'Greenlight',
    'Johnny Lightning',
    'Auto World',
    'M2 Machines',
    'Majorette',
  ];

  const availableBrands = Array.from(
    new Set([
      ...defaultBrands,
      ...(filterData?.data?.brands?.map((b) => b.name) || []),
    ])
  ).sort();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-wider">
              Colaboração Comunitária
            </span>
            <span className="text-xs text-muted-foreground">• Expansão do Catálogo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            Solicitações ao Catálogo
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Sugira novas miniaturas, novos fabricantes e correções para enriquecer o banco de dados oficial.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <Link
              href="/catalog-requests/pending"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/20 transition-all"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Revisar Pendentes (Admin)
            </Link>
          )}

          <button
            onClick={() => {
              setPageSection('MINIATURES');
              setIsCreating(true);
              resetForm();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow transition-all"
          >
            <Plus className="h-4 w-4" />
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex border-b border-border bg-secondary/20 rounded-xl overflow-hidden p-1 gap-1">
        <button
          onClick={() => setPageSection('MINIATURES')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            pageSection === 'MINIATURES'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Car className="w-4 h-4" />
          Solicitar Nova Miniatura no Catálogo
        </button>

        <button
          onClick={() => setPageSection('SUGGESTIONS')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            pageSection === 'SUGGESTIONS'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Ideias & Sugestões de Melhorias
        </button>
      </div>

      {pageSection === 'SUGGESTIONS' ? (
        <FeedbackSuggestionsSection />
      ) : (
        <>
          {/* Global Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* ======================================================= */}
      {/* FORM: SOLICITAR CADASTRO COMPLETO DE NOVA MINIATURA     */}
      {/* ======================================================= */}
      {isCreating && (
        <div className="p-6 rounded-2xl bg-card border border-primary/40 shadow-card space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Sugerir Nova Miniatura para o Catálogo</h3>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Bloco 1: Identificação & Fabricante */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span>1. Identificação da Miniatura & Fabricante</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Nome do Modelo / Variação <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Nissan Skyline GT-R R34 Nismo Z-Tune"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Fabricante: Dropdown ou Novo Fabricante */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Fabricante da Miniatura <span className="text-primary">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewBrand(!isNewBrand);
                        if (!isNewBrand) setNewBrandName('');
                      }}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      {isNewBrand ? '← Escolher da lista' : '+ Novo Fabricante'}
                    </button>
                  </div>

                  {!isNewBrand ? (
                    <select
                      value={selectedBrand}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsNewBrand(true);
                          setNewBrandName('');
                        } else {
                          setSelectedBrand(e.target.value);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {availableBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value="__NEW__" className="font-bold text-primary">
                        + Cadastrar Novo Fabricante...
                      </option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Digite o nome do novo fabricante (ex: Para64, BBR...)"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-primary/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                  {isNewBrand && (
                    <p className="text-[11px] text-primary/90 mt-1">
                      Este novo fabricante será avaliado e cadastrado no sistema pelos administradores.
                    </p>
                  )}
                </div>

                {/* Código SKU / Produto */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Código do Produto / SKU / Cartela (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: HKC16, MGT00650, 42/250"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Carro Real & Especificações */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>2. Veículo Real & Molde</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFantasy}
                    onChange={(e) => setIsFantasy(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    Molde Fantasia / Sem carro real correspondente
                  </span>
                </label>
              </div>

              {!isFantasy && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Montadora Real
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Nissan, Porsche, Chevrolet, Ford..."
                      value={automaker}
                      onChange={(e) => setAutomaker(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Modelo do Carro Real
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Skyline GT-R, 911 GT3, Camaro, Mustang..."
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              {/* Escala, Ano, Série, Linha */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Escala</label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="1:64">1:64</option>
                    <option value="1:43">1:43</option>
                    <option value="1:32">1:32</option>
                    <option value="1:24">1:24</option>
                    <option value="1:18">1:18</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Ano Lançamento</label>
                  <input
                    type="number"
                    placeholder="Ex: 2024"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Linha / Segmento</label>
                  <select
                    value={lineType}
                    onChange={(e) => setLineType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="MAINLINE">Mainline (Básico)</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="EXCLUSIVE">Exclusivo</option>
                    <option value="THEMED">Temático</option>
                    <option value="RLC">RLC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Raridade</label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="REGULAR">Regular (Comum)</option>
                    <option value="TH">🔥 TH</option>
                    <option value="STH">⭐ STH</option>
                    <option value="CHASE">🎯 Chase</option>
                    <option value="RLC">💎 RLC</option>
                  </select>
                </div>
              </div>

              {/* Série, Cor, Acabamento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Série / Coleção</label>
                  <input
                    type="text"
                    placeholder="Ex: Car Culture, Boulevard, HW Turbo..."
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Cor Predominante</label>
                  <input
                    type="text"
                    placeholder="Ex: Azul Metálico, Vermelho..."
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Acabamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Metálico, Fosco, Spectraflame..."
                    value={finish}
                    onChange={(e) => setFinish(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Upload de Foto da Miniatura */}
            <div className="space-y-4 border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                <span>3. Foto da Miniatura</span>
              </div>

              <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 flex flex-col sm:flex-row items-center gap-4">
                {/* Preview Thumbnail */}
                <div className="h-28 w-28 rounded-xl bg-secondary border border-border overflow-hidden shrink-0 flex items-center justify-center relative">
                  {photoUrl ? (
                    <MiniatureImage
                      src={photoUrl}
                      alt="Prévia da miniatura"
                      containerClassName="w-full h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground/40 gap-1">
                      <Car className="h-8 w-8" />
                      <span className="text-[10px] font-semibold">Sem foto</span>
                    </div>
                  )}

                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-1">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      <span className="text-[10px] font-bold text-foreground">Enviando...</span>
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Subir Imagem da Miniatura</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Fotos nítidas da miniatura ou do blister facilitam e aceleram a aprovação pelos curadores.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow transition-all">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{photoUrl ? 'Trocar Foto' : 'Selecionar Foto'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                      />
                    </label>

                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/20 transition-colors"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>

                  {photoUploadError && (
                    <p className="text-xs text-destructive font-medium">{photoUploadError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 4: Observações e Justificativa */}
            <div className="space-y-2 border-t border-border/50 pt-4">
              <label className="block text-xs font-semibold text-foreground">
                Informações Adicionais / Justificativa / Links de Referência
              </label>
              <textarea
                placeholder="Detalhes sobre a edição especial, link da fabricante oficial, imagem de referência ou motivo da solicitação..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/50">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!modelName.trim() || createMutation.isPending || isUploadingPhoto}
                className="px-5 py-2.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-glow disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Enviar Solicitação para Curadoria</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================= */}
      {/* FILTER TABS & REQUESTS LIST                             */}
      {/* ======================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            Minhas Solicitações ({requests.length})
          </h2>

          <div className="flex items-center gap-1">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === status
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {status === 'ALL' && 'Todas'}
                {status === 'PENDING' && 'Pendentes'}
                {status === 'APPROVED' && 'Aprovadas'}
                {status === 'REJECTED' && 'Rejeitadas'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-card/60 animate-pulse border border-border" />
            ))
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-card border border-border">
              <Inbox className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-bold text-foreground">Nenhuma solicitação encontrada</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {filterStatus === 'ALL'
                  ? 'Você ainda não enviou sugestões de miniaturas. Clique em "Nova Solicitação" para começar!'
                  : 'Nenhuma solicitação corresponde ao filtro selecionado.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((r) => {
              const isExpanded = expandedRequestId === r.id;
              const p = r.proposedData || {};

              return (
                <div
                  key={r.id}
                  className="rounded-2xl bg-card border border-border hover:border-border/80 transition-all overflow-hidden"
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="h-14 w-14 rounded-xl bg-secondary border border-border shrink-0 overflow-hidden flex items-center justify-center">
                        {p.photoUrl ? (
                          <MiniatureImage
                            src={p.photoUrl}
                            alt={p.name || 'Miniatura'}
                            containerClassName="w-full h-full"
                          />
                        ) : (
                          <Car className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {p.name || 'Sugestão de miniatura'}
                          </span>
                          {getStatusBadge(r.status)}
                          {p.isNewBrand && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                              Novo Fabricante
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Marca: <strong className="text-foreground">{p.brand || 'Não informada'}</strong>
                          </span>
                          {p.automaker && (
                            <span>
                              Montadora: <strong className="text-foreground">{p.automaker}</strong>
                            </span>
                          )}
                          {p.year && <span>Ano: {p.year}</span>}
                          {p.scale && <span>Escala: {p.scale}</span>}
                          {p.productCode && (
                            <span className="font-mono bg-secondary/80 px-1.5 py-0.2 rounded text-[11px]">
                              {p.productCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Info & Toggle */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                      </div>

                      <button
                        onClick={() => setExpandedRequestId(isExpanded ? null : r.id)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/60 bg-secondary/20 space-y-3 animate-in fade-in text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Linha / Raridade</span>
                          <span className="font-semibold text-foreground">
                            {p.lineType || 'MAINLINE'} • {p.rarity || 'REGULAR'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Série</span>
                          <span className="font-semibold text-foreground">{p.series || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Cor & Acabamento</span>
                          <span className="font-semibold text-foreground">
                            {p.color || 'N/A'} {p.finish ? `(${p.finish})` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Embalagem</span>
                          <span className="font-semibold text-foreground">{p.packaging || 'Cartela'}</span>
                        </div>
                      </div>

                      {p.notes && (
                        <div className="p-2.5 rounded-xl bg-background border border-border">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">
                            Observações do Colecionador:
                          </span>
                          <p className="text-muted-foreground italic">&ldquo;{p.notes}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
