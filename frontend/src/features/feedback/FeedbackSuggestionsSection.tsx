'use client';

import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Plus,
  CheckCircle2,
  Clock,
  Code2,
  Bug,
  Sparkles,
  MessageSquare,
  AlertCircle,
  X,
  Send,
  User,
  Filter,
} from 'lucide-react';
import {
  feedbackApi,
  FeedbackSuggestion,
  FeedbackType,
} from '@/lib/api/feedback';
import { useAuth } from '@/features/auth/context/auth-context';

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: any; color: string }> = {
  FEATURE_REQUEST: { label: 'Nova Funcionalidade', icon: Sparkles, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  USABILITY: { label: 'Melhoria de Usabilidade', icon: Lightbulb, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  COMMUNITY_IDEA: { label: 'Ideia para a Comunidade', icon: MessageSquare, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  BUG_REPORT: { label: 'Reportar Problema / Bug', icon: Bug, color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  OTHER: { label: 'Outro Feedback', icon: Lightbulb, color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Em Análise', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PLANNED: { label: 'No Roadmap', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  IN_PROGRESS: { label: 'Em Desenvolvimento', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  IMPLEMENTED: { label: 'Implementado!', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  DECLINED: { label: 'Não Aplicável', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
};

export function FeedbackSuggestionsSection() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN');

  const [feedbacks, setFeedbacks] = useState<FeedbackSuggestion[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newType, setNewType] = useState<FeedbackType>('FEATURE_REQUEST');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Admin Response Modal
  const [moderatingItem, setModeratingItem] = useState<FeedbackSuggestion | null>(null);
  const [modStatus, setModStatus] = useState<string>('PLANNED');
  const [modResponse, setModResponse] = useState('');
  const [isModerating, setIsModerating] = useState(false);

  const loadFeedbacks = async () => {
    setIsLoading(true);
    try {
      const res = await feedbackApi.list(
        selectedType !== 'ALL' ? selectedType : undefined,
        selectedStatus !== 'ALL' ? selectedStatus : undefined
      );
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar feedbacks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [selectedType, selectedStatus]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      await feedbackApi.create({
        type: newType,
        title: newTitle,
        description: newDescription,
      });

      setFormSuccess('Sugestão enviada com sucesso! Nossa equipe analisará com carinho.');
      setNewTitle('');
      setNewDescription('');
      loadFeedbacks();
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setFormSuccess(null);
      }, 1800);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao enviar sugestão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moderatingItem) return;
    setIsModerating(true);

    try {
      await feedbackApi.moderate(moderatingItem.id, {
        status: modStatus as any,
        adminResponse: modResponse,
      });

      setModeratingItem(null);
      loadFeedbacks();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar sugestão.');
    } finally {
      setIsModerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-card via-card to-secondary/30 border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Lightbulb className="w-3.5 h-3.5" />
            Ideias & Sugestões da Comunidade
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Ajude a Construir o Futuro do MiniHub Car
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
            Tem alguma ideia para novas funcionalidades, melhorias na usabilidade ou sugestão de
            recursos? Envie sua proposta para análise direta da equipe técnica!
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs md:text-sm hover:bg-primary/90 transition-all shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          Manifestar Ideia ou Sugestão
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
              selectedType === 'ALL'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos os Tipos
          </button>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setSelectedType(k)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                selectedType === k
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Status select */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">Todos os Status</option>
          <option value="PENDING">Em Análise</option>
          <option value="PLANNED">No Roadmap</option>
          <option value="IN_PROGRESS">Em Desenvolvimento</option>
          <option value="IMPLEMENTED">Implementados</option>
          <option value="DECLINED">Não Aplicáveis</option>
        </select>
      </div>

      {/* List of Suggestions */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">Carregando sugestões...</div>
      ) : feedbacks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
          <Lightbulb className="w-8 h-8 text-primary mx-auto opacity-50" />
          <p className="text-sm font-semibold text-foreground">Nenhuma sugestão encontrada</p>
          <p className="text-xs text-muted-foreground">
            Seja o primeiro a enviar uma ideia inovadora para o MiniHub Car!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((item) => {
            const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.OTHER;
            const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
            const TypeIcon = typeConf.icon;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-card border border-border p-5 space-y-3 hover:border-border/80 transition-all shadow-sm"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeConf.color}`}
                    >
                      <TypeIcon className="w-3 h-3" />
                      {typeConf.label}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusConf.color}`}
                    >
                      {statusConf.label}
                    </span>
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    Enviado por <strong>{item.author?.name || 'Colecionador'}</strong> •{' '}
                    {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-bold text-foreground text-base">{item.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground/90 mt-1 whitespace-pre-line leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Official Admin Response */}
                {item.adminResponse && (
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resposta da Equipe Técnica MiniHub Car:
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">{item.adminResponse}</p>
                  </div>
                )}

                {/* Admin moderation trigger */}
                {isAdmin && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setModeratingItem(item);
                        setModStatus(item.status);
                        setModResponse(item.adminResponse || '');
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                    >
                      Responder / Modificar Status (Admin)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Enviar Nova Ideia */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-foreground">Enviar Nova Ideia ou Sugestão</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compartilhe o que tornaria o MiniHub Car ainda melhor para você
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Tipo de Sugestão</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as FeedbackType)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Título Resumido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gráfico de valorização histórica por montadora"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Descrição Detalhada *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explique como essa funcionalidade funcionaria e de que maneira ela ajudaria você e os demais colecionadores..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Sugestão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Resposta */}
      {moderatingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              onClick={() => setModeratingItem(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-base font-bold text-foreground">Moderar Sugestão (Admin)</h2>
              <p className="text-muted-foreground mt-0.5 line-clamp-1">{moderatingItem.title}</p>
            </div>

            <form onSubmit={handleModerateSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Status da Ideia</label>
                <select
                  value={modStatus}
                  onChange={(e) => setModStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground"
                >
                  <option value="PENDING">Em Análise</option>
                  <option value="PLANNED">No Roadmap (Planejado)</option>
                  <option value="IN_PROGRESS">Em Desenvolvimento</option>
                  <option value="IMPLEMENTED">Implementado!</option>
                  <option value="DECLINED">Não Aplicável</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Resposta Oficial para o Colecionador</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Excelente sugestão! Incluímos no roadmap da versão 1.2..."
                  value={modResponse}
                  onChange={(e) => setModResponse(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModeratingItem(null)}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isModerating}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                >
                  {isModerating ? 'Salvando...' : 'Salvar Resposta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
