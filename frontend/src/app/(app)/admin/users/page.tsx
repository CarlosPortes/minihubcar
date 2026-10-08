'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usersApi,
  AdminUserItem,
  AdminListUsersParams,
  AdminUserStats,
} from '@/lib/api/users';
import { communityApi } from '@/lib/api/community';
import { useAuth } from '@/features/auth/context/auth-context';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  UserCheck,
  UserX,
  Store,
  KeyRound,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sellerFilter, setSellerFilter] = useState<'ALL' | 'HOMOLOGATED' | 'PENDING' | 'NON_SELLER'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SYSTEM_ADMIN' | 'CATALOG_ADMIN' | 'COLLECTOR'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals state
  const [statusModalUser, setStatusModalUser] = useState<AdminUserItem | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUserItem | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [useAutoPassword, setUseAutoPassword] = useState(true);
  const [generatedPasswordResult, setGeneratedPasswordResult] = useState<{
    user: AdminUserItem;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Roles modal state
  const [rolesModalUser, setRolesModalUser] = useState<AdminUserItem | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSendingWelcome, setIsSendingWelcome] = useState(false);

  const handleSendRetroactiveWelcome = async () => {
    if (!window.confirm('Deseja disparar a mensagem de boas-vindas do Carlos Portes para todos os novos usuários cadastrados que ainda não a receberam?')) {
      return;
    }
    setIsSendingWelcome(true);
    try {
      const res = await communityApi.sendRetroactiveWelcome();
      alert(`✅ Mensagens de boas-vindas processadas com sucesso!\n\n• Enviadas agora: ${res.data.sentCount}\n• Já possuíam conversa: ${res.data.skippedCount}\n• Total de membros avaliados: ${res.data.totalUsers}`);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagens de boas-vindas.');
    } finally {
      setIsSendingWelcome(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: async () => {
      const res = await usersApi.adminGetStats();
      return res.data;
    },
  });

  // Fetch Users List
  const queryParams: AdminListUsersParams = {
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter,
    sellerStatus: sellerFilter,
    role: roleFilter,
  };

  const { data: listData, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users-list', queryParams],
    queryFn: async () => {
      const res = await usersApi.adminListUsers(queryParams);
      return res.data;
    },
  });

  // Mutation: Update User Status (ACTIVE <-> INACTIVE)
  const statusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: 'ACTIVE' | 'INACTIVE' }) => {
      return usersApi.adminUpdateStatus(userId, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
      setStatusModalUser(null);
    },
  });

  // Mutation: Reset User Password
  const passwordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword?: string }) => {
      return usersApi.adminResetPassword(userId, newPassword);
    },
    onSuccess: (res, vars) => {
      if (passwordModalUser) {
        setGeneratedPasswordResult({
          user: passwordModalUser,
          password: res.data.temporaryPassword,
        });
      }
      setPasswordModalUser(null);
      setCustomPassword('');
      setUseAutoPassword(true);
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });

  // Mutation: Update User Roles
  const rolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      return usersApi.adminUpdateRoles(userId, roles);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setRolesModalUser(null);
    },
  });

  const users = listData?.users || [];
  const totalUsers = listData?.total || 0;
  const totalPages = listData?.totalPages || 1;
  const stats: AdminUserStats = statsData || {
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    homologatedSellers: 0,
  };

  const handleCopyPassword = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleRoleSelection = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500 border border-amber-500/20 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Painel de Governança
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Gestão de Usuários & Vendedores
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Consulte membros cadastrados, audite credenciamentos comerciais, bloqueie ou ative acessos e redefina senhas com segurança.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSendRetroactiveWelcome}
            disabled={isSendingWelcome}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm disabled:opacity-50"
            title="Dispara a mensagem de onboarding do Carlos para todos os membros que ainda não a receberam"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {isSendingWelcome ? 'Enviando Mensagens...' : 'Disparar Boas-Vindas aos Novos Membros'}
          </button>
          <Link
            href="/admin/sellers"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-secondary/70 transition-all shadow-sm"
          >
            <Store className="h-3.5 w-3.5 text-amber-500" /> Moderação de Vendedores
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Total Geral</p>
            <h3 className="text-2xl font-black text-foreground mt-0.5">{stats.totalUsers}</h3>
            <p className="text-[10px] text-muted-foreground">Colecionadores cadastrados</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase text-emerald-500 tracking-wider">Contas Ativas</p>
            <h3 className="text-2xl font-black text-emerald-500 mt-0.5">{stats.activeUsers}</h3>
            <p className="text-[10px] text-muted-foreground">Com acesso liberado</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase text-destructive tracking-wider">Bloqueados / Inativos</p>
            <h3 className="text-2xl font-black text-destructive mt-0.5">{stats.inactiveUsers}</h3>
            <p className="text-[10px] text-muted-foreground">Sem permissão de login</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <UserX className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase text-amber-500 tracking-wider">Vendedores Homologados</p>
            <h3 className="text-2xl font-black text-amber-500 mt-0.5">{stats.homologatedSellers}</h3>
            <p className="text-[10px] text-muted-foreground">Autorizados para vendas</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Store className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/40 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users-list'] })}
            title="Recarregar dados"
            className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>

        {/* Filter Badges & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filtros:
          </span>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg bg-secondary/40 p-0.5 border border-border/60">
            {(
              [
                { label: 'Todos os Status', value: 'ALL' },
                { label: 'Ativos', value: 'ACTIVE' },
                { label: 'Inativos', value: 'INACTIVE' },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setStatusFilter(item.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  statusFilter === item.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Seller Filter */}
          <div className="flex items-center rounded-lg bg-secondary/40 p-0.5 border border-border/60">
            {(
              [
                { label: 'Todos', value: 'ALL' },
                { label: 'Vendedores Homologados', value: 'HOMOLOGATED' },
                { label: 'Em Análise', value: 'PENDING' },
                { label: 'Colecionadores', value: 'NON_SELLER' },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setSellerFilter(item.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  sellerFilter === item.value
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e: any) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 rounded-lg bg-secondary/40 border border-border/60 text-[11px] font-semibold text-foreground focus:outline-none"
          >
            <option value="ALL">Todas as Funções</option>
            <option value="SYSTEM_ADMIN">Apenas Administradores do Sistema</option>
            <option value="CATALOG_ADMIN">Apenas Administradores do Catálogo</option>
            <option value="COLLECTOR">Apenas Colecionadores Padrão</option>
          </select>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="h-7 w-7 text-primary animate-spin mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground">Carregando usuários do sistema...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold text-foreground">Nenhum usuário encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tente alterar os termos da busca ou ajustar os filtros de status e vendedor selecionados acima.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/80 bg-secondary/30 text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Status da Conta</th>
                  <th className="py-3 px-4">Credenciamento Comercial</th>
                  <th className="py-3 px-4">Cargos / Funções</th>
                  <th className="py-3 px-4">Cadastro</th>
                  <th className="py-3 px-4 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {users.map((u) => {
                  const isCurrentLoggedAdmin = currentUser?.id === u.id;
                  const isHomologated = u.seller.isHomologated;
                  const isPendingSeller = u.seller.isSeller && u.seller.authorizationStatus === 'PENDING';
                  const initials = u.name
                    ? u.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'U';

                  return (
                    <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.name}
                              className="h-9 w-9 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary text-xs">
                              {initials}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-foreground text-sm leading-tight">{u.name}</p>
                              {isCurrentLoggedAdmin && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold border border-primary/30">
                                  Você
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
                              {[u.city, u.state].filter(Boolean).join(', ') || 'Localidade não informada'}
                              {u.whatsapp && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`https://wa.me/55${u.whatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-emerald-500 hover:underline"
                                    title="Chamar no WhatsApp"
                                  >
                                    <MessageCircle className="h-2.5 w-2.5" />
                                    {u.whatsapp}
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Account Status (ACTIVE vs INACTIVE) */}
                      <td className="py-3.5 px-4">
                        {u.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive border border-destructive/20">
                            <XCircle className="h-3 w-3" />
                            Bloqueado / Inativo
                          </span>
                        )}
                      </td>

                      {/* Commercial Seller Status */}
                      <td className="py-3.5 px-4">
                        {isHomologated ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500 border border-emerald-500/20">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Vendedor Homologado
                            </span>
                            {u.seller.slug && (
                              <Link
                                href={`/sellers/${u.seller.slug}`}
                                target="_blank"
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors font-mono"
                              >
                                <span>{u.seller.storeName || u.seller.slug}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            )}
                          </div>
                        ) : isPendingSeller ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-500 border border-amber-500/20">
                              <Clock className="h-3.5 w-3.5" />
                              Solicitação Pendente
                            </span>
                            <Link
                              href="/admin/sellers"
                              className="block text-[10px] text-amber-500 hover:underline font-semibold"
                            >
                              Moderar Credenciamento →
                            </Link>
                          </div>
                        ) : u.seller.authorizationStatus === 'SUSPENDED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive border border-destructive/20">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Vendedor Suspenso
                          </span>
                        ) : u.seller.authorizationStatus === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground border border-border">
                            <XCircle className="h-3.5 w-3.5" />
                            Solicitação Rejeitada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border/50">
                            Colecionador (Sem Loja)
                          </span>
                        )}
                      </td>

                      {/* Roles */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.includes('SYSTEM_ADMIN') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              <Shield className="h-2.5 w-2.5" /> Admin Sistema
                            </span>
                          )}
                          {u.roles.includes('CATALOG_ADMIN') && !u.roles.includes('SYSTEM_ADMIN') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              <Shield className="h-2.5 w-2.5" /> Admin Catálogo
                            </span>
                          )}
                          {u.roles.length === 0 ||
                            (u.roles.length === 1 && u.roles[0] === 'COLLECTOR' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground">
                                Colecionador
                              </span>
                            ))}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Reset Password Button */}
                          <button
                            onClick={() => {
                              setPasswordModalUser(u);
                              setCustomPassword('');
                              setUseAutoPassword(true);
                            }}
                            title="Redefinir Senha do Usuário"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/80 text-foreground hover:bg-primary/20 hover:text-primary hover:border-primary/40 border border-border text-[11px] font-semibold transition-all"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Resetar Senha</span>
                          </button>

                          {/* Toggle Active / Inactive Status */}
                          <button
                            onClick={() => setStatusModalUser(u)}
                            disabled={isCurrentLoggedAdmin && u.status === 'ACTIVE'}
                            title={
                              isCurrentLoggedAdmin && u.status === 'ACTIVE'
                                ? 'Você não pode inativar sua própria conta'
                                : u.status === 'ACTIVE'
                                ? 'Bloquear / Inativar Usuário'
                                : 'Desbloquear / Ativar Usuário'
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                              u.status === 'ACTIVE'
                                ? 'bg-secondary/60 text-destructive border-destructive/20 hover:bg-destructive/15'
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                            } ${isCurrentLoggedAdmin && u.status === 'ACTIVE' ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            {u.status === 'ACTIVE' ? (
                              <>
                                <UserX className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Bloquear</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Ativar</span>
                              </>
                            )}
                          </button>

                          {/* Roles Management */}
                          <button
                            onClick={() => {
                              setRolesModalUser(u);
                              setSelectedRoles([...u.roles]);
                            }}
                            title="Gerenciar Cargos e Permissões"
                            className="p-1.5 rounded-lg bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-all"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalUsers > 0 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-secondary/10">
            <p>
              Mostrando <span className="font-bold text-foreground">{users.length}</span> de{' '}
              <span className="font-bold text-foreground">{totalUsers}</span> usuários cadastrados.
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-3 py-1 font-semibold text-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: STATUS CHANGE (ATIVAR / BLOQUEAR)                                */}
      {/* ========================================================================= */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusModalUser.status === 'ACTIVE' ? (
                  <div className="h-9 w-9 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {statusModalUser.status === 'ACTIVE' ? 'Bloquear Usuário' : 'Reativar Usuário'}
                  </h3>
                  <p className="text-xs text-muted-foreground">{statusModalUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setStatusModalUser(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/80 text-xs space-y-2">
              <p className="text-foreground">
                {statusModalUser.status === 'ACTIVE' ? (
                  <>
                    Tem certeza de que deseja <strong>bloquear e inativar</strong> a conta de{' '}
                    <span className="font-semibold text-foreground">{statusModalUser.name}</span> ({statusModalUser.email})?
                  </>
                ) : (
                  <>
                    Tem certeza de que deseja <strong>desbloquear e reativar</strong> a conta de{' '}
                    <span className="font-semibold text-foreground">{statusModalUser.name}</span> ({statusModalUser.email})?
                  </>
                )}
              </p>
              {statusModalUser.status === 'ACTIVE' ? (
                <p className="text-destructive font-medium text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  O usuário não conseguirá mais realizar login nem efetuar transações até ser reativado.
                </p>
              ) : (
                <p className="text-emerald-500 font-medium text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  O usuário voltará a ter acesso normal com suas credenciais atuais.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    userId: statusModalUser.id,
                    newStatus: statusModalUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  })
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  statusModalUser.status === 'ACTIVE'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {statusMutation.isPending ? 'Salvando...' : statusModalUser.status === 'ACTIVE' ? 'Confirmar Bloqueio' : 'Confirmar Reativação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESET PASSWORD                                                   */}
      {/* ========================================================================= */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Redefinir Senha do Usuário</h3>
                  <p className="text-xs text-muted-foreground">{passwordModalUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Selecione como deseja redefinir a credencial de acesso de{' '}
                <strong className="text-foreground">{passwordModalUser.email}</strong>:
              </p>

              {/* Option: Auto Generate */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="pwdType"
                  checked={useAutoPassword}
                  onChange={() => setUseAutoPassword(true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">Gerar Senha Temporária Forte (Recomendado)</p>
                  <p className="text-[11px] text-muted-foreground">
                    O sistema gera uma senha aleatória segura (ex: MiniHub#8341!a9) que você poderá copiar e enviar ao usuário.
                  </p>
                </div>
              </label>

              {/* Option: Manual Password */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="pwdType"
                  checked={!useAutoPassword}
                  onChange={() => setUseAutoPassword(false)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5 flex-1">
                  <p className="text-xs font-bold text-foreground">Definir Senha Manualmente</p>
                  <p className="text-[11px] text-muted-foreground">Digite você mesmo uma nova senha provisória.</p>
                  {!useAutoPassword && (
                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="Mínimo 6 caracteres..."
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  passwordMutation.isPending || (!useAutoPassword && customPassword.trim().length < 6)
                }
                onClick={() =>
                  passwordMutation.mutate({
                    userId: passwordModalUser.id,
                    newPassword: useAutoPassword ? undefined : customPassword.trim(),
                  })
                }
                className="px-4 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-glow hover:bg-primary/90 transition-all disabled:opacity-40"
              >
                {passwordMutation.isPending ? 'Redefinindo...' : 'Aplicar Nova Senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SUCCESS RESULT OF PASSWORD RESET                                 */}
      {/* ========================================================================= */}
      {generatedPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-emerald-500/30 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Senha Redefinida com Sucesso!</h3>
                <p className="text-xs text-muted-foreground">{generatedPasswordResult.user.name}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              A nova senha foi gravada com segurança no banco de dados. Copie-a abaixo e forneça ao usuário:
            </p>

            {/* Display Password with Copy Button */}
            <div className="p-3.5 rounded-xl bg-secondary/80 border border-border flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Nova Senha Provisória:</span>
                <p className="font-mono text-base font-bold text-foreground select-all">
                  {generatedPasswordResult.password}
                </p>
              </div>
              <button
                onClick={() => handleCopyPassword(generatedPasswordResult.password)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm transition-all"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </>
                )}
              </button>
            </div>

            {/* WhatsApp Share Button if user has phone */}
            {generatedPasswordResult.user.whatsapp && (
              <a
                href={`https://wa.me/55${generatedPasswordResult.user.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Olá ${generatedPasswordResult.user.name}! Sua nova senha provisória de acesso ao MiniHub Car é: ${generatedPasswordResult.password}\n\nVocê pode alterá-la no seu painel de perfil após o login.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                <MessageCircle className="h-4 w-4" /> Enviar Nova Senha via WhatsApp
              </a>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setGeneratedPasswordResult(null)}
                className="px-5 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ROLES MANAGEMENT                                                 */}
      {/* ========================================================================= */}
      {rolesModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Gerenciar Cargos & Permissões</h3>
                  <p className="text-xs text-muted-foreground">{rolesModalUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setRolesModalUser(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground">
                Atribua ou remova funções operacionais e administrativas deste usuário:
              </p>

              {[
                {
                  code: 'COLLECTOR',
                  title: 'Colecionador Padrão',
                  desc: 'Acesso às garagens, lista de desejos, aquisições e compras no Marketplace.',
                },
                {
                  code: 'CATALOG_ADMIN',
                  title: 'Administrador de Catálogo',
                  desc: 'Permissão para criar e atualizar modelos, marcas, séries e revisar solicitações.',
                },
                {
                  code: 'SYSTEM_ADMIN',
                  title: 'Administrador Geral do Sistema',
                  desc: 'Acesso total aos painéis de governança, moderação de vendedores e gestão de usuários.',
                },
              ].map((roleItem) => {
                const isChecked = selectedRoles.includes(roleItem.code);
                return (
                  <label
                    key={roleItem.code}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'border-primary/50 bg-primary/5 shadow-sm'
                        : 'border-border bg-secondary/20 hover:bg-secondary/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRoleSelection(roleItem.code)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">{roleItem.title}</p>
                      <p className="text-[11px] text-muted-foreground">{roleItem.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRolesModalUser(null)}
                className="px-4 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={rolesMutation.isPending || selectedRoles.length === 0}
                onClick={() =>
                  rolesMutation.mutate({
                    userId: rolesModalUser.id,
                    roles: selectedRoles,
                  })
                }
                className="px-4 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-glow hover:bg-primary/90 transition-all disabled:opacity-40"
              >
                {rolesMutation.isPending ? 'Salvando...' : 'Salvar Funções'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
