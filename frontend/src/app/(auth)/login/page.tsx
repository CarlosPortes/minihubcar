'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context/auth-context';
import { useTranslation } from '@/i18n';
import { Car, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-card">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3">
            <Car className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">{t('auth.loginTitle')}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-foreground">{t('auth.password')}</label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                {t('auth.forgotPasswordLink')}
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('auth.enterButton')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center font-medium mb-2">
            Acesso Rápido de Demonstração:
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('colecionador@minihubcar.com.br')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-secondary text-[11px] font-medium text-foreground hover:bg-muted border border-border text-center transition-colors"
            >
              👤 {t('common.collector')}
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@minihubcar.com.br')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-secondary text-[11px] font-medium text-foreground hover:bg-muted border border-border text-center transition-colors"
            >
              🛡️ {t('common.admin')}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('auth.dontHaveAccount')}{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            {t('auth.registerNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
