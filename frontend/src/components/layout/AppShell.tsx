'use client';

import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { MobileDrawer } from './MobileDrawer';
import { Footer } from './Footer';
import { NewMessagesPopup } from '@/features/community/NewMessagesPopup';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col justify-between p-4 md:p-6 pb-20 lg:pb-6">
          <div className="mx-auto max-w-7xl w-full flex-1">{children}</div>
          <Footer />
        </main>
      </div>
      <MobileNav
        onOpenMenu={() => setMobileMenuOpen((prev) => !prev)}
        isMenuOpen={mobileMenuOpen}
      />
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <NewMessagesPopup />
    </div>
  );
}
