'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { resetPasswordWithToken } from '@/lib/api/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Token de recuperação não encontrado ou inválido. Solicite um novo link.');
      return;
    }

    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      await resetPasswordWithToken(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Falha ao redefinir senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token && !success) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive space-y-2">
          <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
          <h3 className="text-sm font-bold">Link Inválido ou Inexistente</h3>
          <p className="text-xs opacity-90 leading-relaxed">
            Não encontramos o token de recuperação necessário para redefinir a sua senha.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 text-xs shadow-glow hover:bg-primary-hover transition-colors"
        >
          Solicitar novo link de recuperação
        </Link>
      </div>
    );
  }

  return (
    <>
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
            <h3 className="text-sm font-bold">Senha Alterada com Sucesso!</h3>
            <p className="text-xs text-emerald-300/90 leading-relaxed">
              Sua senha foi redefinida com segurança. Você já pode fazer login na plataforma com suas novas credenciais.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover font-semibold flex items-center justify-center gap-2 text-xs shadow-glow transition-all"
            >
              Ir para o Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="w-full h-10 pl-9 pr-10 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Confirmar Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs"
          >
            {loading ? 'Redefinindo...' : 'Atualizar Senha'}
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </Link>
          </div>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-card">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Redefinir Senha</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Crie uma nova senha segura para retomar o acesso à sua garagem MiniHub Car.
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-6 text-xs text-muted-foreground">Carregando formulário...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
