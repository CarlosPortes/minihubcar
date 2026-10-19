'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analyticsApi } from '@/lib/api/analytics';

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'mhc_visitor_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'v_temp_' + Date.now();
  }
}

export function SiteAnalyticsTracker() {
  const pathname = usePathname();
  const lastRecordedRef = useRef<{ path: string; time: number } | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // Não registrar assets, favicon ou arquivos estáticos
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/catalog-media') ||
      pathname.startsWith('/uploads') ||
      pathname.includes('.')
    ) {
      return;
    }

    const now = Date.now();
    // Evita registrar a mesma rota em menos de 2 segundos (ex: renderizações duplicadas de React Strict Mode)
    if (
      lastRecordedRef.current &&
      lastRecordedRef.current.path === pathname &&
      now - lastRecordedRef.current.time < 2000
    ) {
      return;
    }

    lastRecordedRef.current = { path: pathname, time: now };

    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;

    // Fire and forget
    analyticsApi.recordVisit({
      path: pathname,
      visitorId,
      referer: typeof document !== 'undefined' ? document.referrer : undefined,
    }).catch(() => {
      // Ignora erro silenciosamente
    });
  }, [pathname]);

  return null;
}
