'use client';

import React from 'react';
import Link from 'next/link';
import {
  Car,
  Layers,
  MapPin,
  TrendingUp,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  QrCode,
  Truck,
  Star,
  Smartphone,
  ScanLine,
  Crown,
  Gavel,
  ArrowRight,
  CheckCircle2,
  Clock,
  Rocket,
  Compass,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/90 to-primary/10 border border-border p-8 sm:p-12 shadow-card">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nossa Missão & Propósito</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-tight">
            A Plataforma Definitiva Feita por Colecionadores para Colecionadores.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            O <strong className="text-foreground">MiniHub Car</strong> nasceu da paixão genuína pelo universo diecast
            em escala 1:64. Nosso objetivo é unificar catalogação de alta precisão técnica,
            endereçamento físico espacial inteligente e um marketplace seguro para a comunidade de colecionadores em todo o Brasil.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary-hover shadow-glow text-xs transition-all"
            >
              <Car className="h-4 w-4" /> Explorar Catálogo
            </Link>
            <a
              href="#roadmap"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-foreground font-semibold hover:bg-muted border border-border text-xs transition-colors"
            >
              <Rocket className="h-4 w-4 text-primary" /> Ver Futuros Passos (Roadmap)
            </a>
          </div>
        </div>
      </section>

      {/* Os 4 Pilares da Plataforma */}
      <section className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Nossos Pilares Fundamentais
          </h2>
          <p className="text-xs text-muted-foreground">
            A infraestrutura pensada nos mínimos detalhes para suprir as dores reais do colecionismo contemporâneo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-card hover:border-primary/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Car className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Catálogo Rigoroso</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mais de 1.300 modelos catalogados (Mini GT, Kaido House, etc.) com montadoras, numeração oficial, especificações de chassis, rodas e variantes especiais.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-card hover:border-accent/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Endereçamento 2D & 3D</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Estruture sua coleção em árvores de locais (Cômodos &gt; Expositores &gt; Nichos e Gavetas) com visualização gráfica proporcional e mapa tridimensional.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-card hover:border-emerald-500/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Gestão Patrimonial</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acompanhamento detalhado do valor investido, custo médio de aquisição, histórico de vendas e apuração de lucro líquido da sua garagem.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-3 shadow-card hover:border-purple-500/40 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Marketplace P2P</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Conexão direta entre compradores e vendedores homologados, com chat interno em tempo real para tirar dúvidas e fechar negociações com transparência.
            </p>
          </div>
        </div>
      </section>

      {/* ROADMAP & FUTUROS PASSOS */}
      <section id="roadmap" className="space-y-6 scroll-mt-20">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit">
            <Rocket className="h-3.5 w-3.5" />
            <span>Visão de Futuro</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Futuros Passos da Aplicação (Roadmap)
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Acompanhe o planejamento transparente de evolução do MiniHub Car. Estamos construindo a mais completa central de colecionismo da América Latina.
          </p>
        </div>

        <div className="space-y-6">
          {/* Fase 1 */}
          <div className="relative rounded-2xl bg-card border border-emerald-500/30 p-6 sm:p-8 shadow-card overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500/10 border-l border-b border-emerald-500/30 rounded-bl-xl text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> FASE 1: CONCLUÍDA & OPERACIONAL (v1.0)
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Fundação da Plataforma
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Lançamento Oficial & Infraestrutura Central
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Catálogo Mini GT Oficial
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Mais de 1.300 modelos com especificações técnicas completas, marcas e fotos.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Endereçamento 2D e 3D
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Mapeamento visual de expositores, gavetas e nichos com proporções reais.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Garagem & Coleção
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Gestão patrimonial, preços de compra, valor estimado e status de cada peça.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Marketplace & Chat P2P
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Anúncios diretos entre colecionadores com mensagens internas privadas.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Autenticação & Recuperação
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Controle de senhas seguras por token e conformidade com diretrizes de segurança.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Wishlists & Solicitações
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Lista de desejos e envio comunitário de modelos novos para moderação.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fase 2 */}
          <div className="relative rounded-2xl bg-card border border-primary/40 p-6 sm:p-8 shadow-card overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-primary/10 border-l border-b border-primary/30 rounded-bl-xl text-primary text-xs font-bold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 animate-spin" /> FASE 2: EM ANDAMENTO / PRÓXIMO LANÇAMENTO
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Monetização & Logística Integrada
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  Checkout Automatizado, Frete em Tempo Real e Reputação
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">PIX Instantâneo</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Pagamento automatizado com QR Code dinâmico e liquidação imediata com custódia garantida (escrow) até a entrega.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Truck className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Frete Integrado</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Cálculo direto de Correios e Melhor Envio no carrinho, com emissão de etiquetas e código de rastreamento automático.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Star className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Reputação Verificada</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Avaliações pós-venda por estrelas e comentários, com selo de &quot;Vendedor Seguro&quot; para membros homologados.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Crown className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Garage Club Pro</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Plano de assinatura para lojistas e grandes colecionadores com vitrine destacada, analytics de mercado e taxas reduzidas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fase 3 */}
          <div className="relative rounded-2xl bg-card border border-border/80 p-6 sm:p-8 shadow-card overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-secondary border-l border-b border-border rounded-bl-xl text-muted-foreground text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> FASE 3: PLANEJAMENTO ESTRATÉGICO
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Inovação & Inteligência Artificial
                </span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">
                  App Mobile Nativo, Reconhecimento Visual e Leilões
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">App iOS & Android</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Experiência mobile com notificações em tempo real de novas peças na wishlist e mensagens do marketplace.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">IA Visual (Scan Car)</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Aponte a câmera para qualquer miniatura e nossa IA identifica o modelo exato, marca, ano e valor médio de mercado.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <ScanLine className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Scanner de Código de Barras</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Leitura instantânea de códigos de barra (UPC/EAN) no blister para catalogação rápida com um único toque.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <Gavel className="h-4 w-4" />
                  </div>
                  <h4 className="font-bold text-foreground text-sm">Leilões & Trocas Oficiais</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Módulo de lances ao vivo para raridades e sistema blindado de trocas entre colecionadores com entrega intermediada.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Governança e Transparência */}
      <section className="rounded-2xl bg-secondary/30 border border-border p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Compromisso Ético & Jurídico</h3>
            <p className="text-xs text-muted-foreground">
              Operamos em estrita conformidade com a legislação brasileira e a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          O MiniHub Car valoriza a privacidade dos seus usuários. Suas senhas são protegidas com criptografia de ponta a ponta (bcrypt),
          seus dados pessoais nunca são comercializados e nosso marketplace adota regras rígidas contra peças contrafeitas ou anúncios enganosos.
        </p>

        <div className="flex flex-wrap gap-4 pt-2 text-xs">
          <Link href="/terms" className="text-primary hover:underline font-semibold flex items-center gap-1">
            Consultar Termos de Uso <ArrowRight className="h-3 w-3" />
          </Link>
          <Link href="/privacy" className="text-primary hover:underline font-semibold flex items-center gap-1">
            Política de Privacidade (LGPD) <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>
    </div>
  );
}
