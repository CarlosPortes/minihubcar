'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { commercialApi, MarketplaceVariationItem } from '@/lib/api/commercial';
import {
  ShoppingBag,
  Search,
  Tag,
  Filter,
  ArrowRight,
  Store,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function MarketplacePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['marketplace-search', searchTerm, minPrice, maxPrice],
    queryFn: async () => {
      const res = await commercialApi.searchMarketplace({
        q: searchTerm || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      });
      return res;
    },
  });

  const items = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-card border border-primary/20 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary border border-primary/30">
            <Sparkles className="h-3.5 w-3.5" /> Marketplace MiniHub Car
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Encontre e Compre Miniaturas Raras
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Navegue pelas ofertas verificadas dos colecionadores da comunidade. Cada anúncio está vinculado
            ao catálogo oficial, garantindo autenticidade e precisão dos dados.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por modelo, marca ou variação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="flex w-full md:w-auto items-center gap-2">
          <input
            type="number"
            placeholder="Mín R$"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-24 h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-muted-foreground text-xs">até</span>
          <input
            type="number"
            placeholder="Máx R$"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-24 h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={() => refetch()}
            className="h-10 px-4 rounded-lg bg-secondary text-foreground text-sm font-semibold hover:bg-muted border border-border transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-card rounded-xl border border-destructive/20 text-destructive">
          <p>Ocorreu um erro ao carregar as ofertas do marketplace.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-xl border border-border space-y-3">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-bold text-foreground">Nenhuma oferta encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Não há miniaturas anunciadas que correspondam aos seus filtros no momento. Seja você o primeiro a vender!
          </p>
          <div className="pt-2">
            <Link
              href="/seller"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover shadow-glow transition-all"
            >
              <Store className="h-4 w-4" /> Anunciar no Marketplace
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.variationId}
              className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
            >
              {/* Image Preview */}
              <div className="relative aspect-video w-full bg-secondary/30 flex items-center justify-center overflow-hidden">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.variationName}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Layers className="h-10 w-10 text-muted-foreground/40" />
                )}
                <span className="absolute bottom-2 right-2 rounded-md bg-background/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-foreground border border-border">
                  {item.offersCount} {item.offersCount === 1 ? 'oferta' : 'ofertas'}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    {item.brandName || 'Miniatura'} {item.releaseYear ? `• ${item.releaseYear}` : ''}
                  </p>
                  <h2 className="text-sm font-bold text-foreground line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">
                    {item.variationName}
                  </h2>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">A partir de</span>
                      <span className="text-lg font-black text-foreground">
                        R$ {parseFloat(item.minPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <Link
                      href={`/marketplace/${item.variationId}`}
                      className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground border border-primary/20 transition-all"
                    >
                      Ver Ofertas
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
