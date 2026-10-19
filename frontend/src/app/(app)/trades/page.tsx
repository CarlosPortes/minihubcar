'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  Sparkles,
  Flame,
  Heart,
  Car,
  Check,
  X,
  MessageCircle,
  Clock,
  ShieldCheck,
  Send,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Users,
} from 'lucide-react';
import {
  tradesApi,
  DoubleMatchItem,
  TheyWantItem,
  TheyHaveItem,
  MyTradeExemplar,
  TradeProposalItem,
} from '@/lib/api/trades';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

export default function TradesHubPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'double' | 'theyWant' | 'theyHave' | 'myItems' | 'proposals'>('double');

  // Proposal modal state
  const [selectedMatchToPropose, setSelectedMatchToPropose] = useState<DoubleMatchItem | null>(null);
  const [proposalMessage, setProposalMessage] = useState('');
  const [proposalSuccess, setProposalSuccess] = useState(false);

  // Queries
  const { data: matchesData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ['trades-matches'],
    queryFn: tradesApi.getMatches,
  });

  const { data: myTradeItems, isLoading: isLoadingMyItems } = useQuery({
    queryKey: ['my-trade-exemplars'],
    queryFn: tradesApi.getMyTradeExemplars,
  });

  const { data: proposalsData, isLoading: isLoadingProposals } = useQuery({
    queryKey: ['trades-proposals'],
    queryFn: tradesApi.listProposals,
  });

  // Toggle Trade Mutation
  const toggleTradeMutation = useMutation({
    mutationFn: ({ exemplarId, isForTrade }: { exemplarId: string; isForTrade: boolean }) =>
      tradesApi.toggleTrade(exemplarId, isForTrade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-trade-exemplars'] });
      queryClient.invalidateQueries({ queryKey: ['trades-matches'] });
    },
  });

  // Create Proposal Mutation
  const createProposalMutation = useMutation({
    mutationFn: (input: { receiverId: string; offeredExemplarId: string; requestedExemplarId?: string; message?: string }) =>
      tradesApi.createProposal(input),
    onSuccess: () => {
      setProposalSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['trades-proposals'] });
      setTimeout(() => {
        setProposalSuccess(false);
        setSelectedMatchToPropose(null);
        setProposalMessage('');
      }, 2000);
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED' }) =>
      tradesApi.updateProposalStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades-proposals'] });
    },
  });

  const handleOpenWhatsApp = (phone: string, text: string) => {
    const clean = phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=55${clean}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const matches = matchesData || {
    doubleMatches: [],
    theyWant: [],
    theyHave: [],
    summary: { doubleMatchesCount: 0, theyWantCount: 0, theyHaveCount: 0 },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-card via-card/80 to-secondary/30 border border-border p-6 sm:p-8 shadow-card overflow-hidden">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Matchmaking Inteligente de Trocas
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
            Central de Trocas entre Colecionadores
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            O algoritmo do MiniHub Car cruza automaticamente as miniaturas que você marcou para troca com as listas de desejos (Wishlist) de outros membros. Quando ambos querem o que o outro tem, é um <strong>Match Perfeito!</strong>
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border/70">
        <button
          onClick={() => setActiveTab('double')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
            activeTab === 'double'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Flame className="h-4 w-4 text-amber-400" />
          <span>Trocas Perfeitas (Double Match)</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px]">
            {matches.summary.doubleMatchesCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('theyWant')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
            activeTab === 'theyWant'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Querem o que Você Tem</span>
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground text-[10px]">
            {matches.summary.theyWantCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('theyHave')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
            activeTab === 'theyHave'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Heart className="h-4 w-4 text-rose-400" />
          <span>Têm o que Você Quer</span>
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground text-[10px]">
            {matches.summary.theyHaveCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('myItems')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
            activeTab === 'myItems'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Car className="h-4 w-4" />
          <span>Minhas Miniaturas para Troca</span>
        </button>

        <button
          onClick={() => setActiveTab('proposals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
            activeTab === 'proposals'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-secondary/60 text-muted-foreground hover:text-foreground border-border'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Propostas</span>
          {proposalsData && (proposalsData.incoming.length > 0 || proposalsData.outgoing.length > 0) && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground text-[10px]">
              {proposalsData.incoming.length + proposalsData.outgoing.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DOUBLE MATCHES */}
      {activeTab === 'double' && (
        <div className="space-y-4">
          {matches.doubleMatches.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <Flame className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">Nenhum Match Perfeito no momento</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Para ativar o Double Match, marque miniaturas que você tem disponíveis para troca na aba <strong>Minhas Miniaturas para Troca</strong> e adicione modelos que deseja na sua <strong>Wishlist</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {matches.doubleMatches.map((m, idx) => (
                <div
                  key={`${m.other_user_id}-${idx}`}
                  className="rounded-3xl bg-card border border-amber-500/30 p-5 sm:p-6 shadow-glow relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    {/* Visual Comparison: You Give <-> You Receive */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      
                      {/* You Offer */}
                      <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl bg-background p-1.5 flex items-center justify-center overflow-hidden shrink-0">
                          <MiniatureImage src={m.my_offered_photo_url} alt={m.my_offered_variation_name} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-emerald-400">Você Entrega:</span>
                          <h4 className="text-xs font-bold text-foreground truncate">{m.my_offered_variation_name}</h4>
                          <span className="text-[10px] text-muted-foreground">{m.my_offered_brand_name}</span>
                        </div>
                      </div>

                      {/* You Receive */}
                      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl bg-background p-1.5 flex items-center justify-center overflow-hidden shrink-0">
                          <MiniatureImage src={m.other_offered_photo_url} alt={m.other_offered_variation_name} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-amber-400">Você Recebe:</span>
                          <h4 className="text-xs font-bold text-foreground truncate">{m.other_offered_variation_name}</h4>
                          <span className="text-[10px] text-muted-foreground">{m.other_offered_brand_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Collector Info & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-3 lg:border-l lg:border-border/60 lg:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary font-black shrink-0">
                          {m.other_user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">{m.other_user_name}</span>
                            {m.other_user_username && (
                              <Link
                                href={`/u/${m.other_user_username}`}
                                target="_blank"
                                className="text-[10px] text-primary hover:underline font-mono"
                              >
                                @{m.other_user_username}
                              </Link>
                            )}
                          </div>
                          {(m.other_user_city || m.other_user_state) && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {[m.other_user_city, m.other_user_state].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {m.other_user_whatsapp && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenWhatsApp(
                                m.other_user_whatsapp!,
                                `Olá ${m.other_user_name}! Vi no MiniHub Car que demos Match Perfeito: eu tenho ${m.my_offered_variation_name} e você tem ${m.other_offered_variation_name}. Bora trocar?`
                              )
                            }
                            className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedMatchToPropose(m)}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-hover shadow-glow transition-all cursor-pointer"
                        >
                          Propor Troca
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: THEY WANT (OUTROS QUEREM O QUE VOCÊ TEM) */}
      {activeTab === 'theyWant' && (
        <div className="space-y-4">
          {matches.theyWant.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-2">
              <p className="text-xs text-muted-foreground">Nenhum colecionador adicionou suas miniaturas de troca na Wishlist ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {matches.theyWant.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-secondary/50 p-1 flex items-center justify-center shrink-0">
                      <MiniatureImage src={item.photo_url} alt={item.variation_name} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{item.variation_name}</h4>
                      <p className="text-[10px] text-muted-foreground">{item.brand_name}</p>
                      <span className="text-[10px] text-primary font-semibold">
                        Desejado por: {item.other_user_name}
                      </span>
                    </div>
                  </div>

                  {item.other_user_whatsapp && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenWhatsApp(
                          item.other_user_whatsapp!,
                          `Olá ${item.other_user_name}! Vi no MiniHub Car que você procura ${item.variation_name} e eu tenho disponível para troca!`
                        )
                      }
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs shrink-0"
                      title="Conversar no WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: THEY HAVE (OUTROS TÊM O QUE VOCÊ QUER) */}
      {activeTab === 'theyHave' && (
        <div className="space-y-4">
          {matches.theyHave.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-2">
              <p className="text-xs text-muted-foreground">Nenhum colecionador disponibilizou miniaturas da sua Wishlist para troca ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {matches.theyHave.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-secondary/50 p-1 flex items-center justify-center shrink-0">
                      <MiniatureImage src={item.photo_url} alt={item.variation_name} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{item.variation_name}</h4>
                      <p className="text-[10px] text-muted-foreground">{item.brand_name}</p>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Disponível com: {item.other_user_name}
                      </span>
                    </div>
                  </div>

                  {item.other_user_whatsapp && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenWhatsApp(
                          item.other_user_whatsapp!,
                          `Olá ${item.other_user_name}! Vi no MiniHub Car que você tem ${item.variation_name} disponível para troca. Tenho interesse!`
                        )
                      }
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs shrink-0"
                      title="Conversar no WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MINHAS MINIATURAS PARA TROCA */}
      {activeTab === 'myItems' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Gerenciar Disponibilidade para Troca</h3>
            <p className="text-xs text-muted-foreground">
              Ative as miniaturas da sua garagem que você aceita trocar com outros colecionadores.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {myTradeItems?.map((item) => (
              <div
                key={item.exemplarId}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  item.isForTrade
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-sm'
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-secondary/50 p-1 flex items-center justify-center shrink-0">
                    <MiniatureImage src={item.photoUrl} alt={item.name} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">{item.name}</h4>
                    <span className="text-[10px] text-muted-foreground">{item.brandName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleTradeMutation.mutate({
                      exemplarId: item.exemplarId,
                      isForTrade: !item.isForTrade,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    item.isForTrade
                      ? 'bg-amber-500 text-black shadow-glow'
                      : 'bg-secondary text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  {item.isForTrade ? 'Para Troca' : 'Coleção'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PROPOSTAS */}
      {activeTab === 'proposals' && proposalsData && (
        <div className="space-y-6">
          {/* Recebidas */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Propostas Recebidas ({proposalsData.incoming.length})</h3>
            {proposalsData.incoming.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma proposta recebida no momento.</p>
            ) : (
              proposalsData.incoming.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{p.requester_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground font-bold">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ofereceu: <strong>{p.offered_variation_name}</strong>
                    </p>
                    {p.message && <p className="text-xs italic text-muted-foreground/80">&quot;{p.message}&quot;</p>}
                  </div>

                  {p.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'ACCEPTED' })}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all cursor-pointer"
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'DECLINED' })}
                        className="px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground hover:text-destructive font-bold text-xs transition-all cursor-pointer"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Enviadas */}
          <div className="space-y-3 pt-4 border-t border-border/60">
            <h3 className="text-sm font-bold text-foreground">Propostas Enviadas ({proposalsData.outgoing.length})</h3>
            {proposalsData.outgoing.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma proposta enviada.</p>
            ) : (
              proposalsData.outgoing.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-foreground">Para: {p.receiver_name}</span>
                    <p className="text-xs text-muted-foreground">
                      Você ofereceu: <strong>{p.offered_variation_name}</strong>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{p.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Proposta de Troca */}
      {selectedMatchToPropose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedMatchToPropose(null)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-foreground">Propor Troca com {selectedMatchToPropose.other_user_name}</h3>

            <div className="p-3 rounded-xl bg-secondary/50 border border-border text-xs space-y-1">
              <p><strong>Você oferece:</strong> {selectedMatchToPropose.my_offered_variation_name}</p>
              <p><strong>Você pede:</strong> {selectedMatchToPropose.other_offered_variation_name}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Mensagem (opcional):</label>
              <textarea
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                placeholder="Ex: Minha miniatura está lacrada em perfeito estado..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {proposalSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs text-center font-bold">
                Proposta enviada com sucesso!
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  createProposalMutation.mutate({
                    receiverId: selectedMatchToPropose.other_user_id,
                    offeredExemplarId: selectedMatchToPropose.my_offered_exemplar_id,
                    requestedExemplarId: selectedMatchToPropose.other_offered_exemplar_id,
                    message: proposalMessage,
                  })
                }
                disabled={createProposalMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow transition-all"
              >
                {createProposalMutation.isPending ? 'Enviando Proposta...' : 'Enviar Proposta de Troca'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
