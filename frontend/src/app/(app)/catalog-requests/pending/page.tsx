'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  Inbox,
  Check,
  X,
  Clock,
  Car,
  User,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Tag,
  Sparkles,
  Layers,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

interface PendingRequest {
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
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function PendingCatalogRequestsPage() {
  const queryClient = useQueryClient();
  const { user, claimAdmin } = useAuth();
  const isAdmin = user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN');

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: PendingRequest[] }>({
    queryKey: ['catalog-requests', 'pending'],
    queryFn: () => apiClient('/catalog-requests/pending'),
    enabled: isAdmin,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: 'APPROVED' | 'REJECTED'; comment?: string }) =>
      apiClient(`/catalog-requests/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-requests'] });
      setReviewingId(null);
      setReviewAction(null);
      setReviewComment('');
      setSuccessMsg(
        variables.status === 'APPROVED'
          ? 'Solicitação aprovada com sucesso!'
          : 'Solicitação rejeitada com sucesso.'
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Erro ao processar moderação');
    },
  });

  const handleOpenReview = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setReviewingId(id);
    setReviewAction(action);
    setReviewComment('');
    setErrorMsg(null);
  };

  const handleConfirmReview = () => {
    if (!reviewingId || !reviewAction) return;
    reviewMutation.mutate({
      id: reviewingId,
      status: reviewAction,
      comment: reviewComment.trim() || undefined,
    });
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 max-w-lg mx-auto">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acesso Restrito à Moderação</h2>
        <p className="text-sm text-muted-foreground">
          Apenas curadores e administradores de catálogo podem revisar solicitações de novos cadastros.
        </p>
        <button
          onClick={async () => {
            await claimAdmin();
            setSuccessMsg('Permissões de Administrador ativadas!');
          }}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow"
        >
          Ativar Permissões de Administrador
        </button>
      </div>
    );
  }

  const pendingList = data?.data || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
              Painel de Moderação
            </span>
            <span className="text-xs text-muted-foreground">• Curadoria de Catálogo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            Revisão de Solicitações ({pendingList.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Analise sugestões enviadas pelos colecionadores, aprove novos fabricantes e promova itens ao catálogo oficial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/catalog"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-foreground hover:bg-muted border border-border text-xs font-semibold transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Gerenciar Catálogo</span>
          </Link>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Review Confirmation Modal */}
      {reviewingId && reviewAction && (
        <div className="p-5 rounded-2xl bg-card border border-primary/50 shadow-card space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              {reviewAction === 'APPROVED' ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Confirmar Aprovação da Solicitação</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-destructive" />
                  <span>Rejeitar Solicitação</span>
                </>
              )}
            </h3>
            <button
              onClick={() => {
                setReviewingId(null);
                setReviewAction(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              {reviewAction === 'APPROVED'
                ? 'Comentário ou instruções (Opcional)'
                : 'Motivo da rejeição (Exibido ao colecionador)'}
            </label>
            <textarea
              rows={2}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={
                reviewAction === 'APPROVED'
                  ? 'Ex: Miniatura confirmada e adicionada às próximas inserções do catálogo...'
                  : 'Ex: Miniatura já existente no catálogo sob o nome ..., ou dados insuficientes.'
              }
              className="w-full p-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setReviewingId(null);
                setReviewAction(null);
              }}
              className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={reviewMutation.isPending}
              onClick={handleConfirmReview}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all ${
                reviewAction === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-glow'
                  : 'bg-destructive hover:bg-destructive/90'
              }`}
            >
              {reviewMutation.isPending
                ? 'Processando...'
                : reviewAction === 'APPROVED'
                ? 'Confirmar Aprovação'
                : 'Confirmar Rejeição'}
            </button>
          </div>
        </div>
      )}

      {/* List of pending requests */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-card/60 animate-pulse border border-border" />
          ))
        ) : pendingList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-card border border-border">
            <Inbox className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-bold text-foreground">Tudo limpo por aqui!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Não há nenhuma solicitação pendente de curadoria no momento.
            </p>
          </div>
        ) : (
          pendingList.map((req) => {
            const p = req.proposedData || {};

            return (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-card border border-border hover:border-border/80 transition-all space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>
                      Sugerido por: <strong className="text-foreground">{req.user?.name || 'Colecionador'}</strong> (
                      {req.user?.email})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(req.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Photo */}
                  <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-xl bg-secondary border border-border shrink-0 overflow-hidden flex items-center justify-center">
                    {p.photoUrl ? (
                      <MiniatureImage
                        src={p.photoUrl}
                        alt={p.name || 'Miniatura'}
                        containerClassName="w-full h-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground/40 gap-1">
                        <Car className="h-8 w-8" />
                        <span className="text-[10px] font-semibold">Sem foto</span>
                      </div>
                    )}
                  </div>

                  {/* Fields Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{p.name || 'Miniatura sem nome'}</h3>
                      {p.isNewBrand && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-wider">
                          ★ Novo Fabricante
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Fabricante</span>
                        <span className="font-semibold text-foreground">{p.brand || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Veículo Real</span>
                        <span className="font-semibold text-foreground">
                          {p.isFantasy ? 'Fantasia' : `${p.automaker || ''} ${p.vehicleModel || ''}`.trim() || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Escala / Ano</span>
                        <span className="font-semibold text-foreground">
                          {p.scale || '1:64'} • {p.year || 'S/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Código / SKU</span>
                        <span className="font-mono text-foreground">{p.productCode || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Linha / Raridade</span>
                        <span className="text-foreground">
                          {p.lineType || 'MAINLINE'} • {p.rarity || 'REGULAR'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Série</span>
                        <span className="text-foreground">{p.series || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Cor & Acabamento</span>
                        <span className="text-foreground">
                          {p.color || 'N/A'} {p.finish ? `(${p.finish})` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Embalagem</span>
                        <span className="text-foreground">{p.packaging || 'Cartela'}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {(p.notes || req.reason) && (
                      <div className="p-2.5 rounded-xl bg-secondary/40 border border-border text-xs mt-2">
                        <span className="font-bold text-muted-foreground block text-[10px] uppercase">
                          Justificativa / Observações:
                        </span>
                        <p className="text-foreground italic mt-0.5">&ldquo;{p.notes || req.reason}&rdquo;</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
                  <Link
                    href="/admin/catalog"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold"
                  >
                    <span>Abrir Cadastro no Catálogo</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReview(req.id, 'REJECTED')}
                      className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Rejeitar</span>
                    </button>
                    <button
                      onClick={() => handleOpenReview(req.id, 'APPROVED')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-glow transition-all flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Aprovar Solicitação</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
