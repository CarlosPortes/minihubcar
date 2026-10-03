'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  X,
  Pencil,
  Check,
  Building2,
  Car,
  Tag,
  Sparkles,
  Layers,
  Ruler,
  Package,
  Barcode,
  Image as ImageIcon,
  ShieldAlert,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

interface EditCatalogModalProps {
  variationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditCatalogModal({
  variationId,
  isOpen,
  onClose,
  onSuccess,
}: EditCatalogModalProps) {
  const queryClient = useQueryClient();

  // Form State
  const [name, setName] = useState('');
  const [castingName, setCastingName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [selectedAutomakerId, setSelectedAutomakerId] = useState('');
  const [vehicleModelId, setVehicleModelId] = useState('');
  const [scaleId, setScaleId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [lineType, setLineType] = useState('MAINLINE');
  const [rarity, setRarity] = useState('REGULAR');
  const [seriesNumber, setSeriesNumber] = useState('');
  const [collectorNumber, setCollectorNumber] = useState('');
  const [releaseYear, setReleaseYear] = useState<number | ''>('');
  const [color, setColor] = useState('');
  const [finish, setFinish] = useState('');
  const [packaging, setPackaging] = useState('');
  const [edition, setEdition] = useState('');
  const [productCode, setProductCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Fetch variation details
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['catalog', 'detail', variationId],
    queryFn: () => apiClient<any>(`/catalog/variations/${variationId}`),
    enabled: isOpen && !!variationId,
  });

  // Fetch auxiliary options
  const { data: brandsData } = useQuery<{ data: Array<{ id: string; name: string }> }>({
    queryKey: ['admin', 'miniature-brands'],
    queryFn: () => apiClient('/admin/catalog/brands'),
    enabled: isOpen,
  });

  const { data: automakersData } = useQuery<{ data: Array<{ id: string; name: string; country: string | null }> }>({
    queryKey: ['admin', 'automakers'],
    queryFn: () => apiClient('/admin/catalog/automakers'),
    enabled: isOpen,
  });

  const { data: modelsData } = useQuery<{ data: Array<{ id: string; name: string; automakerId: string }> }>({
    queryKey: ['admin', 'vehicle-models', selectedAutomakerId],
    queryFn: () =>
      apiClient(
        selectedAutomakerId
          ? `/admin/catalog/vehicle-models?automakerId=${selectedAutomakerId}`
          : '/admin/catalog/vehicle-models'
      ),
    enabled: isOpen,
  });

  const { data: scalesData } = useQuery<{ data: Array<{ id: string; name: string; numerator: number; denominator: number }> }>({
    queryKey: ['admin', 'scales'],
    queryFn: () => apiClient('/admin/catalog/scales'),
    enabled: isOpen,
  });

  const { data: seriesData } = useQuery<{ data: Array<{ id: string; name: string }> }>({
    queryKey: ['admin', 'series', brandId],
    queryFn: () =>
      apiClient(brandId ? `/admin/catalog/series?brandId=${brandId}` : '/admin/catalog/series'),
    enabled: isOpen,
  });

  // Populate form when detailData loads
  useEffect(() => {
    if (detailData?.data) {
      const v = detailData.data;
      setName(v.name || '');
      setCastingName(v.casting?.name || '');
      setBrandId(v.brand?.id || '');
      setScaleId(v.scale?.id || '');
      setSeriesId(v.series?.id || '');
      setLineType(v.lineType || 'MAINLINE');
      setRarity(v.rarity || 'REGULAR');
      setSeriesNumber(v.seriesNumber || '');
      setCollectorNumber(v.collectorNumber || '');
      setReleaseYear(v.releaseYear || '');
      setColor(v.color || '');
      setFinish(v.finish || '');
      setPackaging(v.packaging || '');
      setEdition(v.edition || '');
      setPhotoUrl(v.photoUrl || '');
      setDescription(v.description || '');

      // Product code from primary identifier
      const primaryIdent = v.identifiers?.find((i: any) => i.isPrimary) || v.identifiers?.[0];
      setProductCode(primaryIdent?.code || '');

      // Vehicle model & automaker if linked
      if (v.vehicles && v.vehicles.length > 0) {
        setVehicleModelId(v.vehicles[0].modelId || '');
        setSelectedAutomakerId(v.vehicles[0].automakerId || '');
      } else if (v.casting?.automakerId) {
        setSelectedAutomakerId(v.casting.automakerId);
        setVehicleModelId('');
      } else {
        setVehicleModelId('');
        setSelectedAutomakerId('');
      }
    }
  }, [detailData]);

  // Mutation to update variation
  const updateMutation = useMutation({
    mutationFn: (body: any) =>
      apiClient(`/admin/catalog/variations/${variationId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['catalog', 'detail', variationId] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Erro ao atualizar miniatura');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Nome da miniatura é obrigatório.');
      return;
    }

    updateMutation.mutate({
      name: name.trim(),
      castingName: castingName.trim() || undefined,
      miniatureBrandId: brandId || undefined,
      automakerId: selectedAutomakerId || null,
      vehicleModelId: vehicleModelId || null,
      scaleId: scaleId || null,
      seriesId: seriesId || null,
      lineType: lineType || null,
      rarity: rarity || null,
      seriesNumber: seriesNumber.trim() || null,
      collectorNumber: collectorNumber.trim() || null,
      releaseYear: releaseYear ? Number(releaseYear) : null,
      color: color.trim() || null,
      finish: finish.trim() || null,
      packaging: packaging.trim() || null,
      edition: edition.trim() || null,
      productCode: productCode.trim() || null,
      photoUrl: photoUrl.trim() || null,
      description: description.trim() || null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-primary/40 shadow-glow overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-card/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Editar Cadastro no Catálogo Canônico
              </h2>
              <p className="text-xs text-muted-foreground">
                Atualize informações oficiais, metadados de colecionador e fotos da miniatura
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoadingDetail ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-xs">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
              Carregando dados da miniatura...
            </div>
          ) : (
            <>
              {/* Sessão 1: Identificação & Molde */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" /> 1. Nome & Molde Base
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Nome da Variação no Catálogo *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Molde Base (Casting)
                    </label>
                    <input
                      type="text"
                      value={castingName}
                      onChange={(e) => setCastingName(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Marca Fabricante
                    </label>
                    <select
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
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
                </div>
              </div>

              {/* Sessão 2: Vínculo com Veículo Real */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> 2. Veículo Real (Opcional)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Montadora
                    </label>
                    <select
                      value={selectedAutomakerId}
                      onChange={(e) => {
                        setSelectedAutomakerId(e.target.value);
                        setVehicleModelId('');
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Filtrar por Montadora...</option>
                      {automakersData?.data?.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Modelo do Veículo
                    </label>
                    <select
                      value={vehicleModelId}
                      onChange={(e) => setVehicleModelId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Sem veículo real associado</option>
                      {modelsData?.data?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sessão 3: Colecionador & Raridade */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> 3. Classificação de Colecionador & Série
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Classificação / Raridade
                    </label>
                    <select
                      value={rarity}
                      onChange={(e) => setRarity(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                    >
                      <option value="REGULAR">Regular (Comum)</option>
                      <option value="TH">🔥 TH (Treasure Hunt)</option>
                      <option value="STH">⭐ STH (Super Treasure Hunt)</option>
                      <option value="CHASE">🎯 CHASE (0/5)</option>
                      <option value="RLC">💎 RLC</option>
                      <option value="ZAMAC">⚡ ZAMAC</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Linha / Segmento
                    </label>
                    <select
                      value={lineType}
                      onChange={(e) => setLineType(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="MAINLINE">Mainline</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="EXCLUSIVE">Exclusive</option>
                      <option value="THEMED">Temático</option>
                      <option value="RLC">RLC</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Nº na Série (Ex: 4/5)
                    </label>
                    <input
                      type="text"
                      placeholder="4/5"
                      value={seriesNumber}
                      onChange={(e) => setSeriesNumber(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Nº Cartela / Colecionador
                    </label>
                    <input
                      type="text"
                      placeholder="142/250"
                      value={collectorNumber}
                      onChange={(e) => setCollectorNumber(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Escala
                    </label>
                    <select
                      value={scaleId}
                      onChange={(e) => setScaleId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Selecione Escala...</option>
                      {scalesData?.data?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Série / Sub-coleção
                    </label>
                    <select
                      value={seriesId}
                      onChange={(e) => setSeriesId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Nenhuma / Padrão</option>
                      {seriesData?.data?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Ano de Lançamento
                    </label>
                    <input
                      type="number"
                      placeholder="2024"
                      value={releaseYear}
                      onChange={(e) => setReleaseYear(e.target.value ? Number(e.target.value) : '')}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Código SKU / Barcode
                    </label>
                    <input
                      type="text"
                      placeholder="HRY45"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Sessão 4: Acabamento, Foto & Descrição */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> 4. Cores, Foto & Detalhes
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Cor Principal
                    </label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Acabamento
                    </label>
                    <input
                      type="text"
                      value={finish}
                      onChange={(e) => setFinish(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Embalagem
                    </label>
                    <input
                      type="text"
                      value={packaging}
                      onChange={(e) => setPackaging(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-2">
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
                            <span>Enviando foto...</span>
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

                    {photoUrl && (
                      <div className="flex items-center gap-3 pt-2">
                        <div className="w-32 aspect-4/3 rounded-xl bg-secondary overflow-hidden border border-border">
                          <MiniatureImage
                            src={photoUrl}
                            alt="Pré-visualização"
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
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Descrição & Detalhes
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted font-semibold text-xs border border-border"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={updateMutation.isPending || isLoadingDetail}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>
                {updateMutation.isPending ? 'Salvando Alterações...' : 'Salvar Alterações'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
