'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Search, Layers, Heart, Menu, Shield } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useAuth } from '@/features/auth/context/auth-context';

interface MobileNavProps {
  onOpenMenu?: () => void;
  isMenuOpen?: boolean;
}

export function MobileNav({ onOpenMenu, isMenuOpen }: MobileNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuth();

  const isAdmin = Boolean(
    user?.roles?.includes('CATALOG_ADMIN') || user?.roles?.includes('SYSTEM_ADMIN')
  );

  const nav = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.catalog'), href: '/catalog', icon: Search },
    { name: t('nav.collection'), href: '/collection', icon: Layers },
    { name: t('nav.wishlist'), href: '/wishlist', icon: Heart },
  ];

  // Identifica se a rota atual é de administração ou comercial/secundária (que fica no menu)
  const isMenuSectionActive =
    isMenuOpen ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/catalog-requests') ||
    pathname.startsWith('/seller') ||
    pathname.startsWith('/garage') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/guias') ||
    pathname.startsWith('/import') ||
    pathname.startsWith('/plans') ||
    pathname.startsWith('/stats') ||
    pathname.startsWith('/profile');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex h-16 border-t border-border bg-card/95 backdrop-blur-md px-2 justify-around items-center">
      {nav.map((item) => {
        const Icon = item.icon;
        const isActive = !isMenuOpen && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1 truncate">{item.name}</span>
          </Link>
        );
      })}

      {/* Botão de Menu Completo / Admin Drawer */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu completo e administração"
        className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition-colors relative ${
          isMenuSectionActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="relative">
          <Menu className="h-5 w-5" />
          {isAdmin && (
            <span className="absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-black">
              ★
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium mt-1 flex items-center gap-0.5">
          {isAdmin ? 'Admin' : 'Menu'}
        </span>
      </button>
    </nav>
  );
}
