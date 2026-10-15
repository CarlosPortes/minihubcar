'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  PackageCheck,
  Sparkles,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Store,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { externalPreOrdersApi, ExternalPreOrderItem, ConvertToCollectionInput } from '@/lib/api/external-pre-orders';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

interface ConvertToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preOrder: ExternalPreOrderItem | null;
  onSuccess?: () => void;
}

export function ConvertToCollectionModal({
  isOpen,
  onClose,
  preOrder,
  onSuccess,
}: ConvertToCollectionModalProps) {
  const queryClient = useQueryClient();

  const [conditionCode, setConditionCode] = useState('MINT');
  const [locationId, setLocationId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch user locations
  const { data: locations } = useQuery<{ data: Array<{ id: string; name: string }> }>({
    queryKey: ['locations', 'list'],
    queryFn: () => apiClient('/locations'),
    enabled: isOpen,
  });

  const convertMutation = useMutation({
    mutationFn: (payload: ConvertToCollectionInput) => {
      if (!preOrder) throw new Error('Pré-venda não selecionada');
      return externalPreOrdersApi.convertToCollection(preOrder.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders-summary'] });
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['acquisitions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Erro ao converter para a coleção.');
    },
  });

  if (!isOpen || !preOrder) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    convertMutation.mutate({
      conditionCode,
      locationId: locationId || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Recebido! Mover para a Coleção</h3>
              <p className="text-xs text-muted-foreground">
                Incorpore esta miniatura ao seu acervo e histórico de aquisições
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        {/* Miniatura Card Preview */}
        <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-secondary/40">
          <div className="h-14 w-14 rounded-lg bg-background border border-border overflow-hidden shrink-0">
            <MiniatureImage
              src={preOrder.displayPhoto}
              alt={preOrder.displayName}
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
              {preOrder.displayBrand} • {preOrder.displayScale}
            </span>
            <h4 className="text-sm font-bold text-foreground truncate">{preOrder.displayName}</h4>
            <p className="text-xs text-muted-foreground">
              Origem: <strong>{preOrder.sellerName}</strong> • Custo: R${' '}
              {parseFloat(preOrder.totalAmount).toFixed(2)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Estado / Condição da Peça *
            </label>
            <select
              value={conditionCode}
              onChange={(e) => setConditionCode(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
            >
              <option value="MINT">MINT (Perfeito / Lacrado de Fábrica)</option>
              <option value="IN_BOX">IN BOX (Na embalagem / caixa aberta)</option>
              <option value="LOOSE">LOOSE (Fora da embalagem em perfeito estado)</option>
              <option value="DAMAGED">COM DETALHES (Pequenas marcas / avarias)</option>
              <option value="CUSTOM">CUSTOMIZADO (Pintura / Rodas modificadas)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" /> Guardar em qual Expositor / Local? (Opcional)
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
            >
              <option value="">Nenhum (Definir depois)</option>
              {locations?.data?.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Observações Adicionais para a Coleção
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Cota recebida em perfeito estado, modelo muito detalhado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none resize-none"
            />
          </div>

          <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-[11px] text-muted-foreground flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              Ao confirmar, a pré-venda será marcada como <strong>RECEBIDA</strong>, o exemplar entrará
              na sua coleção e o valor total pago será lançado nas suas <strong>Aquisições</strong>.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={convertMutation.isPending}
              className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={convertMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow transition-all disabled:opacity-50"
            >
              {convertMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Movendo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Confirmar e Mover
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
