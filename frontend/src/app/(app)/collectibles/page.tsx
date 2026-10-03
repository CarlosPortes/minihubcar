'use client';

import React, { useState, useEffect } from 'react';
import {
  Shapes,
  Plus,
  Search,
  Filter,
  MapPin,
  Tag,
  DollarSign,
  Package,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Trash2,
  Edit,
  ExternalLink,
  Crown,
  Layers,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  collectiblesApi,
  CustomCollectible,
  CollectiblesSummary,
  CollectibleCategory,
  CreateCollectibleInput,
} from '@/lib/api/collectibles';
import { subscriptionsApi, UserLimits } from '@/lib/api/subscriptions';
import { apiClient } from '@/lib/api/client';

const CATEGORY_LABELS: Record<CollectibleCategory, { name: string; color: string }> = {
  FUNKO_POP: { name: 'Funko Pop', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  STATUE_RESIN: { name: 'Estátua / Resina', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  BUST: { name: 'Busto', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  ACTION_FIGURE: { name: 'Action Figure', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  DIORAMA: { name: 'Diorama', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  MEMORABILIA: { name: 'Memorabilia', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  OTHER: { name: 'Outro Colecionável', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
};

export default function CollectiblesPage() {
  const [collectibles, setCollectibles] = useState<CustomCollectible[]>([]);
  const [summary, setSummary] = useState<CollectiblesSummary | null>(null);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomCollectible | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<CreateCollectibleInput>({
    name: '',
    category: 'FUNKO_POP',
    manufacturer: '',
    franchise: '',
    characterOrSubject: '',
    releaseYear: null,
    edition: '',
    scale: '',
    conditionCode: 'MINT',
    purchasePrice: null,
    purchaseLocation: '',
    acquisitionDate: '',
    locationId: '',
    gridRow: null,
    gridColumn: null,
    photoUrl: '',
    notes: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [listRes, sumRes, limRes, locsRes] = await Promise.all([
        collectiblesApi.list({
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          locationId: selectedLocation !== 'ALL' ? selectedLocation : undefined,
          q: searchQuery || undefined,
        }),
        collectiblesApi.getSummary().catch(() => ({ data: { totalCount: 0, totalInvested: 0, byCategory: [] } })),
        subscriptionsApi.getMyLimits().catch(() => null),
        apiClient<any>('/locations').catch(() => ({ data: { list: [] } })),
      ]);

      setCollectibles(listRes.data || []);
      setSummary(sumRes.data);
      if (limRes) setLimits(limRes.data);

      const locList = Array.isArray(locsRes?.data)
        ? locsRes.data
        : Array.isArray(locsRes?.data?.list)
        ? locsRes.data.list
        : [];
      setUserLocations(locList);
    } catch (err) {
      console.error('Erro ao carregar colecionáveis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedLocation]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'FUNKO_POP',
      manufacturer: '',
      franchise: '',
      characterOrSubject: '',
      releaseYear: null,
      edition: '',
      scale: '',
      conditionCode: 'MINT',
      purchasePrice: null,
      purchaseLocation: '',
      acquisitionDate: new Date().toISOString().split('T')[0],
      locationId: '',
      gridRow: null,
      gridColumn: null,
      photoUrl: '',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CustomCollectible) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      manufacturer: item.manufacturer || '',
      franchise: item.franchise || '',
      characterOrSubject: item.characterOrSubject || '',
      releaseYear: item.releaseYear || null,
      edition: item.edition || '',
      scale: item.scale || '',
      conditionCode: item.conditionCode,
      purchasePrice: item.purchasePrice ? parseFloat(item.purchasePrice) : null,
      purchaseLocation: item.purchaseLocation || '',
      acquisitionDate: item.acquisitionDate || '',
      locationId: item.location?.id || '',
      gridRow: item.gridRow || null,
      gridColumn: item.gridColumn || null,
      photoUrl: item.photoUrl || '',
      notes: item.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover "${name}" do seu acervo?`)) return;
    try {
      await collectiblesApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover item.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload: CreateCollectibleInput = {
        ...formData,
        locationId: formData.locationId ? formData.locationId : null,
        gridRow: formData.gridRow ? Number(formData.gridRow) : null,
        gridColumn: formData.gridColumn ? Number(formData.gridColumn) : null,
        purchasePrice: formData.purchasePrice != null ? Number(formData.purchasePrice) : null,
        releaseYear: formData.releaseYear ? Number(formData.releaseYear) : null,
      };

      if (editingItem) {
        await collectiblesApi.update(editingItem.id, payload);
      } else {
        await collectiblesApi.create(payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar colecionável. Verifique os campos.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const locationsList = Array.isArray(userLocations) ? userLocations : [];
  const selectedLocObj = locationsList.find((l) => l.id === formData.locationId);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card/90 to-primary/10 border border-border p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              Acervo Especial de Coleções
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Outros Colecionáveis (Funkos, Estátuas & Resinas)
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Organize seus Funko Pops, bustos, estátuas em resina e action figures compartilhando as
              mesmas estantes e expositores físicos das suas miniaturas.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Colecionável
          </button>
        </div>
      </div>

      {/* Summary & Limits Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total & Invested */}
        <div className="rounded-xl bg-card border border-border p-5 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total no Acervo Especial
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-black text-foreground">{summary?.totalCount || 0}</p>
            <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              R$ {(summary?.totalInvested || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Soma patrimonial investida em peças fora do catálogo diecast 1:64
          </p>
        </div>

        {/* Quota Progress */}
        <div className="rounded-xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Limite do seu Plano ({limits?.plan.name || 'Starter'})
            </span>
            <Link
              href="/plans"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Crown className="w-3.5 h-3.5" />
              Upgrade
            </Link>
          </div>

          <div className="flex items-baseline justify-between">
            <p className="text-xl font-bold text-foreground">
              {limits?.otherCollectibles.current || 0} /{' '}
              {limits?.otherCollectibles.max === -1 ? 'Ilimitado' : limits?.otherCollectibles.max || 15}{' '}
              <span className="text-xs text-muted-foreground font-normal">peças</span>
            </p>
            {limits?.otherCollectibles.max !== -1 && (
              <span className="text-xs font-mono font-medium text-muted-foreground">
                {limits?.otherCollectibles.percentage}%
              </span>
            )}
          </div>

          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                (limits?.otherCollectibles.percentage || 0) > 85
                  ? 'bg-rose-500'
                  : 'bg-primary'
              }`}
              style={{
                width: `${
                  limits?.otherCollectibles.max === -1
                    ? 100
                    : Math.min(100, limits?.otherCollectibles.percentage || 0)
                }%`,
              }}
            />
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="rounded-xl bg-card border border-border p-5 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Destaques por Categoria
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {summary?.byCategory && summary.byCategory.length > 0 ? (
              summary.byCategory.map((cat) => {
                const label = CATEGORY_LABELS[cat.category] || { name: cat.category, color: '' };
                return (
                  <span
                    key={cat.category}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary text-foreground border border-border"
                  >
                    <span>{label.name}:</span>
                    <strong className="text-primary font-bold">{cat.count}</strong>
                  </span>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic">Nenhum colecionável cadastrado ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos ({summary?.totalCount || 0})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, val]) => (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedCategory === catKey
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {val.name}
            </button>
          ))}
        </div>

        {/* Search & Location Select */}
        <div className="flex items-center gap-2">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Todos os Locais</option>
            {locationsList.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Buscar personagem, franquia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground w-48 md:w-60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          </form>
        </div>
      </div>

      {/* Grid of Collectibles */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Carregando acervo...</div>
      ) : collectibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Shapes className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base">Nenhum colecionável encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Cadastre suas primeiras peças em resina, bustos ou Funko Pops para ter controle total do seu acervo.
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Minha Primeira Peça
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {collectibles.map((item) => {
            const catLabel = CATEGORY_LABELS[item.category] || { name: item.category, color: '' };
            return (
              <div
                key={item.id}
                className="group rounded-2xl bg-card border border-border overflow-hidden flex flex-col hover:border-border/80 transition-all hover:shadow-lg"
              >
                {/* Photo or Placeholder */}
                <div className="relative aspect-square bg-secondary/30 overflow-hidden flex items-center justify-center">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center p-4 text-muted-foreground/50 space-y-1">
                      <Shapes className="w-10 h-10 mx-auto opacity-40" />
                      <span className="text-[11px]">Sem foto</span>
                    </div>
                  )}

                  {/* Badge Category */}
                  <span
                    className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${catLabel.color}`}
                  >
                    {catLabel.name}
                  </span>

                  {/* Condition Badge */}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-background/80 text-foreground backdrop-blur-md border border-border/40">
                    {item.conditionCode}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {item.manufacturer && <span className="font-medium text-foreground">{item.manufacturer}</span>}
                      {item.manufacturer && item.franchise && <span>•</span>}
                      {item.franchise && <span>{item.franchise}</span>}
                    </div>

                    <h3 className="font-bold text-foreground text-sm line-clamp-2 leading-snug" title={item.name}>
                      {item.name}
                    </h3>

                    {item.characterOrSubject && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.characterOrSubject}</p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                    {/* Location */}
                    {item.location && (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="line-clamp-1">
                          {item.location.name}
                          {item.gridRow && item.gridColumn ? ` (L${item.gridRow}, C${item.gridColumn})` : ''}
                        </span>
                      </div>
                    )}

                    {/* Price and Year */}
                    <div className="flex items-center justify-between text-[11px]">
                      {item.purchasePrice ? (
                        <span className="font-mono font-bold text-foreground">
                          R$ {parseFloat(item.purchasePrice).toFixed(2).replace('.', ',')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Valor não informado</span>
                      )}

                      {item.releaseYear && (
                        <span className="text-muted-foreground font-mono">{item.releaseYear}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/30">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 md:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-foreground">
                {editingItem ? 'Editar Colecionável' : 'Cadastrar Novo Colecionável'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preencha os detalhes da sua estátua, funko, busto ou action figure
              </p>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Nome da Peça *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Funko Pop Batman 1989 #275"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Categoria & Fabricante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Categoria *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as CollectibleCategory })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Fabricante / Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Funko, Iron Studios, Hot Toys"
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Franquia & Personagem */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Franquia / Tema</label>
                  <input
                    type="text"
                    placeholder="Ex: DC Comics, Marvel, Star Wars"
                    value={formData.franchise || ''}
                    onChange={(e) => setFormData({ ...formData, franchise: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Personagem / Assunto</label>
                  <input
                    type="text"
                    placeholder="Ex: Batman, Darth Vader"
                    value={formData.characterOrSubject || ''}
                    onChange={(e) => setFormData({ ...formData, characterOrSubject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Ano, Edição e Escala */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Ano</label>
                  <input
                    type="number"
                    placeholder="Ex: 2023"
                    value={formData.releaseYear || ''}
                    onChange={(e) => setFormData({ ...formData, releaseYear: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Edição</label>
                  <input
                    type="text"
                    placeholder="Ex: Chase, SDCC"
                    value={formData.edition || ''}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Escala</label>
                  <input
                    type="text"
                    placeholder="Ex: 1/10, 1/6"
                    value={formData.scale || ''}
                    onChange={(e) => setFormData({ ...formData, scale: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Localização Física & Nicho */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-3">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Localização Física no seu Acervo
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[11px] text-muted-foreground">Expositor / Local</label>
                    <select
                      value={formData.locationId || ''}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Sem local definido</option>
                      {locationsList.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.hasGrid ? `(Grade ${loc.gridRows}x${loc.gridColumns})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedLocObj?.hasGrid && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Linha (1 a {selectedLocObj.gridRows})
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={selectedLocObj.gridRows || undefined}
                          value={formData.gridRow || ''}
                          onChange={(e) => setFormData({ ...formData, gridRow: e.target.value ? parseInt(e.target.value, 10) : null })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">
                          Coluna (1 a {selectedLocObj.gridColumns})
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={selectedLocObj.gridColumns || undefined}
                          value={formData.gridColumn || ''}
                          onChange={(e) => setFormData({ ...formData, gridColumn: e.target.value ? parseInt(e.target.value, 10) : null })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Preço Pago e Foto URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Preço Pago (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 149.90"
                    value={formData.purchasePrice ?? ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Foto da Peça (URL)</label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    value={formData.photoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Observações / Detalhes</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Adquirido na CCXP 2023, caixa lacrada com selo de autenticidade..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {formSubmitting ? 'Salvando...' : editingItem ? 'Atualizar Peça' : 'Cadastrar Peça'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
