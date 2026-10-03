'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commercialApi, SellerApplicationAdminItem } from '@/lib/api/commercial';
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
} from 'lucide-react';

export default function AdminSellersPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [reviewingSeller, setReviewingSeller] = useState<SellerApplicationAdminItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED' | 'SUSPENDED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sellers', selectedStatus],
    queryFn: async () => {
      const res = await commercialApi.adminListSellerApplications(selectedStatus || undefined);
      return res.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!reviewingSeller) throw new Error('Nenhum vendedor selecionado');
      return commercialApi.adminReviewSellerApplication(reviewingSeller.sellerId, {
        status: reviewStatus,
        notes: reviewNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      setReviewingSeller(null);
      setReviewNotes('');
    },
  });

  const applications = data || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Painel de Governança
          </div>
          <h1 className="text-2xl font-black text-foreground">Moderação de Vendedores</h1>
          <p className="text-xs text-muted-foreground">
            Audite e aprove solicitações de colecionadores para atuação comercial no Marketplace
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-card p-1 rounded-xl border border-border">
          {[
            { label: 'Todos', value: '' },
            { label: 'Pendentes', value: 'PENDING' },
            { label: 'Aprovados', value: 'APPROVED' },
            { label: 'Rejeitados', value: 'REJECTED' },
            { label: 'Suspensos', value: 'SUSPENDED' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === tab.value
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">
            Carregando credenciamentos...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <Store className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold">Nenhuma solicitação encontrada com o filtro selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Loja / Vendedor</th>
                  <th className="py-2.5 px-3">Usuário</th>
                  <th className="py-2.5 px-3">Localidade</th>
                  <th className="py-2.5 px-3">Status Atual</th>
                  <th className="py-2.5 px-3">Data Solicitação</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {applications.map((app: SellerApplicationAdminItem) => (
                  <tr key={app.id} className="hover:bg-secondary/20">
                    <td className="py-3 px-3">
                      <p className="font-bold text-foreground text-sm">{app.seller?.storeName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">slug: {app.seller?.slug}</p>
                    </td>

                    <td className="py-3 px-3 text-muted-foreground">
                      <p className="font-semibold text-foreground">{app.seller?.user?.name}</p>
                      <p className="text-[10px]">{app.seller?.user?.email}</p>
                    </td>

                    <td className="py-3 px-3 text-muted-foreground">
                      {[app.seller?.city, app.seller?.state].filter(Boolean).join(', ') || 'Não informado'}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                          app.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : app.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : app.status === 'SUSPENDED'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {app.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                        {app.status === 'PENDING' && <Clock className="h-3 w-3" />}
                        {app.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(app.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setReviewingSeller(app);
                          setReviewStatus(app.status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED');
                          setReviewNotes(app.notes || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-foreground hover:bg-primary/20 hover:text-primary border border-border transition-colors"
                      >
                        Avaliar / Alterar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewingSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">
              Moderar Vendedor: {reviewingSeller.seller?.storeName}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Decisão de Auditoria</label>
                <select
                  value={reviewStatus}
                  onChange={(e: any) => setReviewStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-xs text-foreground"
                >
                  <option value="APPROVED">APROVAR (Habilita publicação de ofertas e vendas)</option>
                  <option value="REJECTED">REJEITAR (Não cumpre critérios mínimos)</option>
                  <option value="SUSPENDED">SUSPENDER (Bloqueia anúncios e vendas)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Notas da Auditoria</label>
                <textarea
                  rows={3}
                  placeholder="Justificativa ou orientações para o vendedor..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-background border border-border text-xs text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setReviewingSeller(null)}
                  className="px-4 py-2 rounded-lg bg-secondary text-xs font-semibold text-foreground"
                >
                  Cancelar
                </button>
                <button
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate()}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-glow"
                >
                  {reviewMutation.isPending ? 'Salvando...' : 'Aplicar Decisão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
