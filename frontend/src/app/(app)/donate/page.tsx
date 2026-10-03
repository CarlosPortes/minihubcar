'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  QrCode,
  Copy,
  Check,
  Server,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Flame,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  Users,
} from 'lucide-react';
import { fetchDonationsCampaign, notifyDonation, CampaignStatusResponse } from '@/lib/api/donations';
import { useAuth } from '@/features/auth/context/auth-context';

export default function DonatePage() {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<CampaignStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);

  // Form state
  const [donorName, setDonorName] = useState(user?.name || '');
  const [amount, setAmount] = useState('10');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchDonationsCampaign();
      setCampaign(data);
    } catch (err) {
      console.error('Failed to load campaign', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyPix = () => {
    if (!campaign?.pixKey) return;
    navigator.clipboard.writeText(campaign.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setSubmitting(true);
    try {
      await notifyDonation({
        donorName: donorName.trim() || undefined,
        amount: Number(amount),
        message: message.trim() || undefined,
      });
      setSubmittedSuccess(true);
      setMessage('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Falha ao registrar contribuição.');
    } finally {
      setSubmitting(false);
    }
  };

  const goal = campaign?.goal ?? 110.0;
  const collected = campaign?.collected ?? 0.0;
  const progressPercentage = campaign?.progressPercentage ?? 0;
  const remaining = campaign?.remaining ?? goal;
  const daysRemaining = campaign?.daysRemaining ?? 0;
  const pixKey = campaign?.pixKey || 'e82b7811-e6ca-430c-99c5-849187383bb1';

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/90 to-rose-500/10 border border-border p-6 sm:p-10 shadow-card">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <Heart className="h-3.5 w-3.5 fill-rose-500/30" />
            <span>Comunidade & Sustentabilidade</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
            Apoie o <span className="text-primary">MiniHub Car</span> e Mantenha a Garagem no Ar!
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            O MiniHub Car é um projeto gratuito feito com carinho para a comunidade brasileira de colecionadores de miniaturas 1:64.
            Não exibimos anúncios invasivos nem vendemos seus dados. Para manter a hospedagem na nuvem, banco de dados e as fotos em alta velocidade, contamos com contribuições voluntárias da nossa comunidade!
          </p>
        </div>
      </section>

      {/* TERMÔMETRO MENSAL */}
      <section className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Flame className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-black text-foreground">Termômetro da Hospedagem Mensal</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Meta para custear a hospedagem Hostinger (VPS) e infraestrutura • Ciclo: <strong className="text-foreground">{campaign?.cycleLabel || '20 do mês ao dia 20'}</strong> (vencimento dia 20).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Ciclo: {campaign?.cycleLabel || 'Dia 20 a 20'}</span>
              <p className="text-xs font-bold text-foreground flex items-center gap-1 justify-end">
                <Clock className="h-3.5 w-3.5 text-primary" /> {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Thermometer Bar */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Arrecadado no Mês</span>
              <div className="text-3xl font-black text-foreground flex items-baseline gap-1">
                <span>R$ {collected.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs text-muted-foreground font-medium">/ R$ {goal.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progresso</span>
              <div className="text-2xl font-black text-primary">
                {progressPercentage}%
              </div>
            </div>
          </div>

          {/* Progress Track */}
          <div className="relative w-full h-6 rounded-full bg-secondary/80 border border-border overflow-hidden p-1 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary transition-all duration-700 relative flex items-center justify-end pr-2"
              style={{ width: `${Math.max(5, progressPercentage)}%` }}
            >
              {progressPercentage >= 10 && (
                <span className="text-[10px] font-black text-white drop-shadow">
                  {progressPercentage}%
                </span>
              )}
            </div>
          </div>

          {/* Metrics Footer */}
          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {remaining <= 0 ? (
                  <strong className="text-emerald-400 font-bold">Meta mensal atingida! Muito obrigado! 🎉</strong>
                ) : (
                  <>Faltam apenas <strong className="text-foreground">R$ {remaining.toFixed(2)}</strong> para cobrir este mês</>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium border border-border">
                {campaign?.donationCount || 0} contribuições
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CHAVE PIX & INSTRUÇÕES DE DOAÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Pix */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs">
                  PIX
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Chave PIX Oficial</h3>
                  <p className="text-[11px] text-muted-foreground">Qualquer banco • Sem taxas adicionais</p>
                </div>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold border border-border uppercase">
                Chave Aleatória
              </span>
            </div>

            {/* Chave Box com Botão de Copiar */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Chave Aleatória para Transferência:</label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border font-mono text-xs select-all text-foreground break-all">
                <span className="flex-1 truncate">{pixKey}</span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                    copied
                      ? 'bg-emerald-500 text-white shadow-glow'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar Chave
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sugestões de Valores */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Sugestões de Apoio:</label>
              <div className="grid grid-cols-4 gap-2">
                {['5', '10', '25', '50'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      amount === val
                        ? 'bg-primary text-primary-foreground border-primary shadow-glow'
                        : 'bg-secondary text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    R$ {val}
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code toggle */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 text-primary" /> QR Code PIX
                </span>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {showQr ? 'Ocultar' : 'Exibir QR Code'}
                </button>
              </div>

              {showQr && (
                <div className="mt-3 p-4 rounded-xl bg-white border border-border flex flex-col items-center text-center space-y-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      pixKey
                    )}`}
                    alt="QR Code PIX MiniHub Car"
                    className="h-40 w-40 object-contain rounded-lg"
                  />
                  <p className="text-[10px] text-zinc-600 font-medium">
                    Abra o app do seu banco &gt; Pagar com PIX &gt; Ler QR Code
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-secondary/40 border border-border text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Beneficiário Oficial:
            </p>
            <p>MiniHub Car — Manutenção e Infraestrutura Hostinger</p>
          </div>
        </section>

        {/* Notificar Doação & Mensagem de Apoio */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-card space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Já fez a sua doação?</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe seu nome e uma mensagem de incentivo para que o termômetro seja atualizado e você entre no mural de apoiadores!
            </p>
          </div>

          {submittedSuccess ? (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-3 text-center">
              <Check className="h-10 w-10 mx-auto text-emerald-400" />
              <h4 className="text-sm font-bold">Obrigado pela sua contribuição!</h4>
              <p className="text-xs text-emerald-300/90 leading-relaxed">
                Sua ajuda é fundamental para que continuemos desenvolvendo o MiniHub Car com liberdade, paixão e dedicação total aos colecionadores.
              </p>
              <button
                type="button"
                onClick={() => setSubmittedSuccess(false)}
                className="mt-2 px-4 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-muted border border-border"
              >
                Registrar outra contribuição
              </button>
            </div>
          ) : (
            <form onSubmit={handleNotifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Seu Nome ou Apelido de Colecionador
                </label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Ex: Carlos Miniaturas, Garagem 64..."
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Valor Doado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10,00"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Mensagem de Apoio (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Parabéns pela plataforma! Excelente iniciativa para nós colecionadores..."
                  className="w-full p-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !amount}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs"
              >
                {submitting ? (
                  'Registrando...'
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Confirmar & Atualizar Termômetro
                  </>
                )}
              </button>
            </form>
          )}

          {/* Supporters List */}
          {campaign?.supporters && campaign.supporters.length > 0 && (
            <div className="pt-4 border-t border-border space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="h-3.5 w-3.5 text-primary" /> Mural de Apoiadores Recentes
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {campaign.supporters.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{item.donorName}</span>
                      <span className="text-[11px] font-semibold text-emerald-400">
                        R$ {parseFloat(item.amount).toFixed(2)}
                      </span>
                    </div>
                    {item.message && (
                      <p className="text-[11px] text-muted-foreground italic">&ldquo;{item.message}&rdquo;</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Onde o dinheiro é investido */}
      <section className="rounded-2xl bg-secondary/30 border border-border p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          Transparência: Onde cada real é investido?
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Toda e qualquer doação é 100% destinada aos custos operacionais da infraestrutura do MiniHub Car:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
            <h4 className="font-bold text-foreground">Hospedagem Hostinger (VPS)</h4>
            <p className="text-muted-foreground text-[11px]">
              Custo mensal de aproximadamente R$ 110,00 para manter o servidor online 24/7 com alta performance e sem travamentos.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
            <h4 className="font-bold text-foreground">Banco de Dados PostgreSQL</h4>
            <p className="text-muted-foreground text-[11px]">
              Armazenamento seguro de todo o catálogo, fichas técnicas, variações e registros patrimoniais dos usuários.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
            <h4 className="font-bold text-foreground">Armazenamento de Fotos & CDN</h4>
            <p className="text-muted-foreground text-[11px]">
              Tráfego de rede para entrega ultrarrápida das fotos em alta resolução de todas as miniaturas e expositores 2D/3D.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
