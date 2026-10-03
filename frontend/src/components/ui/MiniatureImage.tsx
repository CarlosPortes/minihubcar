'use client';

import React, { useState } from 'react';
import { Car } from 'lucide-react';
import { getMediaUrl } from '@/lib/utils/media';

interface MiniatureImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  fit?: 'contain' | 'cover';
}

export function MiniatureImage({
  src,
  alt = 'Miniatura',
  fit = 'contain',
  className,
  containerClassName = 'relative aspect-square w-full bg-gradient-to-b from-secondary/40 to-secondary/15 flex items-center justify-center p-2.5 overflow-hidden',
}: MiniatureImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const resolvedUrl = getMediaUrl(src);

  if (!resolvedUrl || hasError) {
    return (
      <div className={containerClassName}>
        <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground/40">
          <Car className="h-10 w-10 stroke-[1.5]" />
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Sem foto</span>
        </div>
      </div>
    );
  }

  const defaultImgClass = fit === 'cover'
    ? 'h-full w-full object-cover group-hover:scale-105 transition-transform duration-300'
    : 'h-full w-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300';

  const imgClass = className || defaultImgClass;

  return (
    <div className={containerClassName}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted/40 animate-pulse flex items-center justify-center">
          <Car className="h-8 w-8 text-muted-foreground/20 animate-bounce" />
        </div>
      )}
      <img
        src={resolvedUrl}
        alt={alt}
        className={`${imgClass} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      />
    </div>
  );
}
