'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { communityApi, ShowcaseCollector } from '@/lib/api/community';
import {
  Users,
  Search,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ExternalLink,
  Camera,
  Heart,
  Store,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { DirectMessagesSection } from '@/features/community/DirectMessagesSection';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'SHOWCASE' | 'MESSAGES'>('SHOWCASE');
  const [chatRecipientId, setChatRecipientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState<ShowcaseCollector | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const { data: showcaseRes, isLoading } = useQuery({
    queryKey: ['community-showcase', searchTerm],
    queryFn: () => communityApi.getShowcase(searchTerm || undefined),
  });

  const collectors: ShowcaseCollector[] = showcaseRes?.data || [];

  const filteredCollectors = onlyWithPhotos
    ? collectors.filter((c) => c.approvedPhotos && c.approvedPhotos.length > 0)
    : collectors;

  const handleStartChat = (collectorId: string) => {
    setSelectedCollector(null);
    setChatRecipientId(collectorId);
    setActiveTab('MESSAGES');
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card/90 to-primary/10 p-6 md:p-10 shadow-glow">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary border border-primary/30">
            <Sparkles className="h-3.5 w-3.5" /> Comunidade de Colecionadores
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Comunidade MiniHubCar
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Conheça as coleções compartilhadas pelos entusiastas de miniaturas e colecionáveis, inspire-se
            com estantes e expositores e converse diretamente com outros colecionadores.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      </div>

      {/* Community Section Switcher Tabs */}
      <div className="flex border-b border-border bg-secondary/20 rounded-2xl overflow-hidden p-1 gap-1">
        <button
          onClick={() => setActiveTab('SHOWCASE')}
          className={`flex-1 py-3 px-4 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'SHOWCASE'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4 text-primary" />
          Vitrine dos Colecionadores
        </button>

        <button
          onClick={() => setActiveTab('MESSAGES')}
          className={`flex-1 py-3 px-4 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'MESSAGES'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-primary" />
          Mensagens Privadas & Chat
        </button>
      </div>

      {activeTab === 'MESSAGES' ? (
        <DirectMessagesSection
          initialRecipientId={chatRecipientId}
          onClearInitialRecipient={() => setChatRecipientId(null)}
        />
      ) : (
        <>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar colecionador por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
            style={{ color: 'var(--foreground)' }}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Toggle with photos */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyWithPhotos(!onlyWithPhotos)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              onlyWithPhotos
                ? 'bg-primary text-primary-foreground border-primary shadow-glow'
                : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Apenas com Fotos da Coleção</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold">Carregando colecionadores da comunidade...</p>
        </div>
      ) : filteredCollectors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border bg-card/40 text-center space-y-3">
          <Users className="h-12 w-12 text-muted-foreground/60" />
          <p className="text-base font-bold text-foreground">Nenhum colecionador encontrado</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchTerm
              ? `Nenhum colecionador público corresponde à busca "${searchTerm}".`
              : 'Nenhum colecionador compartilhou sua coleção publicamente ainda.'}
          </p>
        </div>
      ) : (
        /* Collectors Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollectors.map((collector) => (
            <CollectorCard
              key={collector.id}
              collector={collector}
              onOpenPhoto={(url) => setPreviewPhotoUrl(url)}
              onSelectCollector={() => setSelectedCollector(collector)}
              onStartChat={() => handleStartChat(collector.id)}
            />
          ))}
        </div>
      )}

      {/* Modal: Zoom da Imagem da Coleção */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img src={previewPhotoUrl} alt="Espaço do Colecionador" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer/Modal: Detalhes da Coleção Pública */}
      {selectedCollector && (
        <PublicCollectionModal
          collector={selectedCollector}
          onClose={() => setSelectedCollector(null)}
          onOpenPhoto={(url) => setPreviewPhotoUrl(url)}
          onStartChat={() => handleStartChat(selectedCollector.id)}
        />
      )}
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------------
// Componente de Card do Colecionador com Carrossel de Fotos
// -----------------------------------------------------------------------------------
interface CollectorCardProps {
  collector: ShowcaseCollector;
  onOpenPhoto: (url: string) => void;
  onSelectCollector: () => void;
  onStartChat: () => void;
}

function CollectorCard({ collector, onOpenPhoto, onSelectCollector, onStartChat }: CollectorCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = collector.approvedPhotos || [];
  const hasPhotos = photos.length > 0;

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const currentPhoto = hasPhotos ? photos[photoIndex] : null;

  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/40 hover:shadow-glow transition-all duration-300 group">
      {/* Carousel or Banner */}
      <div className="relative aspect-[16/10] w-full bg-secondary/50 overflow-hidden">
        {hasPhotos && currentPhoto ? (
          <>
            <img
              src={currentPhoto.photoUrl}
              alt={currentPhoto.caption || `Coleção de ${collector.name}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Gradient Overlay for Caption */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Caption on image */}
            {currentPhoto.caption && (
              <p className="absolute bottom-2.5 left-3 right-12 text-[11px] font-medium text-white/90 line-clamp-1 drop-shadow-md">
                "{currentPhoto.caption}"
              </p>
            )}

            {/* Zoom Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPhoto(currentPhoto.photoUrl);
              }}
              className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/90 transition-colors"
              title="Ver foto ampliada"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            {/* Carousel Navigation Arrows if multiple photos */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Bullets indicator */}
                <div className="absolute top-2.5 left-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {photos.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === photoIndex ? 'w-4 bg-primary' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          /* Default Aesthetic Banner if no approved photo */
          <div className="h-full w-full bg-gradient-to-br from-secondary/80 via-primary/5 to-secondary/40 flex flex-col items-center justify-center text-center p-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2 shadow-inner">
              <Layers className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-foreground">Galeria de Miniaturas</p>
            <p className="text-[10px] text-muted-foreground">{collector.totalItems} miniaturas catalogadas</p>
          </div>
        )}

        {/* Counter Badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-foreground border border-border/60 shadow-sm">
            <Layers className="h-3 w-3 text-primary" /> {collector.totalItems}
          </span>
        </div>
      </div>

      {/* Collector Info */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Avatar and Name */}
          <div className="flex items-center gap-3">
            {collector.avatarUrl ? (
              <img
                src={collector.avatarUrl}
                alt={collector.name}
                className="h-10 w-10 rounded-full object-cover border-2 border-primary/30"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary text-sm font-black">
                {collector.name.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {collector.name}
              </h3>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                {collector.city && collector.state ? (
                  <>
                    <MapPin className="h-3 w-3 shrink-0" /> {collector.city}, {collector.state}
                  </>
                ) : (
                  <>
                    <Calendar className="h-3 w-3 shrink-0" /> Colecionador no MiniHubCar
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onStartChat}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary px-3 py-2.5 text-xs font-bold transition-all shadow-sm"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Mensagem</span>
          </button>
          <button
            onClick={onSelectCollector}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground px-3 py-2.5 text-xs font-bold transition-all shadow-sm group/btn"
          >
            <span>Ver Coleção</span>
            <ExternalLink className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------------
// Modal de Visualização da Coleção Pública do Colecionador
// -----------------------------------------------------------------------------------
interface PublicCollectionModalProps {
  collector: ShowcaseCollector;
  onClose: () => void;
  onOpenPhoto: (url: string) => void;
  onStartChat: () => void;
}

function PublicCollectionModal({ collector, onClose, onOpenPhoto, onStartChat }: PublicCollectionModalProps) {
  const { data: detailRes, isLoading } = useQuery({
    queryKey: ['public-collector-detail', collector.id],
    queryFn: () => communityApi.getCollectorProfile(collector.id),
  });

  const detail = detailRes?.data;
  const photos = detail?.photos || collector.approvedPhotos || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {collector.avatarUrl ? (
              <img
                src={collector.avatarUrl}
                alt={collector.name}
                className="h-12 w-12 rounded-full object-cover border-2 border-primary/30"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary text-base font-black">
                {collector.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-black text-foreground">{collector.name}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {collector.city && <span>📍 {collector.city}, {collector.state}</span>}
                <span>•</span>
                <span>🏎️ {collector.totalItems} miniaturas</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Photos of the Collection */}
          {photos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-primary" /> Espaço do Colecionador ({photos.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => onOpenPhoto(p.photoUrl)}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-border bg-secondary cursor-pointer"
                  >
                    <img
                      src={p.photoUrl}
                      alt={p.caption || 'Foto da coleção'}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {p.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1.5 text-[10px] text-white truncate text-center">
                        {p.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Link to full catalog filter */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-foreground">Deseja ver todas as miniaturas deste colecionador?</h4>
              <p className="text-xs text-muted-foreground">
                Explore a coleção completa cadastrada por {collector.name} em nosso catálogo interativo.
              </p>
            </div>
            <Link
              href={`/catalog`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all shrink-0"
            >
              <span>Explorar no Catálogo</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between">
          <button
            onClick={onStartChat}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Enviar Mensagem</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
