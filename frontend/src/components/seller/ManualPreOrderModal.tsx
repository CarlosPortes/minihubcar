'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  User,
  Mail,
  Phone,
  Car,
  Calendar,
  CreditCard,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  createManualPreOrder,
  CreateManualPreOrderInput,
  ManualInstallmentInput,
  ManualPreOrderResponse,
} from '@/lib/api/pre-orders';

interface ManualPreOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sellerStoreName?: string;
}

export function ManualPreOrderModal({
  isOpen,
  onClose,
  onSuccess,
  sellerStoreName = 'Loja Oficial',
}: ManualPreOrderModalProps) {
  const queryClient = useQueryClient();

  // Wizard Step (1: Cliente, 2: Miniatura, 3: Parcelas & Baixas, 4: Sucesso)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State: Collector
  const [collectorName, setCollectorName] = useState('');
  const [collectorEmail, setCollectorEmail] = useState('');
  const [collectorWhatsapp, setCollectorWhatsapp] = useState('');

  // Form State: Miniature
  const [miniatureName, setMiniatureName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [photoUrl, setPhotoUrl] = useState('');

  // Form State: Financial
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<'INSTALLMENTS' | 'DEPOSIT_AND_BALANCE' | 'FULL_ON_ARRIVAL'>('INSTALLMENTS');
  const [installmentsCount, setInstallmentsCount] = useState('3');
  const [installments, setInstallments] = useState<ManualInstallmentInput[]>([]);
  const [notes, setNotes] = useState('');

  // Result state
  const [resultData, setResultData] = useState<ManualPreOrderResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Error message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recalculate installments when moving to Step 3
  const generateInstallments = () => {
    const total = parseFloat(totalAmount.replace(',', '.')) || 0;
    const count = parseInt(installmentsCount, 10) || 1;
    if (total <= 0 || count < 1) return;

    const baseVal = Math.floor((total / count) * 100) / 100;
    const remainder = Math.round((total - baseVal * count) * 100) / 100;

    const today = new Date();
    const newInsts: ManualInstallmentInput[] = [];

    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + (i - 1));
      const val = i === 1 ? (baseVal + remainder).toFixed(2) : baseVal.toFixed(2);

      newInsts.push({
        installmentNumber: i,
        totalInstallments: count,
        amount: val,
        dueDate: dueDate.toISOString().slice(0, 10),
        status: i === 1 && paymentPlan === 'DEPOSIT_AND_BALANCE' ? 'PAID' : 'PENDING',
        paidAt: i === 1 && paymentPlan === 'DEPOSIT_AND_BALANCE' ? new Date().toISOString() : null,
        settledAmount: i === 1 && paymentPlan === 'DEPOSIT_AND_BALANCE' ? val : null,
        paymentMethod: 'PIX',
        description:
          i === 1
            ? '1ª Parcela (Sinal / Entrada)'
            : `Parcela ${i} de ${count}`,
        notes: null,
      });
    }

    setInstallments(newInsts);
  };

  // Toggle Installment Paid Status
  const toggleInstallmentStatus = (idx: number) => {
    setInstallments((prev) =>
      prev.map((inst, i) => {
        if (i !== idx) return inst;
        const newStatus = inst.status === 'PAID' ? 'PENDING' : 'PAID';
        return {
          ...inst,
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date().toISOString() : null,
          settledAmount: newStatus === 'PAID' ? inst.amount : null,
        };
      })
    );
  };

  const updateInstallmentField = (idx: number, field: keyof ManualInstallmentInput, value: any) => {
    setInstallments((prev) =>
      prev.map((inst, i) => (i === idx ? { ...inst, [field]: value } : inst))
    );
  };

  // Mutation: Create Manual Pre-Order
  const mutation = useMutation({
    mutationFn: async () => {
      const total = parseFloat(totalAmount.replace(',', '.'));
      if (isNaN(total) || total <= 0) {
        throw new Error('Informe um valor total válido para a miniatura.');
      }

      const input: CreateManualPreOrderInput = {
        collector: {
          name: collectorName.trim(),
          email: collectorEmail.trim().toLowerCase(),
          whatsapp: collectorWhatsapp.trim() || undefined,
        },
        miniature: {
          name: miniatureName.trim(),
          brandName: brandName.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          estimatedArrival: estimatedArrival.trim() || undefined,
          quantity: parseInt(quantity, 10) || 1,
        },
        financial: {
          totalAmount: total.toFixed(2),
          paymentPlan,
          installments: installments.map((inst) => ({
            ...inst,
            amount: parseFloat(inst.amount.replace(',', '.')).toFixed(2),
            settledAmount: inst.settledAmount
              ? parseFloat(inst.settledAmount.replace(',', '.')).toFixed(2)
              : undefined,
          })),
          notes: notes.trim() || undefined,
        },
      };

      return createManualPreOrder(input);
    },
    onSuccess: (res) => {
      setResultData(res);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['seller-pre-orders-report'] });
      queryClient.invalidateQueries({ queryKey: ['seller-collectors-status'] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Falha ao cadastrar pré-venda manual.');
    },
  });

  const handleNextStep1 = () => {
    if (!collectorName.trim()) {
      setErrorMsg('Informe o nome completo do colecionador.');
      return;
    }
    if (!collectorEmail.trim() || !collectorEmail.includes('@')) {
      setErrorMsg('Informe um e-mail válido para o colecionador.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!miniatureName.trim()) {
      setErrorMsg('Informe o nome/modelo da miniatura.');
      return;
    }
    const total = parseFloat(totalAmount.replace(',', '.'));
    if (isNaN(total) || total <= 0) {
      setErrorMsg('Informe o valor total da miniatura.');
      return;
    }
    setErrorMsg(null);
    generateInstallments();
    setStep(3);
  };

  const handleResetAndClose = () => {
    setStep(1);
    setCollectorName('');
    setCollectorEmail('');
    setCollectorWhatsapp('');
    setMiniatureName('');
    setBrandName('');
    setEstimatedArrival('');
    setTotalAmount('');
    setQuantity('1');
    setInstallments([]);
    setResultData(null);
    setErrorMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border/40 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                Cadastrar Colecionador & Pré-Venda
              </h3>
              <p className="text-xs text-muted-foreground">
                Cadastre clientes novos com senha automática ou vincule vendas a clientes existentes.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wizard Progress Steps (when not finished) */}
        {step < 4 && (
          <div className="px-6 pt-4 pb-2 border-b border-border/30 bg-secondary/10 flex items-center justify-between text-xs">
            <div
              className={`flex items-center gap-2 font-semibold ${
                step >= 1 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>1</span>
              <span>Colecionador</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div
              className={`flex items-center gap-2 font-semibold ${
                step >= 2 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>2</span>
              <span>Miniatura & Preço</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div
              className={`flex items-center gap-2 font-semibold ${
                step >= 3 ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}>3</span>
              <span>Parcelas & Baixas</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: DADOS DO COLECIONADOR */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Provisionamento Automático de Conta
                </p>
                <p className="text-xs text-muted-foreground">
                  Se o cliente já tiver cadastro no MiniHub Car, a venda será vinculada a ele. Caso seja novo, o sistema criará o acesso com a senha padrão <strong>MiniHub@2026</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Nome Completo do Colecionador *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  E-mail do Colecionador * (Login de Acesso)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={collectorEmail}
                    onChange={(e) => setCollectorEmail(e.target.value)}
                    placeholder="Ex: joao.silva@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  WhatsApp com DDD (Para Envio do Link e Lembretes)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={collectorWhatsapp}
                    onChange={(e) => setCollectorWhatsapp(e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MINIATURA & VALORES */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Nome / Modelo da Miniatura *
                </label>
                <input
                  type="text"
                  value={miniatureName}
                  onChange={(e) => setMiniatureName(e.target.value)}
                  placeholder="Ex: Porsche 911 GT3 R Test Edition Almost Real"
                  className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Fabricante / Marca
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ex: Almost Real, Mini GT, Kaido House..."
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Previsão de Chegada
                  </label>
                  <input
                    type="text"
                    value={estimatedArrival}
                    onChange={(e) => setEstimatedArrival(e.target.value)}
                    placeholder="Ex: Dezembro/2026 ou 15/12/2026"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Valor Total da Miniatura (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                    <input
                      type="text"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="180,00"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Modalidade de Pagamento
                  </label>
                  <select
                    value={paymentPlan}
                    onChange={(e) => setPaymentPlan(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="INSTALLMENTS">Parcelado</option>
                    <option value="DEPOSIT_AND_BALANCE">Sinal + Saldo na Chegada</option>
                    <option value="FULL_ON_ARRIVAL">Integral na Chegada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Número de Parcelas
                  </label>
                  <select
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}x {n === 1 ? '(À vista)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PARCELAS & BAIXAS JÁ REALIZADAS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Cronograma de Parcelas & Histórico de Baixas
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Marque as parcelas que o cliente <strong>já pagou</strong> para registrar a baixa imediata.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Total Contratado:</span>
                  <strong className="text-sm text-primary">R$ {parseFloat(totalAmount.replace(',', '.')).toFixed(2)}</strong>
                </div>
              </div>

              <div className="space-y-2.5">
                {installments.map((inst, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      inst.status === 'PAID'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-secondary/40 border-border/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Checkbox: Paga / Pendente */}
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id={`inst-paid-${idx}`}
                          checked={inst.status === 'PAID'}
                          onChange={() => toggleInstallmentStatus(idx)}
                          className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                        />
                        <label
                          htmlFor={`inst-paid-${idx}`}
                          className="cursor-pointer select-none text-xs font-bold text-foreground flex items-center gap-1.5"
                        >
                          <span>{inst.description}</span>
                          {inst.status === 'PAID' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                              JÁ BAIXADA (PAGA)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary text-muted-foreground">
                              PENDENTE
                            </span>
                          )}
                        </label>
                      </div>

                      {/* Inputs: Valor & Vencimento */}
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <input
                            type="text"
                            value={inst.amount}
                            onChange={(e) => updateInstallmentField(idx, 'amount', e.target.value)}
                            className="w-full px-2 py-1 rounded bg-secondary text-xs text-foreground font-bold border border-border text-right"
                            title="Valor da parcela"
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="date"
                            value={inst.dueDate}
                            onChange={(e) => updateInstallmentField(idx, 'dueDate', e.target.value)}
                            className="w-full px-2 py-1 rounded bg-secondary text-[11px] text-foreground border border-border"
                            title="Data de vencimento"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Extended options when marked as PAID */}
                    {inst.status === 'PAID' && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="text-emerald-400 font-medium">Meio de Pagamento:</span>
                        <select
                          value={inst.paymentMethod}
                          onChange={(e) => updateInstallmentField(idx, 'paymentMethod', e.target.value)}
                          className="px-2 py-0.5 rounded bg-secondary text-foreground text-xs border border-border"
                        >
                          <option value="PIX">PIX</option>
                          <option value="CARTAO">Cartão de Crédito</option>
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="TRANSFERENCIA">Transferência</option>
                          <option value="OUTRO">Outro</option>
                        </select>

                        <span className="text-emerald-400 font-medium ml-2">Data da Baixa:</span>
                        <input
                          type="date"
                          value={inst.paidAt ? inst.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                          onChange={(e) => updateInstallmentField(idx, 'paidAt', e.target.value)}
                          className="px-2 py-0.5 rounded bg-secondary text-foreground text-xs border border-border"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Observações Internas (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Combinado retirada pessoalmente em evento..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          )}

          {/* STEP 4: SUCESSO & WHATSAPP */}
          {step === 4 && resultData && (
            <div className="space-y-6 py-2 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-in zoom-in duration-300">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-foreground">
                  Pré-Venda Cadastrada com Sucesso!
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Código da Pré-Venda: <strong className="text-foreground">{resultData.preOrder.preOrderNumber}</strong>
                </p>
              </div>

              {/* Status do Colecionador */}
              <div className="p-4 rounded-xl bg-secondary/40 border border-border text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <strong className="text-foreground">{resultData.collector.name} ({resultData.collector.email})</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status da Conta:</span>
                  {resultData.collector.isNewUser ? (
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">
                      Novo Colecionador Cadastrado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                      Cliente Já Cadastrado
                    </span>
                  )}
                </div>
                {resultData.collector.isNewUser && resultData.collector.temporaryPassword && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Senha Provisória Gerada:</span>
                    <strong className="text-amber-400 font-mono text-sm">{resultData.collector.temporaryPassword}</strong>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">Total Já Baixado:</span>
                  <strong className="text-emerald-400 font-bold">R$ {parseFloat(resultData.financial.paidAmount).toFixed(2)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Saldo Restante a Receber:</span>
                  <strong className="text-foreground font-bold">R$ {parseFloat(resultData.financial.remainingAmount).toFixed(2)}</strong>
                </div>
              </div>

              {/* WhatsApp Action */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-left space-y-3">
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" /> Notificar Cliente no WhatsApp
                </p>
                <p className="text-xs text-muted-foreground">
                  Envie os detalhes da pré-venda e as credenciais de acesso diretamente para o colecionador com 1 clique:
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  {resultData.whatsappShareUrl ? (
                    <a
                      href={resultData.whatsappShareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Abrir Conversa no WhatsApp</span>
                    </a>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      WhatsApp não informado para este cliente.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resultData.whatsappMessage);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 3000);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copiar Mensagem</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 bg-secondary/30 flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setStep((s) => (s - 1) as any);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                type="button"
                onClick={handleNextStep1}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <span>Avançar para Miniatura</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleNextStep2}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <span>Configurar Parcelas</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Concluir Cadastro</span>
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
