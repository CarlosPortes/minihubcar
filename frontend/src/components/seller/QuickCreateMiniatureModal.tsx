'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { commercialApi } from '@/lib/api/commercial';
import {
  X,
  Plus,
  Layers,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Car,
  Tag,
  Calendar,
  Palette,
  Camera,
  Loader2,
} from 'lucide-react';

interface QuickCreateMiniatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (createdVariation: {
    id: string;
    name: string;
    photoUrl: string | null;
    brandName: string;
    releaseYear?: number | null;
    [key: string]: any;
  }) => void;
  initialName?: string;
}

export function QuickCreateMiniatureModal({
  isOpen,
  onClose,
  onCreated,
  initialName = '',
}: QuickCreateMiniatureModalProps) {
  const [name, setName] = useState(initialName);
  const [brandMode, setBrandMode] = useState<'SELECT' | 'CUSTOM'>('SELECT');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [customBrandName, setCustomBrandName] = useState('');

  const [automakerMode, setAutomakerMode] = useState<'SELECT' | 'CUSTOM'>('SELECT');
  const [selectedAutomakerId, setSelectedAutomakerId] = useState('');
  const [customAutomakerName, setCustomAutomakerName] = useState('');

  const [vehicleModelName, setVehicleModelName] = useState('');
  const [releaseYear, setReleaseYear] = useState<string>(String(new Date().getFullYear()));
  const [scaleDenominator, setScaleDenominator] = useState<number>(64);
  const [color, setColor] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Brands and Automakers from catalog filters
  const { data: filtersData } = useQuery({
    queryKey: ['catalog-filters-quick-create'],
    queryFn: async () => {
      const res = await apiClient<{
        data: {
          brands: Array<{ id: string; name: string }>;
          automakers: Array<{ id: string; name: string }>;
          scales: Array<{ id: string; name: string; denominator: number }>;
        };
      }>('/catalog/filters');
      return res.data;
    },
    enabled: isOpen,
  });

  const brands = filtersData?.brands || [];
  const automakers = filtersData?.automakers || [];

  // Reset or initialize when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialName && !name) {
        setName(initialName);
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialName]);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append('photo', file);

      const res = await apiClient<{ data: { url: string; publicUrl: string } }>('/media/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadedUrl = res.data.publicUrl || res.data.url;
      setPhotoUrl(uploadedUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao enviar foto. Tente colar um link direto.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Mutation: Quick Create
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error('Informe o nome da miniatura');
      }

      const brandIdToSend = brandMode === 'SELECT' && selectedBrandId ? selectedBrandId : undefined;
      const brandNameToSend =
        brandMode === 'CUSTOM'
          ? customBrandName.trim()
          : brands.find((b) => b.id === selectedBrandId)?.name || 'Outros';

      const automakerIdToSend =
        automakerMode === 'SELECT' && selectedAutomakerId ? selectedAutomakerId : undefined;
      const automakerNameToSend =
        automakerMode === 'CUSTOM' ? customAutomakerName.trim() : undefined;

      const res = await commercialApi.sellerQuickCreateMiniature({
        name: name.trim(),
        brandId: brandIdToSend,
        brandName: brandNameToSend,
        automakerId: automakerIdToSend,
        automakerName: automakerNameToSend,
        vehicleModelName: vehicleModelName.trim() || undefined,
        scaleDenominator,
        releaseYear: releaseYear ? parseInt(releaseYear, 10) : undefined,
        color: color.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        description: description.trim() || undefined,
      });

      return res.data;
    },
    onSuccess: (data) => {
      onCreated(data);
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Falha ao cadastrar miniatura.');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-500 border border-amber-500/20 mb-1">
              <Sparkles className="h-3 w-3" /> Vendedor Homologado
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground">
              Cadastrar Nova Miniatura para Pré-Venda
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastre o item ausente no catálogo para abrir sua campanha de pré-venda na hora. A homologação oficial pelo administrador será realizada posteriormente.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Nome da Miniatura / Edição */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Nome / Versão da Miniatura *
            </label>
            <input
              type="text"
              placeholder="Ex: Nissan Skyline GT-R R34 V-Spec II - Bayside Blue"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Informe a descrição completa do modelo para fácil identificação pelos colecionadores.
            </p>
          </div>

          {/* Grid: Marca & Montadora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Marca Fabricante */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-primary" /> Marca Fabricante *
                </label>
                <button
                  type="button"
                  onClick={() => setBrandMode(brandMode === 'SELECT' ? 'CUSTOM' : 'SELECT')}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {brandMode === 'SELECT' ? '+ Nova Marca' : 'Selecionar da Lista'}
                </button>
              </div>

              {brandMode === 'SELECT' ? (
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecione a marca...</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ex: Mini GT, Tarmac Works, Kaido House..."
                  value={customBrandName}
                  onChange={(e) => setCustomBrandName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50"
                />
              )}
            </div>

            {/* Montadora do Veículo */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Car className="h-3.5 w-3.5 text-primary" /> Montadora do Veículo
                </label>
                <button
                  type="button"
                  onClick={() => setAutomakerMode(automakerMode === 'SELECT' ? 'CUSTOM' : 'SELECT')}
                  className="text-[10px] text-primary hover:underline font-semibold"
                >
                  {automakerMode === 'SELECT' ? '+ Nova Montadora' : 'Selecionar da Lista'}
                </button>
              </div>

              {automakerMode === 'SELECT' ? (
                <select
                  value={selectedAutomakerId}
                  onChange={(e) => setSelectedAutomakerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecione a montadora (opcional)...</option>
                  {automakers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ex: Nissan, Porsche, Chevrolet, Ford..."
                  value={customAutomakerName}
                  onChange={(e) => setCustomAutomakerName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs text-foreground focus:ring-2 focus:ring-primary/50"
                />
              )}
            </div>
          </div>

          {/* Grid: Modelo, Escala, Ano e Cor */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Modelo do Veículo */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-foreground block mb-1">Modelo do Carro</label>
              <input
                type="text"
                placeholder="Ex: Skyline GT-R R34"
                value={vehicleModelName}
                onChange={(e) => setVehicleModelName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
              />
            </div>

            {/* Escala */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Escala</label>
              <select
                value={scaleDenominator}
                onChange={(e) => setScaleDenominator(parseInt(e.target.value, 10))}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
              >
                <option value={64}>1:64 (Padrão)</option>
                <option value={43}>1:43</option>
                <option value={18}>1:18</option>
                <option value={24}>1:24</option>
                <option value={87}>1:87</option>
                <option value={32}>1:32</option>
              </select>
            </div>

            {/* Ano / Previsão */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3 text-muted-foreground" /> Ano Previsão
              </label>
              <input
                type="number"
                placeholder="Ex: 2026"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
              />
            </div>

            {/* Cor */}
            <div>
              <label className="text-xs font-semibold text-foreground flex items-center gap-1 mb-1">
                <Palette className="h-3 w-3 text-muted-foreground" /> Cor / Acabamento
              </label>
              <input
                type="text"
                placeholder="Ex: Azul Metálico"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
              />
            </div>
          </div>

          {/* Foto de Divulgação / Render */}
          <div className="space-y-2 p-3.5 rounded-xl bg-secondary/30 border border-border">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-primary" /> Foto / Render de Divulgação do Fabricante
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Preview Box */}
              <div className="h-20 w-28 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Layers className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>

              {/* Upload or Link Input */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors">
                    {isUploadingPhoto ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    <span>{isUploadingPhoto ? 'Enviando foto...' : 'Fazer Upload de Imagem'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-muted-foreground">ou cole a URL abaixo:</span>
                </div>

                <input
                  type="text"
                  placeholder="https://exemplo.com/render-divulgacao.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Observações Opcionais */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Notas ou Detalhes da Miniatura (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Edição limitada com blister especial / cota oficial de distribuidor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Ficará selecionada automaticamente para sua pré-venda</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={createMutation.isPending || !name.trim()}
              onClick={() => createMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-glow hover:bg-primary/90 transition-all disabled:opacity-40"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Cadastrar e Usar no Anúncio</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
