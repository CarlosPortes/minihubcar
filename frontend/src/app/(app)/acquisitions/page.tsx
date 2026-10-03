'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/context/auth-context';
import { TrendingUp, ShoppingBag, DollarSign, Calendar, User, Car, Store, AlertOctagon } from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

const getReasonBadge = (reason: string) => {
  switch (reason) {
    case 'QUEBRA':
      return { label: 'Quebra / Avaria', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'PERDA':
      return { label: 'Perda / Extravio', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    case 'DEFEITO':
      return { label: 'Defeito de Fabricação', className: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    case 'DESCARTE':
      return { label: 'Descarte', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' };
    default:
      return { label: reason || 'Outro', className: 'bg-secondary text-muted-foreground border-border' };
  }
};

export default function AcquisitionsPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'ACQUISITIONS' | 'SALES' | 'WRITE_OFFS'>('ACQUISITIONS');

  const { data: acqData, isLoading: loadingAcq } = useQuery<{
    data: Array<{
      id: string;
      acquisitionType: string;
      acquisitionDate: string;
      sourceName: string | null;
      notes: string | null;
      unitCost: string;
      totalCost: string;
      exemplarId?: string;
      exemplarStatus?: string;
      writeOffId?: string | null;
      writeOffReason?: string | null;
      writeOffDate?: string | null;
      variationName?: string;
      brandName?: string;
      photoUrl?: string | null;
    }>;
  }>({
    queryKey: ['acquisitions', 'list'],
    queryFn: () => apiClient('/acquisitions'),
    enabled: isAuthenticated,
  });

  const { data: salesData, isLoading: loadingSales } = useQuery<{
    data: Array<{
      id: string;
      saleDate: string;
      buyerName: string | null;
      notes: string | null;
      unitPrice: string;
      totalPrice: string;
      purchasePrice?: string | null;
      purchaseLocation?: string | null;
      variationName: string;
      brandName: string;
      photoUrl: string | null;
    }>;
  }>({
    queryKey: ['sales', 'list'],
    queryFn: () => apiClient('/sales'),
    enabled: isAuthenticated,
  });

  const { data: writeOffsData, isLoading: loadingWriteOffs } = useQuery<{
    data: Array<{
      id: string;
      writeOffDate: string;
      reason: string;
      notes: string | null;
      exemplarId: string;
      purchasePrice?: string | null;
      purchaseLocation?: string | null;
      variationName: string;
      brandName: string;
      photoUrl: string | null;
    }>;
  }>({
    queryKey: ['writeOffs', 'list'],
    queryFn: () => apiClient('/write-offs'),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground">Acesse sua conta para ver suas transações</h2>
        <Link
          href="/login"
          className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow"
        >
          Fazer Login
        </Link>
      </div>
    );
  }

  const acquisitions = acqData?.data || [];
  const sales = salesData?.data || [];
  const writeOffs = writeOffsData?.data || [];

  const totalAcquisitions = acquisitions.reduce((acc, cur) => acc + parseFloat(cur.totalCost || '0'), 0);
  const totalSales = sales.reduce((acc, cur) => acc + parseFloat(cur.totalPrice || '0'), 0);
  const netBalance = totalAcquisitions - totalSales;
  const totalWriteOffsCost = writeOffs.reduce((acc, cur) => acc + parseFloat(cur.purchasePrice || '0'), 0);
  const writeOffsCount = writeOffs.length;

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Aquisições & Vendas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Livro de registros financeiros e controle patrimonial da sua coleção
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('ACQUISITIONS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ACQUISITIONS'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> Aquisições ({acquisitions.length})
          </button>
          <button
            onClick={() => setActiveTab('SALES')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'SALES'
                ? 'bg-emerald-600 text-white shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Vendas ({sales.length})
          </button>
          <button
            onClick={() => setActiveTab('WRITE_OFFS')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'WRITE_OFFS'
                ? 'bg-amber-600 text-white shadow-glow'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <AlertOctagon className="h-4 w-4" /> Baixas ({writeOffs.length})
          </button>
        </div>
      </div>

      {/* Financial Summary - 5 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* 1. Total em Aquisições */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total de Aquisições</span>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-black text-foreground mt-2">
            R$ {totalAcquisitions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">Investido em compras</span>
        </div>

        {/* 2. Receitas de Vendas */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Receitas de Vendas</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 mt-2">
            R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">Arrecadado com vendas</span>
        </div>

        {/* 3. Balanço Líquido */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Balanço Líquido</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className={`text-xl font-black mt-2 ${netBalance <= 0 ? 'text-emerald-400' : 'text-primary'}`}>
            R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">
            (Total Aquisições - Receita Vendas)
          </span>
        </div>

        {/* 4. Total de Baixas por Perda/Quebras */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total de Baixas</span>
            <AlertOctagon className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-xl font-black text-rose-400 mt-2">
            R$ {totalWriteOffsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">Perdas/Quebras em R$</span>
        </div>

        {/* 5. Baixas Patrimoniais (Quantidade de Itens) */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Baixas Patrimoniais</span>
            <AlertOctagon className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400 mt-2">
            {writeOffsCount} {writeOffsCount === 1 ? 'item' : 'itens'}
          </p>
          <span className="text-[10px] text-muted-foreground mt-1">Quantidade de itens</span>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'ACQUISITIONS' ? (
        loadingAcq ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : acquisitions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-card border border-border">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-bold text-foreground">Nenhuma aquisição registrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ao adicionar um exemplar com custo, o registro de compra é gerado automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {acquisitions.map((acq) => {
              const isWrittenOff = Boolean(acq.writeOffReason || acq.exemplarStatus === 'DISCARDED');
              const isSold = acq.exemplarStatus === 'SOLD';
              const reasonInfo = acq.writeOffReason ? getReasonBadge(acq.writeOffReason) : null;

              return (
                <div
                  key={acq.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-card border gap-3 transition-all ${
                    isWrittenOff
                      ? 'border-amber-500/40 bg-amber-950/10 hover:border-amber-500/60 shadow-sm'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border relative">
                      <MiniatureImage
                        src={acq.photoUrl || null}
                        alt={acq.variationName || 'Miniatura'}
                        containerClassName="h-full w-full bg-secondary flex items-center justify-center overflow-hidden"
                      />
                      {isWrittenOff && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                          <AlertOctagon className="h-5 w-5 text-amber-400 drop-shadow" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {acq.brandName && (
                          <span className="text-[10px] font-bold text-primary uppercase">
                            {acq.brandName}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-foreground">
                          {acq.acquisitionType}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {acq.acquisitionDate}
                        </span>

                        {isWrittenOff && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              reasonInfo
                                ? reasonInfo.className
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <AlertOctagon className="h-3 w-3 shrink-0" />
                            Baixa: {reasonInfo?.label || 'Perda / Quebra'}
                            {acq.writeOffDate && ` • ${acq.writeOffDate}`}
                          </span>
                        )}

                        {isSold && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            Vendido
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-foreground truncate">
                        {acq.variationName || 'Miniatura adquirida'}
                      </p>

                      {acq.sourceName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>
                            Local de Compra: <strong className="text-foreground">{acq.sourceName}</strong>
                          </span>
                        </p>
                      )}
                      {acq.notes && <p className="text-xs text-muted-foreground italic truncate">{acq.notes}</p>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-muted-foreground block">
                      {isWrittenOff ? 'Custo Original (Baixado)' : 'Valor Pago'}
                    </span>
                    <span className={`text-sm font-black ${isWrittenOff ? 'text-amber-400' : 'text-foreground'}`}>
                      R$ {parseFloat(acq.totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'SALES' ? (
        loadingSales ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-card border border-border">
            <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-bold text-foreground">Nenhuma venda realizada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Você pode vender miniaturas a qualquer momento através do menu &quot;Minha Coleção&quot;.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((s) => {
              const saleVal = parseFloat(s.totalPrice || '0');
              const purchaseVal = s.purchasePrice != null ? parseFloat(s.purchasePrice) : null;
              const profit = purchaseVal != null ? saleVal - purchaseVal : null;

              return (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-card border border-border gap-3 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border">
                      <MiniatureImage
                        src={s.photoUrl}
                        alt={s.variationName}
                        containerClassName="h-full w-full bg-secondary flex items-center justify-center overflow-hidden"
                      />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-primary uppercase">{s.brandName}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {s.saleDate}
                        </span>
                        {s.buyerName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> Comprador: <strong className="text-foreground">{s.buyerName}</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">{s.variationName}</p>

                      {/* Local e valor de compra original */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        {s.purchaseLocation && (
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3 text-primary shrink-0" />
                            <span>Comprado em: <strong className="text-foreground">{s.purchaseLocation}</strong></span>
                          </span>
                        )}
                        {purchaseVal != null && (
                          <span>
                            Custo original: <strong className="text-foreground">R$ {purchaseVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-right shrink-0">
                    <div>
                      <span className="text-[11px] text-emerald-400 font-bold block">Valor da Venda</span>
                      <span className="text-sm font-black text-foreground">
                        R$ {saleVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {profit != null && (
                      <div className="text-[11px]">
                        <span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {profit >= 0
                            ? `+ Lucro: R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : `- Prejuízo: R$ ${Math.abs(profit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* WRITE_OFFS TAB */
        loadingWriteOffs ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-card/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : writeOffs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-card border border-border">
            <AlertOctagon className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-bold text-foreground">Nenhuma baixa registrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quando uma miniatura quebrar, for perdida ou avariada, dê baixa através do card na sua Coleção.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {writeOffs.map((w) => {
              const reasonInfo = getReasonBadge(w.reason);
              const purchaseVal = w.purchasePrice != null ? parseFloat(w.purchasePrice) : null;

              return (
                <div
                  key={w.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl bg-card border border-border gap-3 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border">
                      <MiniatureImage
                        src={w.photoUrl}
                        alt={w.variationName}
                        containerClassName="h-full w-full bg-secondary flex items-center justify-center overflow-hidden"
                      />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-primary uppercase">{w.brandName}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${reasonInfo.className}`}>
                          {reasonInfo.label}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {w.writeOffDate}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">{w.variationName}</p>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        {w.purchaseLocation && (
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3 text-primary shrink-0" />
                            <span>Comprado em: <strong className="text-foreground">{w.purchaseLocation}</strong></span>
                          </span>
                        )}
                        {purchaseVal != null && (
                          <span>
                            Custo original de compra: <strong className="text-foreground">R$ {purchaseVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </span>
                        )}
                      </div>

                      {w.notes && <p className="text-xs text-muted-foreground italic truncate">{w.notes}</p>}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-right shrink-0">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Valor da Baixa</span>
                      <span className="text-sm font-black text-muted-foreground">
                        R$ 0,00
                      </span>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Baixa sem receita
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
