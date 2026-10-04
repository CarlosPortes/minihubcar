'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Search,
  Check,
  CheckCheck,
  MapPin,
  ExternalLink,
  Layers,
  ArrowLeft,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import {
  communityApi,
  DirectConversationItem,
  DirectMessageItem,
} from '@/lib/api/community';
import { useAuth } from '@/features/auth/context/auth-context';

interface DirectMessagesSectionProps {
  initialRecipientId?: string | null;
  onClearInitialRecipient?: () => void;
}

export function DirectMessagesSection({
  initialRecipientId,
  onClearInitialRecipient,
}: DirectMessagesSectionProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<DirectConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const loadConversations = async () => {
    try {
      const res = await communityApi.listConversations();
      setConversations(res.data || []);
      return res.data || [];
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
      return [];
    } finally {
      setIsLoadingConvs(false);
    }
  };

  const loadMessages = async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await communityApi.getMessages(convId);
      setMessages(res.data.messages || []);
      setActivePartner(res.data.partner);
      // Update unread count in conversations list
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations().then((convs) => {
      if (initialRecipientId) {
        // Check if conversation already exists with this recipient
        const existing = convs.find((c) => c.partner.id === initialRecipientId);
        if (existing) {
          setActiveConversationId(existing.id);
          loadMessages(existing.id);
        } else {
          // New conversation placeholder with target user
          communityApi.getCollectorProfile(initialRecipientId).then((profRes) => {
            if (profRes.data?.collector) {
              setActivePartner(profRes.data.collector);
              setActiveConversationId('NEW_' + initialRecipientId);
              setMessages([]);
            }
          });
        }
        if (onClearInitialRecipient) onClearInitialRecipient();
      } else if (convs.length > 0 && !activeConversationId) {
        setActiveConversationId(convs[0]!.id);
        loadMessages(convs[0]!.id);
      }
    });
  }, [initialRecipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conv: DirectConversationItem) => {
    setActiveConversationId(conv.id);
    loadMessages(conv.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSending || !activePartner) return;

    setIsSending(true);
    const textToSend = messageText.trim();
    setMessageText('');

    try {
      const res = await communityApi.sendMessage(activePartner.id, textToSend);
      const newMsg = res.data.message;

      setMessages((prev) => [...prev, newMsg]);

      // If this was a new conversation, switch active id to the real one
      if (activeConversationId?.startsWith('NEW_')) {
        setActiveConversationId(res.data.conversationId);
      }

      // Reload conversations list to update order and preview
      loadConversations();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagem.');
      setMessageText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.partner.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-lg h-[680px] flex flex-col md:flex-row">
      {/* LEFT COLUMN: CONVERSATIONS LIST */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-secondary/10 shrink-0 ${
          activeConversationId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Search header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Mensagens Privadas
            </h3>
            <button
              onClick={() => loadConversations()}
              className="p-1 rounded text-muted-foreground hover:text-foreground"
              title="Atualizar"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar nas conversas..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              autoComplete="off"
              style={{ color: 'var(--foreground)' }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Conversation list items */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {isLoadingConvs ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Carregando conversas...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
              <MessageSquare className="w-8 h-8 text-primary mx-auto opacity-40" />
              <p className="font-semibold text-foreground">Nenhuma conversa ativa</p>
              <p>Visite a Vitrine dos Colecionadores e clique em &quot;Enviar Mensagem&quot; para iniciar um bate-papo.</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = activeConversationId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectConversation(c)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-secondary/60'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {c.partner.avatarUrl ? (
                      <img
                        src={c.partner.avatarUrl}
                        alt={c.partner.name}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                        {c.partner.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {c.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center shadow-sm">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-xs truncate">{c.partner.name}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(c.lastMessageAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      {c.lastMessageText || 'Conversa iniciada'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CHAT */}
      <div className={`flex-1 flex flex-col bg-background ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {activePartner ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {activePartner.avatarUrl ? (
                  <img
                    src={activePartner.avatarUrl}
                    alt={activePartner.name}
                    className="w-9 h-9 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                    {activePartner.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-foreground text-sm">{activePartner.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {activePartner.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        {activePartner.city}
                        {activePartner.state ? `/${activePartner.state}` : ''}
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-emerald-500 font-medium">Ativo na Comunidade</span>
                  </div>
                </div>
              </div>

              {/* Link to public collection */}
              <Link
                href={`/collection?userId=${activePartner.id}`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                Ver Coleção
              </Link>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-background/50">
              {isLoadingMessages ? (
                <div className="py-20 text-center text-xs text-muted-foreground">Carregando mensagens...</div>
              ) : messages.length === 0 ? (
                <div className="py-20 text-center text-xs text-muted-foreground space-y-2">
                  <Sparkles className="w-8 h-8 text-primary mx-auto opacity-50" />
                  <p className="font-semibold text-foreground">Inicie uma nova conversa!</p>
                  <p>Diga um olá, pergunte sobre as peças da coleção ou negocie miniaturas.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMine
                            ? 'bg-primary text-primary-foreground font-normal rounded-br-none shadow-sm'
                            : 'bg-card border border-border text-foreground font-normal rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1 px-1">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMine && (
                          msg.readAt ? (
                            <CheckCheck className="w-3 h-3 text-primary" />
                          ) : (
                            <Check className="w-3 h-3 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-border bg-card flex items-center gap-2.5">
              <input
                type="text"
                placeholder={`Mensagem para ${activePartner.name}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                style={{ color: 'var(--foreground)' }}
                className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-inner"
              />

              <button
                type="submit"
                disabled={!messageText.trim() || isSending}
                className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0 shadow-md flex items-center justify-center cursor-pointer"
                title="Enviar mensagem"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-foreground text-sm">Selecione uma conversa</h4>
              <p className="text-xs max-w-sm mt-1">
                Converse com outros colecionadores, combine trocas ou troque ideias sobre miniaturas diecast.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
