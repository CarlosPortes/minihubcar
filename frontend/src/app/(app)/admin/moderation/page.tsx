'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi, PendingPhotoForAdmin } from '@/lib/api/community';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  Maximize2,
  X,
  History,
  Sparkles,
} from 'lucide-react';

export default function AdminModerationPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [rejectingPhoto, setRejectingPhoto] = useState<PendingPhotoForAdmin | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = Boolean(
    user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN')
  );

  // Query: Fotos Pendentes
  const { data: pendingRes, isLoading: isLoadingPending } = useQuery({
    queryKey: ['admin-pending-photos'],
    queryFn: () => communityApi.getPendingPhotos(),
    enabled: isAdmin,
  });

  // Query: Histórico
  const { data: historyRes, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['admin-moderation-history'],
    queryFn: () => communityApi.getModerationHistory(),
    enabled: isAdmin && activeTab === 'history',
  });

  const pendingPhotos: PendingPhotoForAdmin[] = pendingRes?.data || [];
  const historyPhotos = historyRes?.data || [];

  // Mutation: Moderar foto
  const moderateMutation = useMutation({
    mutationFn: ({ photoId, action, reason }: { photoId: string; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
      communityApi.moderatePhoto(photoId, action, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-photos'] });
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-history'] });
      setRejectingPhoto(null);
      setRejectionReason('');
      setFeedbackMsg({
        type: 'success',
        text: variables.action === 'APPROVE' ? 'Foto da coleção aprovada com sucesso!' : 'Foto recusada com sucesso.',
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    },
    onError: (err: any) => {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Erro ao moderar a foto.',
      });
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground">
          Esta área é restrita aos moderadores e administradores do MiniHubCar.
        </p>
        <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-foreground">Moderação de Fotos da Comunidade</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Valide e aprove as imagens dos espaços de colecionadores antes de serem publicadas na vitrine.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-secondary/60 p-1 border border-border">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Pendentes ({pendingPhotos.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" /> Histórico
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* TAB 1: PENDENTES */}
      {activeTab === 'pending' && (
        <>
          {isLoadingPending ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Carregando fila de moderação...</span>
            </div>
          ) : pendingPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border bg-card/40 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-foreground">Fila de Moderação Limpa!</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Não há fotos de colecionadores aguardando análise no momento. Todas as imagens enviadas já foram
                processadas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingPhotos.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-border/80 transition-all"
                >
                  {/* Photo Preview with Zoom button */}
                  <div className="relative aspect-video w-full bg-secondary/50 group overflow-hidden">
                    <img
                      src={item.photoUrl}
                      alt={item.caption || 'Foto enviada pelo colecionador'}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={() => setPreviewPhotoUrl(item.photoUrl)}
                      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black transition-colors"
                      title="Ampliar imagem"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-amber-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                        Aguardando Aprovação
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    {/* User Info */}
                    <div className="space-y-1.5 pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        {item.user.avatarUrl ? (
                          <img
                            src={item.user.avatarUrl}
                            alt={item.user.name}
                            className="h-6 w-6 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                            {item.user.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-foreground truncate">{item.user.name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" /> {item.user.email}
                      </p>
                      {item.user.city && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" /> {item.user.city}, {item.user.state}
                        </p>
                      )}
                    </div>

                    {/* Caption / Details */}
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {item.caption ? `"${item.caption}"` : <span className="italic text-muted-foreground">Sem legenda informada</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" /> Enviada em {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <button
                        onClick={() => moderateMutation.mutate({ photoId: item.id, action: 'APPROVE' })}
                        disabled={moderateMutation.isPending}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" /> Aprovar
                      </button>

                      <button
                        onClick={() => setRejectingPhoto(item)}
                        disabled={moderateMutation.isPending}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 px-3 py-2 text-xs font-bold hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> Recusar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: HISTÓRICO DE MODERAÇÃO */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Carregando histórico...</span>
            </div>
          ) : historyPhotos.length === 0 ? (
            <p className="text-center py-12 text-xs text-muted-foreground">Nenhuma foto moderada ainda.</p>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 text-muted-foreground uppercase font-bold text-[10px] border-b border-border">
                  <tr>
                    <th className="p-3">Foto</th>
                    <th className="p-3">Colecionador</th>
                    <th className="p-3">Legenda</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Data Moderação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {historyPhotos.map((row: any) => (
                    <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3">
                        <img
                          src={row.photoUrl}
                          alt="Foto"
                          className="h-10 w-16 rounded object-cover cursor-pointer border border-border"
                          onClick={() => setPreviewPhotoUrl(row.photoUrl)}
                        />
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {row.user?.name}
                        <span className="block text-[10px] text-muted-foreground font-normal">{row.user?.email}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{row.caption || '-'}</td>
                      <td className="p-3">
                        {row.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                            <CheckCircle className="h-3 w-3" /> Aprovada
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-destructive font-bold">
                              <XCircle className="h-3 w-3" /> Recusada
                            </span>
                            {row.rejectionReason && (
                              <span className="block text-[10px] text-muted-foreground">{row.rejectionReason}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {row.reviewedAt ? new Date(row.reviewedAt).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Recusa de Foto com Motivo */}
      {rejectingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" /> Recusar Foto de {rejectingPhoto.user.name}
              </h3>
              <button
                onClick={() => setRejectingPhoto(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Informe o motivo da recusa (o colecionador verá esta explicação):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: Foto desfocada/ilegível, contém imagem inadequada, não é do espaço de colecionador, etc."
                className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[90px]"
                maxLength={300}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingPhoto(null)}
                className="px-4 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={moderateMutation.isPending}
                onClick={() =>
                  moderateMutation.mutate({
                    photoId: rejectingPhoto.id,
                    action: 'REJECT',
                    reason: rejectionReason,
                  })
                }
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {moderateMutation.isPending ? 'Processando...' : 'Confirmar Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Zoom da Imagem */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img src={previewPhotoUrl} alt="Ampliação" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
