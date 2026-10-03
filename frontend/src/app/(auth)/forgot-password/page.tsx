'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api/auth';
import { useTranslation } from '@/i18n';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Falha ao solicitar recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-card">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t('auth.forgotTitle')}</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {t('auth.forgotSubtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4 py-2 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-2 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400" />
              <h3 className="text-sm font-bold">{t('auth.requestSentTitle')}</h3>
              <p className="text-xs text-emerald-300/90 leading-relaxed">
                {t('auth.requestSentDesc', { email })}
              </p>
              <p className="text-[11px] text-muted-foreground pt-1">
                {t('auth.checkSpamNote')}
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full h-10 rounded-lg bg-secondary text-foreground hover:bg-muted font-semibold flex items-center justify-center gap-2 text-xs border border-border transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('auth.backToLogin')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">{t('auth.forgotEmailLabel')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs"
            >
              {loading ? (
                <span>{t('auth.sendingLink')}</span>
              ) : (
                <>
                  <span>{t('auth.sendResetLink')}</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            <div className="pt-3 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('auth.rememberPasswordLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
