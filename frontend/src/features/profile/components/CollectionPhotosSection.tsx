'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi, CollectionPhoto } from '@/lib/api/community';
import { apiClient } from '@/lib/api/client';
import {
  Camera,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';

export function CollectionPhotosSection() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: photosRes, isLoading } = useQuery({
    queryKey: ['my-collection-photos'],
    queryFn: () => communityApi.getMyPhotos(),
  });

  const photos: CollectionPhoto[] = photosRes?.data || [];

  const addPhotoMutation = useMutation({
    mutationFn: (data: { photoUrl: string; caption?: string }) => communityApi.addMyPhoto(data),
    onSuccess: () => {
      setSuccessMsg('Foto enviada com sucesso! Ela passará por uma análise rápida antes de ser exibida na comunidade.');
      setCaption('');
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['my-collection-photos'] });
      setTimeout(() => setSuccessMsg(null), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Erro ao enviar a foto.');
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => communityApi.deleteMyPhoto(photoId),
    onSuccess: () => {
      setSuccessMsg('Foto removida com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['my-collection-photos'] });
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Erro ao remover a foto.');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= 3) {
      setErrorMsg('Você já atingiu o limite de 3 fotos da coleção.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const uploadRes = await apiClient<{ data: { url: string; publicUrl: string } }>('/media/upload', {
        method: 'POST',
        body: formData,
      });

      const photoUrl = uploadRes.data.publicUrl || uploadRes.data.url;
      await addPhotoMutation.mutateAsync({ photoUrl, caption });
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha no upload do arquivo.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const remainingSlots = 3 - photos.length;

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-bold text-foreground">
            Fotos do seu Espaço de Colecionador ({photos.length}/3)
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Compartilhe até 3 fotos da sua estante, expositor ou sala de colecionador. Por segurança e para manter a
            comunidade harmoniosa, cada foto enviada fica visível de imediato apenas para você e passará por uma
            aprovação rápida da equipe antes de aparecer na vitrine pública.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-500 font-medium">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Carregando fotos da coleção...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Render Existing Photos */}
          {photos.map((item, idx) => (
            <div
              key={item.id}
              className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:border-border/80 transition-all"
            >
              {/* Image Preview */}
              <div className="relative aspect-video w-full bg-secondary/30 overflow-hidden">
                <img
                  src={item.photoUrl}
                  alt={item.caption || `Foto da coleção ${idx + 1}`}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Status Badge Overlay */}
                <div className="absolute top-2 left-2">
                  {item.status === 'PENDING' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 text-amber-950 px-2.5 py-1 text-[11px] font-bold shadow-md backdrop-blur-md">
                      <Clock className="h-3 w-3" /> Em Análise
                    </span>
                  )}
                  {item.status === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-emerald-950 px-2.5 py-1 text-[11px] font-bold shadow-md backdrop-blur-md">
                      <CheckCircle className="h-3 w-3" /> Aprovada
                    </span>
                  )}
                  {item.status === 'REJECTED' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/90 text-destructive-foreground px-2.5 py-1 text-[11px] font-bold shadow-md backdrop-blur-md">
                      <XCircle className="h-3 w-3" /> Recusada
                    </span>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja remover esta foto da sua coleção?')) {
                      deletePhotoMutation.mutate(item.id);
                    }
                  }}
                  disabled={deletePhotoMutation.isPending}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  title="Excluir foto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Caption & Status Details */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <p className="text-xs font-semibold text-foreground line-clamp-1">
                    {item.caption || `Foto da Coleção #${idx + 1}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Enviada em {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {item.status === 'PENDING' && (
                  <p className="text-[11px] text-amber-500/90 flex items-center gap-1 font-medium bg-amber-500/10 rounded-md p-1.5 border border-amber-500/20">
                    <Info className="h-3 w-3 shrink-0" />
                    Apenas você vê esta imagem até a aprovação.
                  </p>
                )}

                {item.status === 'APPROVED' && (
                  <p className="text-[11px] text-emerald-500/90 flex items-center gap-1 font-medium bg-emerald-500/10 rounded-md p-1.5 border border-emerald-500/20">
                    <CheckCircle className="h-3 w-3 shrink-0" />
                    Visível na vitrine pública da comunidade!
                  </p>
                )}

                {item.status === 'REJECTED' && (
                  <div className="text-[11px] text-destructive bg-destructive/10 rounded-md p-2 border border-destructive/20 space-y-0.5">
                    <p className="font-bold flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Motivo da recusa:
                    </p>
                    <p className="text-muted-foreground">{item.rejectionReason || 'Não atende às diretrizes.'}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Upload Slot (if under 3 photos) */}
          {remainingSlots > 0 && (
            <div className="flex flex-col rounded-xl border-2 border-dashed border-border/80 bg-secondary/20 p-5 hover:border-primary/50 transition-colors justify-center items-center text-center space-y-3 min-h-[200px]">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Adicionar Foto da Coleção</p>
                <p className="text-xs text-muted-foreground">
                  Você ainda pode adicionar {remainingSlots} {remainingSlots === 1 ? 'foto' : 'fotos'} (JPG, PNG ou WEBP)
                </p>
              </div>

              <div className="w-full max-w-xs space-y-2 pt-1">
                <input
                  type="text"
                  placeholder="Legenda da foto (opcional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  maxLength={150}
                />

                <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all">
                  <Plus className="h-4 w-4" />
                  <span>{isUploading ? 'Enviando imagem...' : 'Selecionar Arquivo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
