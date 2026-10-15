'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, DollarSign, Calendar, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { externalPreOrdersApi, ExternalPreOrderItem, AddExternalPaymentInput } from '@/lib/api/external-pre-orders';

interface AddExternalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preOrder: ExternalPreOrderItem | null;
  onSuccess?: () => void;
}

export function AddExternalPaymentModal({
  isOpen,
  onClose,
  preOrder,
  onSuccess,
}: AddExternalPaymentModalProps) {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Quitação / Saldo na chegada');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default amount to remaining amount
  React.useEffect(() => {
    if (preOrder) {
      const remaining = parseFloat(preOrder.remainingAmount) || 0;
      setAmount(remaining > 0 ? remaining.toFixed(2) : '');
      setDescription(remaining > 0 ? 'Quitação / Saldo na chegada' : 'Pagamento Parcial');
    }
  }, [preOrder]);

  const addPaymentMutation = useMutation({
    mutationFn: (payload: AddExternalPaymentInput) => {
      if (!preOrder) throw new Error('Pré-venda não selecionada');
      return externalPreOrdersApi.addPayment(preOrder.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['external-pre-orders-summary'] });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Erro ao registrar pagamento.');
    },
  });

  if (!isOpen || !preOrder) return null;

  const remaining = parseFloat(preOrder.remainingAmount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const val = parseFloat(amount.replace(',', '.')) || 0;
    if (val <= 0) {
      setErrorMsg('Informe um valor de pagamento válido.');
      return;
    }

    if (val > remaining) {
      setErrorMsg(`O valor (R$ ${val.toFixed(2)}) não pode exceder o saldo pendente (R$ ${remaining.toFixed(2)}).`);
      return;
    }

    addPaymentMutation.mutate({
      amount: val,
      description: description.trim(),
      paymentMethod,
      paidAt,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Registrar Pagamento</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                {preOrder.displayName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        {/* Resumo do Pedido */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-secondary/50 text-xs">
          <div>
            <span className="text-muted-foreground">Total Acordado:</span>
            <div className="font-bold text-foreground">R$ {parseFloat(preOrder.totalAmount).toFixed(2)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Saldo Pendente:</span>
            <div className="font-bold text-amber-500">R$ {remaining.toFixed(2)}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Valor a Registrar (R$) *</label>
            <input
              type="text"
              required
              placeholder="Ex: 50,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl bg-background border border-border focus:border-primary font-bold text-foreground outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Descrição / Identificação *</label>
            <input
              type="text"
              required
              placeholder="Ex: Quitação na chegada, Parcela 2, Sinal extra..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Data do Pagamento</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Meio de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
              >
                <option value="PIX">PIX</option>
                <option value="TRANSFERENCIA">Transferência / TED</option>
                <option value="CARTAO">Cartão de Crédito</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Anotações (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Comprovante enviado no WhatsApp..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={addPaymentMutation.isPending}
              className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addPaymentMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {addPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Confirmar Pagamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
