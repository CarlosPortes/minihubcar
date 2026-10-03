'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Heart,
  Layers,
  Users,
  Search,
  Sparkles,
  Car,
  TrendingUp,
  Award,
  Crown,
  Medal,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { fetchCommunityStats, CommunityStatsResponse } from '@/lib/api/stats';

export default function CommunityStatsPage() {
  const [stats, setStats] = useState<CommunityStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wishlist' | 'collected' | 'collectors'>('wishlist');

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchCommunityStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load community stats', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black shadow-glow">
          🥇 1º
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-300/20 text-zinc-300 border border-zinc-400/40 text-xs font-black">
          🥈 2º
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 text-xs font-black">
          🥉 3º
        </span>
      );
    }
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground border border-border text-xs font-bold">
        {index + 1}º
      </span>
    );
  };

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/90 to-primary/10 border border-border p-6 sm:p-10 shadow-card">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>Painel da Comunidade 1:64</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            Estatísticas & Rankings da Garagem
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Acompanhe em tempo real as miniaturas mais cobiçadas, os modelos mais populares entre os colecionadores e os rankings dos membros mais ativos do MiniHub Car.
          </p>
        </div>
      </section>

      {/* OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Colecionadores</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {stats?.overview.totalCollectors ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Membros cadastrados</p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Miniaturas na Coleção</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {stats?.overview.totalMiniaturesInCollections ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Exemplares ativos em garagens</p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Catálogo Verificado</span>
            <Car className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {stats?.overview.totalCatalogModels ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Modelos com ficha técnica</p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border space-y-2 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Desejos Registrados</span>
            <Heart className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {stats?.overview.totalWishlistWishes ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Itens em Wishlists</p>
        </div>
      </div>

      {/* TABS DE SELEÇÃO */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'wishlist'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Heart className="h-3.5 w-3.5" />
          Mais Desejadas (Wishlist)
        </button>

        <button
          onClick={() => setActiveTab('collected')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'collected'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Mais Populares na Coleção
        </button>

        <button
          onClick={() => setActiveTab('collectors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'collectors'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Crown className="h-3.5 w-3.5 text-amber-400" />
          Maiores Colecionadores
        </button>
      </div>

      {/* CONTEÚDO DAS TABS */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
          Carregando estatísticas da comunidade...
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: MAIS DESEJADAS */}
          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Top Miniaturas Mais Desejadas</h3>
                  <p className="text-xs text-muted-foreground">
                    Modelos mais presentes nas listas de desejos (Wishlists) de todos os usuários da plataforma.
                  </p>
                </div>
              </div>

              {stats?.topWishlist && stats.topWishlist.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.topWishlist.map((item, idx) => (
                    <div
                      key={item.variationId}
                      className="p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all flex items-center gap-3.5 shadow-card"
                    >
                      <div className="shrink-0">{getRankBadge(idx)}</div>

                      {/* Miniatura Image */}
                      <div className="h-16 w-20 rounded-xl bg-secondary/80 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.variationName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Car className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-primary">{item.brandName || 'Mini GT'}</span>
                          {item.automakerName && <span>• {item.automakerName}</span>}
                          {item.releaseYear && <span>• {item.releaseYear}</span>}
                        </div>
                        <h4 className="text-xs font-bold text-foreground truncate mt-0.5" title={item.variationName}>
                          {item.variationName}
                        </h4>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                            <Heart className="h-3 w-3 fill-rose-500/30" />
                            {item.count} {item.count === 1 ? 'desejo' : 'desejos'}
                          </span>
                        </div>
                      </div>

                      {/* Link to catalog */}
                      <Link
                        href={`/catalog`}
                        title="Ver no catálogo"
                        className="h-8 w-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 border border-border"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center space-y-3">
                  <Heart className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <h4 className="text-sm font-bold text-foreground">Nenhum desejo registrado ainda</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Conforme os colecionadores explorarem o catálogo e adicionarem peças na Wishlist, o ranking será preenchido automaticamente!
                  </p>
                  <Link
                    href="/catalog"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow"
                  >
                    Explorar Catálogo e Adicionar à Wishlist
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MAIS COLECIONADAS */}
          {activeTab === 'collected' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Top Miniaturas nas Garagens</h3>
                  <p className="text-xs text-muted-foreground">
                    Modelos mais cadastrados nas coleções físicas ativas dos membros do MiniHub Car.
                  </p>
                </div>
              </div>

              {stats?.topCollected && stats.topCollected.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.topCollected.map((item, idx) => (
                    <div
                      key={item.variationId}
                      className="p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all flex items-center gap-3.5 shadow-card"
                    >
                      <div className="shrink-0">{getRankBadge(idx)}</div>

                      {/* Miniatura Image */}
                      <div className="h-16 w-20 rounded-xl bg-secondary/80 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.variationName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Car className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="font-semibold text-primary">{item.brandName || 'Mini GT'}</span>
                          {item.automakerName && <span>• {item.automakerName}</span>}
                          {item.releaseYear && <span>• {item.releaseYear}</span>}
                        </div>
                        <h4 className="text-xs font-bold text-foreground truncate mt-0.5" title={item.variationName}>
                          {item.variationName}
                        </h4>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <Layers className="h-3 w-3" />
                            {item.count} {item.count === 1 ? 'exemplar na comunidade' : 'exemplares na comunidade'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center space-y-3">
                  <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <h4 className="text-sm font-bold text-foreground">Nenhuma miniatura na coleção ainda</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Cadastre suas miniaturas na Minha Coleção para que elas apareçam nas contagens populares da plataforma!
                  </p>
                  <Link
                    href="/collection"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover shadow-glow"
                  >
                    Gerenciar Minha Coleção
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MAIORES COLECIONADORES */}
          {activeTab === 'collectors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Ranking dos Maiores Colecionadores</h3>
                  <p className="text-xs text-muted-foreground">
                    Membros da comunidade com maior número de miniaturas ativas catalogadas na garagem.
                  </p>
                </div>
              </div>

              {stats?.topCollectors && stats.topCollectors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stats.topCollectors.map((item, idx) => (
                    <div
                      key={item.userId}
                      className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all flex items-center gap-3.5 shadow-card"
                    >
                      <div className="shrink-0">{getRankBadge(idx)}</div>

                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-full bg-secondary border border-border flex items-center justify-center font-black text-sm text-foreground overflow-hidden shrink-0">
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{item.name?.substring(0, 2).toUpperCase() || 'C'}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">{item.name}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Colecionador desde {new Date(item.joinedAt).getFullYear()}
                        </p>
                      </div>

                      {/* Count badge */}
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-primary">{item.count}</span>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Peças</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-card border border-dashed border-border text-center space-y-3">
                  <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <h4 className="text-sm font-bold text-foreground">Sem colecionadores ranqueados ainda</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Cadastre suas primeiras miniaturas para assumir a liderança no ranking oficial da comunidade!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Marcas Mais Populares */}
          {stats?.topBrands && stats.topBrands.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Marcas com Maior Presença nas Coleções
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.topBrands.map((b) => (
                  <div key={b.brandName} className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-center space-y-1">
                    <p className="text-xs font-bold text-foreground truncate">{b.brandName}</p>
                    <p className="text-[11px] font-semibold text-primary">{b.count} na comunidade</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
