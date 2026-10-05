'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/context/auth-context';
import { Search, User as UserIcon, LogOut, Car, Shield, ShoppingBag, MessageSquare, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { communityApi, DirectConversationItem } from '@/lib/api/community';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useTranslation } from '@/i18n';

interface NavbarProps {
  onSearchFocus?: () => void;
  onOpenMobileMenu?: () => void;
}

export function Navbar({ onSearchFocus, onOpenMobileMenu }: NavbarProps) {
  const { user, logout, isAuthenticated, claimAdmin } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN');

  // Consulta conversas com mensagens não lidas
  const { data: convsRes } = useQuery({
    queryKey: ['community-conversations-unread-popup'],
    queryFn: () => communityApi.listConversations(),
    enabled: Boolean(isAuthenticated && user),
    refetchInterval: 30000,
  });

  const unreadMessagesCount = (convsRes?.data || [])
    .filter((c: DirectConversationItem) => c.unreadCount > 0)
    .reduce((sum: number, c: DirectConversationItem) => sum + c.unreadCount, 0);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Botão de Menu Hambúrguer para Mobile / PWA */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu de navegação"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors relative"
        >
          <Menu className="h-5 w-5" />
          {isAdmin && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
          )}
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 group-hover:scale-105 transition-transform">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-wider text-foreground">
              MINI<span className="text-primary">HUB</span> CAR
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-1 font-semibold">
              Collector Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Global Quick Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('common.searchPlaceholder')}
            onFocus={onSearchFocus}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-2">
        <LanguageSelector />
        <ThemeSelector />

        {isAuthenticated && (
          <Link
            href="/community?tab=messages"
            title="Chat da Comunidade"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-primary/20 hover:text-primary border border-border transition-colors relative"
          >
            <MessageSquare className="h-4 w-4" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground shadow-sm animate-pulse">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </Link>
        )}

        {isAuthenticated && (
          <Link
            href="/cart"
            title={t('common.cart')}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-primary/20 hover:text-primary border border-border transition-colors relative"
          >
            <ShoppingBag className="h-4 w-4" />
          </Link>
        )}

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              title={t('common.profile')}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-secondary/70 transition-colors group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary border border-border overflow-hidden text-xs font-bold text-foreground group-hover:border-primary transition-colors">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                  {user.name}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {isAdmin ? (
                    <>
                      <Shield className="h-2.5 w-2.5 text-primary" /> Admin
                    </>
                  ) : (
                    <span>{t('common.collector')}</span>
                  )}
                </span>
              </div>
            </Link>

            <button
              onClick={() => logout()}
              title={t('common.logout')}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-secondary text-foreground hover:bg-muted border border-border transition-colors"
            >
              {t('common.login')}
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow transition-all"
            >
              Cadastrar
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
