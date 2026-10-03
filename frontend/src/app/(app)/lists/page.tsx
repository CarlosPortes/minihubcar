'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import { ListTodo, Plus, Trash2, Check, X, Car } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface CustomList {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function CustomListsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ data: CustomList[] }>({
    queryKey: ['lists', 'user', user?.id],
    queryFn: () => apiClient('/lists'),
    enabled: isAuthenticated && !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) =>
      apiClient('/lists', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setIsCreating(false);
      setName('');
      setDescription('');
      setSuccessMsg(t('lists.createSuccess'));
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/lists/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      setSuccessMsg(t('lists.deleteSuccess'));
      setTimeout(() => setSuccessMsg(null), 4000);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ListTodo className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground">{t('lists.loginRequired')}</h2>
        <Link
          href="/login"
          className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow"
        >
          {t('common.login')}
        </Link>
      </div>
    );
  }

  const lists = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t('lists.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t('lists.subtitle')}
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow transition-all self-start"
        >
          <Plus className="h-4 w-4" />
          {t('lists.newList')}
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {isCreating && (
        <div className="p-5 rounded-2xl bg-card border border-primary/40 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">{t('lists.createThemeList')}</h3>
            <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ name, description });
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">{t('lists.listName')}</label>
              <input
                type="text"
                required
                placeholder={t('lists.listNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">{t('lists.description')}</label>
              <input
                type="text"
                placeholder={t('lists.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-muted border border-border"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
                className="px-5 py-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-glow disabled:opacity-50"
              >
                {createMutation.isPending ? t('common.loading') : t('lists.creating')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of lists */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-card/60 animate-pulse border border-border" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-card border border-border">
          <ListTodo className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-bold text-foreground">{t('lists.emptyTitle')}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {t('lists.emptyDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {lists.map((l) => (
            <div
              key={l.id}
              className="p-5 rounded-2xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-colors shadow-card"
            >
              <div>
                <h3 className="text-sm font-bold text-foreground">{l.name}</h3>
                {l.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{l.description}</p>
                )}
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between border-t border-border/60">
                <span className="text-[11px] text-muted-foreground">
                  {new Date(l.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    if (confirm(t('lists.confirmDelete', { name: l.name }))) {
                      deleteMutation.mutate(l.id);
                    }
                  }}
                  title={t('common.delete')}
                  className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
