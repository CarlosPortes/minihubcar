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

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/60 p-4 shrink-0 overflow-y-auto">
      <div className="space-y-1">
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

        {isAdmin && (
          <div className="pt-4 space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3" /> {t('nav.adminSection')}
            </p>
            <Link
              href="/admin/catalog"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin/catalog' || pathname.startsWith('/admin/catalog/')
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <Layers className="h-4 w-4" />
              {t('catalog.title')}
            </Link>
            <Link
              href="/catalog-requests/pending"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/catalog-requests/pending'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <Inbox className="h-4 w-4" />
              {t('nav.requests')}
            </Link>
            <Link
              href="/admin/users"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin/users' || pathname.startsWith('/admin/users/')
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <Users className="h-4 w-4" />
              {t('nav.usersManage')}
            </Link>
            <Link
              href="/admin/subscriptions"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin/subscriptions' || pathname.startsWith('/admin/subscriptions/')
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <Crown className="h-4 w-4 text-amber-500" />
              {t('nav.adminSubscriptions')}
            </Link>
            <Link
              href="/admin/sellers"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin/sellers' || pathname.startsWith('/admin/sellers/')
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <Store className="h-4 w-4" />
              {t('nav.sellerArea')}
            </Link>
            <Link
              href="/admin/moderation"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin/moderation' || pathname.startsWith('/admin/moderation/')
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              }`}
            >
              <Camera className="h-4 w-4" />
              {t('nav.moderation')}
            </Link>
          </div>
        )}
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
