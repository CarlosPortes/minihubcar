'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  LayoutDashboard,
  Search,
  Layers,
  MapPin,
  Heart,
  ListTodo,
  TrendingUp,
  Inbox,
  ShieldAlert,
  ShoppingBag,
  Store,
  PackageCheck,
  UserCircle,
  Warehouse,
  BarChart3,
  HeartHandshake,
  Users,
  Camera,
  UploadCloud,
  Crown,
  Shapes,
  BookOpen,
  LogOut,
  Car,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/auth-context';
import { useTranslation } from '@/i18n';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { LanguageSelector } from '@/components/ui/LanguageSelector';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const isAdmin = Boolean(
    user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN')
  );

  // Fecha o drawer ao mudar de rota
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Fecha com a tecla ESC e previne rolagem do body quando aberto
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.profile'), href: '/profile', icon: UserCircle },
    { name: t('nav.catalog'), href: '/catalog', icon: Search },
    { name: t('nav.marketplace'), href: '/marketplace', icon: ShoppingBag },
    { name: t('nav.collection'), href: '/collection', icon: Layers },
    { name: t('nav.collectibles'), href: '/collectibles', icon: Shapes },
    { name: t('nav.community'), href: '/community', icon: Users },
    { name: t('nav.locations'), href: '/locations', icon: MapPin },
    { name: t('nav.wishlist'), href: '/wishlist', icon: Heart },
    { name: t('nav.myLists'), href: '/lists', icon: ListTodo },
    { name: t('nav.acquisitions'), href: '/acquisitions', icon: TrendingUp },
    { name: t('nav.requests'), href: '/catalog-requests', icon: Inbox },
    { name: t('nav.stats'), href: '/stats', icon: BarChart3 },
  ];

  const commercialNav = [
    { name: t('nav.garage'), href: '/garage', icon: Warehouse },
    { name: t('common.cart'), href: '/cart', icon: ShoppingBag },
    { name: t('nav.orders'), href: '/orders', icon: PackageCheck },
    { name: t('nav.sellerArea'), href: '/seller', icon: Store },
    { name: 'Guias e Manuais', href: '/guias', icon: BookOpen },
    { name: t('nav.plans'), href: '/plans', icon: Crown },
    { name: t('nav.donate'), href: '/donate', icon: HeartHandshake },
    { name: t('nav.dataImport'), href: '/import', icon: UploadCloud },
  ];

  const adminNav = [
    { name: t('catalog.title'), href: '/admin/catalog', icon: Layers },
    { name: t('nav.requests'), href: '/catalog-requests/pending', icon: Inbox },
    { name: t('nav.usersManage'), href: '/admin/users', icon: Users },
    { name: t('nav.adminSubscriptions'), href: '/admin/subscriptions', icon: Crown, isSpecial: true },
    { name: t('nav.sellerArea'), href: '/admin/sellers', icon: Store },
    { name: t('nav.moderation'), href: '/admin/moderation', icon: Camera },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <aside
        className={`absolute top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-card border-r border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-out z-10 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/80">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-wider text-foreground">
                MINI<span className="text-primary">HUB</span> CAR
              </span>
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground -mt-0.5 font-semibold">
                Collector Platform
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Card (quando autenticado) */}
        {isAuthenticated && user && (
          <div className="p-3 border-b border-border/70 bg-secondary/30">
            <div className="flex items-center justify-between">
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-2.5 flex-1 min-w-0 group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary border border-border overflow-hidden text-xs font-bold text-foreground group-hover:border-primary shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-foreground truncate group-hover:text-primary">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                </div>
              </Link>

              {isAdmin && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <ShieldAlert className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* SEÇÃO ADMINISTRATIVA (Exibida em destaque no topo para Administradores) */}
          {isAdmin && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> {t('nav.adminSection')}
              </p>
              <div className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-black shadow-md'
                          : 'text-amber-200/80 hover:text-amber-100 hover:bg-amber-500/20'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Menu Principal */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {t('nav.mainMenu')}
            </p>
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Área Comercial / Negócios */}
          <div className="space-y-1 pt-2 border-t border-border/50">
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
              <Store className="h-3 w-3" /> {t('nav.businessSection')}
            </p>
            {commercialNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-border bg-card/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <LanguageSelector />
            <ThemeSelector />
          </div>

          {isAuthenticated ? (
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('common.logout')}</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-muted border border-border text-center"
              >
                {t('common.login')}
              </Link>
              <Link
                href="/register"
                onClick={onClose}
                className="flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover shadow-glow text-center"
              >
                Cadastrar
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/30">
            <span className="font-semibold text-foreground">v1.0 Oficial</span>
            <div className="flex items-center gap-2">
              <Link href="/about" onClick={onClose} className="hover:text-primary transition-colors">
                Sobre
              </Link>
              <span>•</span>
              <Link href="/terms" onClick={onClose} className="hover:text-primary transition-colors">
                Termos
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
