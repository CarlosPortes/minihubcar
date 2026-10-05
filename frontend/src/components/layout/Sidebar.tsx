'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/auth-context';
import { useTranslation } from '@/i18n';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslation();

  const isAdmin = Boolean(
    user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN')
  );

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
    { name: t('nav.adminSubscriptions'), href: '/admin/subscriptions', icon: Crown },
    { name: t('nav.sellerArea'), href: '/admin/sellers', icon: Store },
    { name: t('nav.moderation'), href: '/admin/moderation', icon: Camera },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/60 p-4 shrink-0 overflow-y-auto">
      <div className="space-y-1">
        {/* Bloco Administrativo em Destaque no topo para Administradores */}
        {isAdmin && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2 space-y-1">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> {t('nav.adminSection')}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                ADMIN
              </span>
            </div>
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-black font-semibold shadow-sm'
                      : 'text-amber-200/80 hover:text-amber-100 hover:bg-amber-500/20'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}

        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          {t('nav.mainMenu')}
        </p>

        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
              {item.name}
            </Link>
          );
        })}

        <div className="pt-4 space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
            <Store className="h-3 w-3" /> {t('nav.businessSection')}
          </p>
          {commercialNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-border/60">
        <div className="rounded-lg bg-secondary/50 p-3 border border-border/40 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">MiniHub Car</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium border border-primary/20">v1.0 Oficial</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
            <Link href="/about" className="hover:text-primary transition-colors">
              Sobre & Roadmap
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Termos
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
