'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, X, ArrowRight, Sparkles, MapPin } from 'lucide-react';
import { communityApi, DirectConversationItem } from '@/lib/api/community';
import { useAuth } from '@/features/auth/context/auth-context';

export function NewMessagesPopup() {
  const { user, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [dismissedCount, setDismissedCount] = useState<number | null>(null);

  // Consulta conversas do usuário logado (atualiza a cada 30 segundos)
  const { data: convsRes } = useQuery({
    queryKey: ['community-conversations-unread-popup'],
    queryFn: () => communityApi.listConversations(),
    enabled: Boolean(isAuthenticated && user),
    refetchInterval: 30000,
  });

  const conversations: DirectConversationItem[] = convsRes?.data || [];
  const unreadConvs = conversations.filter((c) => c.unreadCount > 0);
  const totalUnread = unreadConvs.reduce((sum, c) => sum + c.unreadCount, 0);

  // Inicializa estado de descarte da sessão
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('minihub_dismissed_unread_count');
      if (saved !== null) {
        setDismissedCount(parseInt(saved, 10));
      }
    }
  }, []);

  // Abre o popup se houver mensagens não lidas e não estiver dispensado para esta quantidade
  useEffect(() => {
    // Não exibir se estiver dentro da página de comunidade
    if (pathname?.startsWith('/community')) {
      setIsOpen(false);
      return;
    }

    if (totalUnread > 0) {
      if (dismissedCount === null || totalUnread > dismissedCount) {
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
    }
  }, [totalUnread, dismissedCount, pathname]);

  const handleDismiss = () => {
    setIsOpen(false);
    setDismissedCount(totalUnread);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('minihub_dismissed_unread_count', String(totalUnread));
    }
  };

  const handleGoToChat = (partnerId?: string) => {
    handleDismiss();
    if (partnerId) {
      router.push(`/community?tab=messages&userId=${partnerId}`);
    } else {
      router.push('/community?tab=messages');
    }
  };

  if (!isOpen || totalUnread === 0) {
    return null;
  }

  const primaryConv = unreadConvs[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-3xl border border-primary/30 bg-card p-6 md:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
      >
        {/* Glow decorativo de fundo */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        {/* Botão de Fechar */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Fechar por enquanto"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center shadow-glow">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black shadow-md animate-pulse">
              {totalUnread} {totalUnread === 1 ? 'nova' : 'novas'}
            </span>
          </div>

          <div className="space-y-1 pr-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" /> Comunidade MiniHubCar
            </div>
            <h3 className="text-lg md:text-xl font-black text-foreground tracking-tight">
              Você tem mensagens no Chat!
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Outros colecionadores enviaram mensagens sobre miniaturas e novidades na comunidade.
            </p>
          </div>
        </div>

        {/* Card de Destaque da Conversa Não Lida */}
        {primaryConv && (
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {primaryConv.partner.avatarUrl ? (
                  <img
                    src={primaryConv.partner.avatarUrl}
                    alt={primaryConv.partner.name}
                    className="w-10 h-10 rounded-full object-cover border border-primary/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                    {primaryConv.partner.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-foreground">
                    {primaryConv.partner.name}
                  </h4>
                  {primaryConv.partner.city && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      {primaryConv.partner.city}
                      {primaryConv.partner.state ? `/${primaryConv.partner.state}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                {primaryConv.unreadCount} {primaryConv.unreadCount === 1 ? 'mensagem' : 'mensagens'}
              </span>
            </div>

            {primaryConv.lastMessageText && (
              <div className="bg-background/80 rounded-xl p-3 border border-border/60">
                <p className="text-xs text-foreground italic line-clamp-2">
                  &ldquo;{primaryConv.lastMessageText}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* Se houver mais de uma conversa não lida */}
        {unreadConvs.length > 1 && (
          <p className="text-xs text-muted-foreground text-center">
            E mais <span className="font-bold text-foreground">{unreadConvs.length - 1}</span> {unreadConvs.length - 1 === 1 ? 'outra conversa não lida' : 'outras conversas não lidas'}.
          </p>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            onClick={() => handleGoToChat(primaryConv?.partner.id)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-xs md:text-sm font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Ir para o Chat</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs md:text-sm font-semibold border border-border transition-colors cursor-pointer"
          >
            Responder Depois
          </button>
        </div>
      </div>
    </div>
  );
}
