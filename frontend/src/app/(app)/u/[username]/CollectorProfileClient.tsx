'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Car,
  Building2,
  Sparkles,
  Share2,
  Check,
  MapPin,
  Calendar,
  Instagram,
  Globe,
  Lock,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Crown,
  Heart,
} from 'lucide-react';
import { PublicCollectorProfile, PublicCollectorItem } from '@/lib/api/users';
import { MiniatureImage } from '@/components/ui/MiniatureImage';
import { getRarityBadge } from '@/components/catalog/MiniatureDetailModal';
import { ShareCollectionModal } from '@/components/collection/ShareCollectionModal';

interface Props {
  initialProfile: PublicCollectorProfile;
}

export function CollectorProfileClient({ initialProfile }: Props) {
  const [profile] = useState<PublicCollectorProfile>(initialProfile);
  const [copied, setCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedRarityOnly, setSelectedRarityOnly] = useState(false);

  // Distinct Brands in collector's showcase
  const brands = useMemo(() => {
    const set = new Set<string>();
    profile.collection.forEach((item) => {
      if (item.brandName) set.add(item.brandName);
    });
    return Array.from(set).sort();
  }, [profile.collection]);

  // Filtered collection
  const filteredItems = useMemo(() => {
    return profile.collection.filter((item) => {
      if (selectedBrand !== 'ALL' && item.brandName !== selectedBrand) return false;
      if (selectedRarityOnly && (!item.rarity || item.rarity === '')) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchBrand = item.brandName.toLowerCase().includes(q);
        const matchSeries = item.seriesName?.toLowerCase().includes(q);
        const matchNumber = item.collectorNumber?.toLowerCase().includes(q) || item.seriesNumber?.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchSeries && !matchNumber) return false;
      }
      return true;
    });
  }, [profile.collection, selectedBrand, selectedRarityOnly, search]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const shareOnWhatsApp = () => {
    if (typeof window !== 'undefined') {
      const text = `Confira a coleção de miniaturas de ${profile.name} no MiniHub Car! ${window.location.href}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const getPlanBadge = (planCode: string) => {
    switch (planCode) {
      case 'GARAGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
            <Crown className="h-3 w-3" /> Garagem VIP
          </span>
        );
      case 'PRO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold">
            <Sparkles className="h-3 w-3" /> Colecionador PRO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border text-xs font-medium">
            Colecionador
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Collector Hero Profile Card */}
      <div className="relative rounded-3xl bg-gradient-to-b from-card to-card/70 border border-border/80 shadow-2xl p-6 sm:p-8 overflow-hidden backdrop-blur-md">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-1/4 -mt-12 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          
          {/* Avatar & Main Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
            <div className="relative">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border-2 border-primary/40 shadow-glow"
                />
              ) : (
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-secondary/80 border-2 border-primary/30 flex items-center justify-center text-primary font-black text-3xl shadow-glow">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 p-1 rounded-lg bg-card border border-border shadow-md">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {profile.name}
                </h1>
                {getPlanBadge(profile.plan.planCode)}
              </div>

              {profile.username && (
                <p className="text-xs font-mono font-bold text-primary">
                  @{profile.username}
                </p>
              )}

              {profile.bio && (
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Meta details (City, Instagram, Since) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-muted-foreground">
                {(profile.city || profile.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {[profile.city, profile.state].filter(Boolean).join(', ')}
                  </span>
                )}

                {profile.instagram && (
                  <a
                    href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium"
                  >
                    <Instagram className="h-3.5 w-3.5 text-rose-400" />
                    {profile.instagram.startsWith('@') ? profile.instagram : `@${profile.instagram}`}
                  </a>
                )}

                {profile.website && (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium"
                  >
                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                    Website
                  </a>
                )}

                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  No MiniHub desde {new Date(profile.memberSince).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-secondary text-foreground hover:bg-secondary/80 border-border'
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? 'Link Copiado!' : 'Copiar Perfil'}
            </button>

            <button
              onClick={shareOnWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer"
            >
              WhatsApp
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all cursor-pointer"
              title="Gerar Card de Stories para o Instagram e QR Code"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              Story / QR
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-border/60">
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {profile.stats.totalMiniatures}
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">
                Miniaturas
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {profile.stats.totalBrands}
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">
                Fabricantes
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-black text-foreground">
                {profile.stats.raresCount}
              </div>
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">
                Raras & Chases
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Showcase Section */}
      {!profile.isCollectionPublic ? (
        /* Private Collection Notice */
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">Coleção Privada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Este colecionador optou por manter suas miniaturas visíveis apenas em sua garagem pessoal.
          </p>
        </div>
      ) : (
        /* Public Showcase */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" /> Vitrine da Garagem ({filteredItems.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Miniaturas em exposição na coleção pública de {profile.name}
              </p>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar na coleção..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 pr-3 text-xs rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-56"
                />
              </div>

              {/* Rarity filter toggle */}
              <button
                type="button"
                onClick={() => setSelectedRarityOnly(!selectedRarityOnly)}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all border ${
                  selectedRarityOnly
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-secondary text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Raras</span>
              </button>
            </div>
          </div>

          {/* Brand Tabs */}
          {brands.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedBrand('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedBrand === 'ALL'
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-secondary/70 text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                Todas as Marcas ({profile.collection.length})
              </button>
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(b)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedBrand === b
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary/70 text-muted-foreground hover:text-foreground border-border'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          {/* Miniatures Grid */}
          {filteredItems.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-2">
              <Car className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">Nenhuma miniatura encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredItems.map((item) => (
                <Link
                  key={item.exemplarId}
                  href={`/catalog/${item.variationId}`}
                  className="group rounded-2xl bg-card border border-border/80 overflow-hidden hover:border-primary/50 transition-all shadow-card hover:shadow-glow flex flex-col justify-between"
                >
                  {/* Photo Display */}
                  <div className="relative aspect-square bg-secondary/30 p-3 flex items-center justify-center overflow-hidden">
                    <MiniatureImage
                      src={item.photoUrl}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow transition-transform duration-300 group-hover:scale-105"
                    />

                    {item.rarity && (
                      <div className="absolute top-2 left-2">
                        {getRarityBadge(item.rarity)}
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-background/80 text-foreground border border-border/60">
                        {item.scaleName || '1:64'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium mb-0.5">
                        <span className="truncate">{item.brandName}</span>
                        {item.releaseYear && <span>{item.releaseYear}</span>}
                      </div>

                      <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {item.name}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-secondary font-semibold text-foreground">
                        {item.conditionName}
                      </span>
                      <span className="flex items-center gap-0.5 text-primary group-hover:translate-x-0.5 transition-transform font-bold">
                        Ver ficha <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Compartilhar Coleção (WhatsApp, Instagram Stories, QR Code) */}
      <ShareCollectionModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        username={profile.username || profile.id}
        collectorName={profile.name}
        avatarUrl={profile.avatarUrl}
        totalMiniatures={profile.stats.totalMiniatures}
        totalBrands={profile.stats.totalBrands}
        raresCount={profile.stats.raresCount}
      />
    </div>
  );
}
