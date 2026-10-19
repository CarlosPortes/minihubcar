'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  X,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { paymentsApi, PixChargeResponse } from '@/lib/api/payments';

interface PixPaymentModalProps {
  charge: PixChargeResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (charge: PixChargeResponse) => void;
  title?: string;
}

export function PixPaymentModal({
  charge,
  isOpen,
  onClose,
  onSuccess,
  title = 'Pagamento via PIX Instantâneo',
}: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentCharge, setCurrentCharge] = useState<PixChargeResponse | null>(charge);
  const [isPaid, setIsPaid] = useState(charge?.status === 'PAID');

  useEffect(() => {
    setCurrentCharge(charge);
    setIsPaid(charge?.status === 'PAID');
  }, [charge]);

  // Polling automático a cada 3.5 segundos enquanto estiver PENDING
  useEffect(() => {
    if (!isOpen || !currentCharge || isPaid) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await paymentsApi.getPixCharge(currentCharge.chargeId);
        setCurrentCharge(fresh);
        if (fresh.status === 'PAID') {
          setIsPaid(true);
          clearInterval(interval);
          setTimeout(() => {
            onSuccess(fresh);
          }, 1800);
        }
      } catch (err) {
        // Silently tolerate temporary polling errors
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, currentCharge, isPaid, onSuccess]);

  if (!isOpen || !currentCharge) return null;

  const handleCopy = () => {
    if (navigator?.clipboard && currentCharge.pixCopiaECola) {
      navigator.clipboard.writeText(currentCharge.pixCopiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleManualVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await paymentsApi.verifyPixPayment(currentCharge.chargeId);
      if (res.status === 'PAID') {
        setIsPaid(true);
        setTimeout(() => {
          onSuccess(currentCharge);
        }, 1500);
      }
    } catch (err) {
      console.warn('Falha na verificação manual:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-tight">{title}</h3>
              <p className="text-xs text-muted-foreground">Aprovação imediata via Banco Central</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isPaid ? (
          /* Success Screen */
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-300">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-glow">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-foreground">Pagamento Confirmado!</h4>
              <p className="text-xs text-muted-foreground max-w-xs">
                Seu pagamento de <strong>R$ {currentCharge.amount.toFixed(2).replace('.', ',')}</strong> foi reconhecido com sucesso.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                <ShieldCheck className="h-4 w-4" /> Benefício ativado instantaneamente
              </span>
            </div>
          </div>
        ) : (
          /* Payment Flow */
          <>
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-secondary/50 border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Valor Total a Pagar</span>
                <div className="text-2xl font-black text-emerald-500">
                  R$ {currentCharge.amount.toFixed(2).replace('.', ',')}
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold animate-pulse">
                <Clock className="h-3.5 w-3.5" /> Aguardando PIX
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-zinc-200 shadow-inner">
              {currentCharge.qrCodeUrl ? (
                <img
                  src={currentCharge.qrCodeUrl}
                  alt="QR Code PIX Oficial"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-zinc-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              <span className="text-[10px] text-zinc-600 font-bold mt-2">
                Aponte a câmera do aplicativo do seu banco
              </span>
            </div>

            {/* Copia e Cola */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Código PIX Copia-e-Cola:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentCharge.pixCopiaECola}
                  className="flex-1 px-3 py-2 text-xs bg-secondary/70 border border-border rounded-xl text-muted-foreground font-mono select-all truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={isVerifying}
                className="w-full py-2.5 px-4 rounded-xl bg-secondary text-foreground border border-border font-bold text-xs hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Verificando compensação...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Já realizei o pagamento
                  </>
                )}
              </button>
            </div>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Ambiente seguro. Reconhecimento instantâneo via BACEN.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
