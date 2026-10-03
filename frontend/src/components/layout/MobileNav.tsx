'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Search, Layers, MapPin, Heart } from 'lucide-react';
import { useTranslation } from '@/i18n';

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const nav = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.catalog'), href: '/catalog', icon: Search },
    { name: t('nav.collection'), href: '/collection', icon: Layers },
    { name: t('nav.locations'), href: '/locations', icon: MapPin },
    { name: t('nav.wishlist'), href: '/wishlist', icon: Heart },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex h-16 border-t border-border bg-card/95 backdrop-blur-md px-2 justify-around items-center">
      {nav.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-lg transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium mt-1">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
