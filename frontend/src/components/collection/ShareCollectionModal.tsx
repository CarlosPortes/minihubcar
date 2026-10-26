'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  QrCode,
  Sparkles,
  Car,
  Layers,
  Crown,
  ExternalLink,
} from 'lucide-react';
import { MiniatureImage } from '@/components/ui/MiniatureImage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  collectorName: string;
  avatarUrl?: string | null;
  totalMiniatures: number;
  totalBrands?: number;
  raresCount?: number;
}

export function ShareCollectionModal({
  isOpen,
  onClose,
  username,
  collectorName,
  avatarUrl,
  totalMiniatures,
  totalBrands = 0,
  raresCount = 0,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'story' | 'qrcode'>('link');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const profileIdentifier = username || 'colecionador';
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/u/${profileIdentifier}`
    : `https://minihubcar.com.br/u/${profileIdentifier}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    publicUrl
  )}&bgcolor=090d16&color=38bdf8&margin=15`;

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `🚗 Fala galera! Confiram minha coleção de miniaturas diecast no MiniHub Car. Já tenho ${totalMiniatures} modelos catalogados na minha garagem virtual!\n\nDá uma olhada no meu perfil: ${publicUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Generate Instagram Story Image (1080x1920)
  const generateStoryImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGeneratingStory(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions for high-res Instagram Story
    canvas.width = 1080;
    canvas.height = 1920;

    // 1. Dark Futuristic Gradient Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGradient.addColorStop(0, '#090d16');
    bgGradient.addColorStop(0.4, '#0f172a');
    bgGradient.addColorStop(0.8, '#0b1120');
    bgGradient.addColorStop(1, '#050811');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative Ambient Neon Glows
    const glowTop = ctx.createRadialGradient(540, 250, 50, 540, 250, 600);
    glowTop.addColorStop(0, 'rgba(14, 165, 233, 0.22)');
    glowTop.addColorStop(1, 'rgba(14, 165, 233, 0)');
    ctx.fillStyle = glowTop;
    ctx.fillRect(0, 0, 1080, 800);

    const glowBottom = ctx.createRadialGradient(540, 1600, 50, 540, 1600, 700);
    glowBottom.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
    glowBottom.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glowBottom;
    ctx.fillRect(0, 1000, 1080, 920);

    // 2. MiniHub Car Brand Header
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Badge Pill Top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    roundRect(ctx, 360, 140, 360, 60, 30);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('⚡ MINIHUB CAR DIECAST', 540, 170);

    // Title / Subtitle
    ctx.font = '900 64px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GARAGEM VIRTUAL', 540, 270);

    ctx.font = '500 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Coleção Oficial de Miniaturas 1:64', 540, 330);

    // 3. Central Collector Showcase Card
    const cardX = 90;
    const cardY = 410;
    const cardW = 900;
    const cardH = 1100;

    // Card background & neon border
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 4;
    roundRect(ctx, cardX, cardY, cardW, cardH, 48);
    ctx.fill();
    ctx.stroke();

    // Collector Avatar circle / placeholder
    const avatarY = cardY + 160;
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, avatarY, 90, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();
    ctx.closePath();

    ctx.font = '900 68px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(collectorName.charAt(0).toUpperCase(), 540, avatarY + 4);
    ctx.restore();

    // Collector Name
    ctx.font = '900 52px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(collectorName, 540, cardY + 310);

    // Username Handle
    ctx.font = '700 32px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`@${profileIdentifier}`, 540, cardY + 365);

    // 4. Stats Grid inside card
    const statBoxY = cardY + 440;
    const statBoxW = 760;
    const statBoxX = (1080 - statBoxW) / 2;

    // Stat 1: Total Miniatures (Big highlight)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    roundRect(ctx, statBoxX, statBoxY, statBoxW, 200, 32);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 86px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(totalMiniatures), 540, statBoxY + 80);

    ctx.font = '700 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('MINIATURAS NA COLEÇÃO', 540, statBoxY + 145);

    // Two Columns below: Fabricantes & Relíquias
    const colY = statBoxY + 230;
    const colW = 365;

    // Left Col: Fabricantes
    roundRect(ctx, statBoxX, colY, colW, 160, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 54px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(String(totalBrands || '8+'), statBoxX + colW / 2, colY + 65);

    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('FABRICANTES / MARCAS', statBoxX + colW / 2, colY + 115);

    // Right Col: Relíquias / STH
    roundRect(ctx, statBoxX + colW + 30, colY, colW, 160, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 54px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(String(raresCount || '★'), statBoxX + colW + 30 + colW / 2, colY + 65);

    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('RELÍQUIAS & SÉRIES', statBoxX + colW + 30 + colW / 2, colY + 115);

    // Verification Badge at bottom of card
    ctx.font = '600 26px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('✓ Acervo Verificado e Organizado na Nuvem', 540, cardY + 920);

    ctx.font = '500 24px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`minihubcar.com.br/u/${profileIdentifier}`, 540, cardY + 975);

    // 5. Call To Action Footer
    ctx.font = '800 36px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Monte a sua garagem virtual gratuita:', 540, 1620);

    // URL Button
    ctx.fillStyle = '#0284c7';
    roundRect(ctx, 220, 1680, 640, 100, 32);
    ctx.fill();

    ctx.font = '900 38px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('minihubcar.com.br', 540, 1730);

    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Hot Wheels • Mini GT • Kaido House • Matchbox • Majorette', 540, 1830);

    // Download triggered
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `minihubcar-colecao-${profileIdentifier}.png`;
    link.href = dataUrl;
    link.click();
    setIsGeneratingStory(false);
  };

  // Helper for rounded rectangles in canvas
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-card border border-border/80 p-6 sm:p-7 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-sm">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground tracking-tight">
                Compartilhar Sua Coleção
              </h2>
              <p className="text-xs text-muted-foreground">
                Divulgue sua garagem no WhatsApp, Instagram e encontros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="grid grid-cols-3 gap-2 bg-secondary/50 p-1 rounded-2xl border border-border/60">
          <button
            onClick={() => setActiveTab('link')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'link'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>WhatsApp / Link</span>
          </button>

          <button
            onClick={() => setActiveTab('story')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'story'
                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Story Instagram</span>
          </button>

          <button
            onClick={() => setActiveTab('qrcode')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'qrcode'
                ? 'bg-card text-foreground border border-border shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>QR Code</span>
          </button>
        </div>

        {/* TAB 1: WHATSAPP & LINK */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            {/* Direct WhatsApp Share Button */}
            <button
              onClick={handleWhatsAppShare}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1 .587 1.77.923 2.806.923 3.18 0 5.767-2.586 5.767-5.766.001-3.182-2.585-5.768-5.767-5.768zm0 10.428c-.887 0-1.591-.247-2.298-.667l-.165-.098-1.571.412.419-1.532-.107-.171c-.482-.767-.736-1.547-.735-2.606.002-2.569 2.09-4.657 4.66-4.657 2.568 0 4.657 2.089 4.657 4.658 0 2.568-2.089 4.657-4.659 4.657zm6.756-11.771c-1.78-1.782-4.148-2.763-6.666-2.763-5.19 0-9.414 4.223-9.416 9.415-.001 1.659.432 3.279 1.254 4.704l-1.331 4.862 4.975-1.305c1.371.748 2.921 1.144 4.516 1.145h.004c5.188 0 9.413-4.224 9.415-9.416.002-2.518-.976-4.887-2.757-6.666z" />
              </svg>
              <span>Enviar Minha Garagem no WhatsApp</span>
            </button>

            {/* Public Link Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block">
                Link do seu Perfil Público
              </label>
              <div className="flex items-center gap-2 p-2 rounded-2xl bg-secondary/60 border border-border">
                <span className="text-xs font-mono font-medium text-foreground truncate px-2 flex-1">
                  {publicUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm'
                  }`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Hint Box */}
            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                💡 Como usar nos grupos:
              </p>
              <p className="leading-relaxed">
                Cole esse link nos grupos de colecionadores ou na Bio do seu Instagram. Qualquer pessoa pode ver suas miniaturas cadastradas e lista de desejos sem precisar fazer download de nada!
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: INSTAGRAM STORY CARD */}
        {activeTab === 'story' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-5 border border-slate-800 text-center space-y-3 overflow-hidden shadow-inner">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold tracking-wider">
                ⚡ CARD EXCLUSIVO DE STORIES
              </div>
              <h3 className="text-sm font-black text-white">
                Mostre sua garagem no Instagram
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Geramos uma imagem oficial em alta resolução (1080x1920) com seu nome, total de {totalMiniatures} miniaturas e identidade do MiniHub Car para você postar nos Stories!
              </p>

              {/* Mini Preview Box */}
              <div className="mx-auto w-36 h-48 rounded-xl bg-slate-950 border-2 border-primary/40 shadow-glow flex flex-col items-center justify-center p-2.5 space-y-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/40">
                  {collectorName.charAt(0).toUpperCase()}
                </div>
                <div className="text-[11px] font-bold text-white truncate max-w-full">
                  {collectorName}
                </div>
                <div className="text-[9px] font-mono text-primary truncate max-w-full">
                  @{profileIdentifier}
                </div>
                <div className="bg-slate-800/80 px-2 py-1 rounded-md text-center w-full">
                  <div className="text-xs font-black text-white">{totalMiniatures}</div>
                  <div className="text-[8px] text-slate-400">Miniaturas</div>
                </div>
              </div>
            </div>

            {/* Hidden Canvas for Generation */}
            <canvas ref={canvasRef} className="hidden" />

            <button
              onClick={generateStoryImage}
              disabled={isGeneratingStory}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-pink-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isGeneratingStory ? 'Gerando Imagem...' : 'Baixar Imagem para o Story'}</span>
            </button>
          </div>
        )}

        {/* TAB 3: QR CODE */}
        {activeTab === 'qrcode' && (
          <div className="text-center space-y-4">
            <div className="p-5 rounded-2xl bg-secondary/40 border border-border inline-block mx-auto">
              <img
                src={qrCodeUrl}
                alt="QR Code da Coleção"
                className="w-48 h-48 mx-auto rounded-xl shadow-lg border border-border/80"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-foreground">
                QR Code para Encontros e Convenções
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Mostre essa tela no celular para outros colecionadores apontarem a câmera e verem sua garagem instantaneamente!
              </p>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <Link
            href={`/u/${profileIdentifier}`}
            target="_blank"
            className="flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            <ExternalLink className="h-3 w-3" /> Abrir perfil público
          </Link>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
