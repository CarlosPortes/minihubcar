'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import { Heart, Trash2, Car, CheckCircle2, AlertCircle, Plus, Sparkles } from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import { MiniatureDetailModal } from '@/components/catalog/MiniatureDetailModal';
import { useTranslation } from '@/i18n';

interface WishlistItem {
  id: string;
  priority: number;
  notes: string | null;
  createdAt: string;
  isOwned: boolean;
  variation: {
    id: string;
    name: string;
    releaseYear: number | null;
    color: string | null;
    photoUrl: string | null;
  };
  brand: { id: string; name: string };
  scale: { id: string; name: string } | null;
}

export default function WishlistPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [detailItem, setDetailItem] = useState<WishlistItem | null>(null);

  const { data, isLoading } = useQuery<{ data: WishlistItem[] }>({
    queryKey: ['wishlist', 'list', user?.id],
    queryFn: () => apiClient('/wishlist'),
    enabled: isAuthenticated && !!user?.id,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/wishlist/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Heart className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground">{t('wishlist.loginRequired')}</h2>
        <Link
          href="/login"
          className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow"
        >
          {t('common.login')}
        </Link>
      </div>
    );
  }

  const items = data?.data || [];

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 3:
        return <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">{t('wishlist.urgent')}</span>;
      case 2:
        return <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">{t('wishlist.highPriority')}</span>;
      case 1:
        return <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold">{t('wishlist.mediumPriority')}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-[10px] font-bold">{t('wishlist.lowPriority')}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t('wishlist.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t('wishlist.subtitle')}
          </p>
        </div>

        <Link
          href="/catalog"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow transition-all self-start"
        >
          <Plus className="h-4 w-4" />
          {t('wishlist.searchCatalog')}
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-card/60 animate-pulse border border-border" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-card border border-border">
          <Heart className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">{t('wishlist.empty')}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {t('wishlist.emptyDesc')}
          </p>
          <Link
            href="/catalog"
            className="mt-6 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow"
          >
            {t('wishlist.exploreCatalog')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setDetailItem(item)}
              className="group flex flex-col rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/50 hover:shadow-card-hover transition-all shadow-card cursor-pointer"
            >
              <div className="relative aspect-4/3 w-full bg-secondary overflow-hidden border-b border-border">
                <MiniatureImage
                  src={item.variation.photoUrl}
                  alt={item.variation.name}
                />

                <div className="absolute top-2 left-2">{getPriorityBadge(item.priority)}</div>

                {item.isOwned && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-md">
                    <CheckCircle2 className="h-3 w-3" /> {t('wishlist.inCollection')}
                  </span>
                )}
              </div>

              <div className="flex flex-col flex-1 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary truncate">
                  {item.brand.name}
                </span>
                <h3 className="text-xs font-bold text-foreground line-clamp-2 mt-0.5">
                  {item.variation.name}
                </h3>

                <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/60">
                  <Link
                    href={`/catalog?q=${encodeURIComponent(item.variation.name)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    {t('wishlist.viewInCatalog')}
                  </Link>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMutation.mutate(item.id);
                    }}
                    title={t('wishlist.removeFromWishlist')}
                    className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal: Ficha Técnica da Miniatura na Wishlist */}
      {detailItem && (
        <MiniatureDetailModal
          variationId={detailItem.variation.id}
          onClose={() => setDetailItem(null)}
          wishlistContext={{
            priority: detailItem.priority,
            notes: detailItem.notes,
            isOwned: detailItem.isOwned,
          }}
          isInWishlist={true}
        />
      )}
    </div>
  );
}
