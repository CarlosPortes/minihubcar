'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  Briefcase,
  Share2,
  Download,
  Eye,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  HelpCircle,
  FileText,
  X,
  Store,
  Layers,
  Heart,
  ArrowRight,
} from 'lucide-react';

interface GuideDoc {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  categoryColor: string;
  badge: string;
  icon: any;
  pages: string;
  size: string;
  filename: string;
  url: string;
  description: string;
  topics: string[];
  audience: string;
}

const GUIDES: GuideDoc[] = [
  {
    id: 'doc-funcional',
    title: 'Documentação Funcional da Aplicação',
    subtitle: 'Arquitetura do Sistema, Módulos e Casos de Uso Ponta a Ponta',
    category: 'Técnico & Operacional',
    categoryColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    badge: 'Oficial v2.4',
    icon: BookOpen,
    pages: '4 Páginas',
    size: '2.1 MB',
    filename: 'Documento_1_Documentacao_Funcional_MiniHubCar.pdf',
    url: '/docs/Documento_1_Documentacao_Funcional_MiniHubCar.pdf',
    description:
      'Visão aprofundada de todos os módulos do MiniHub Car: Catálogo Canônico (+22k miniaturas), Garagem Pessoal Patrimonial, Wishlist, Marketplace à Pronta Entrega, Motor de Pré-Vendas, Algoritmo Anticalote de Reputação e Casos de Uso detalhados.',
    topics: [
      'Estrutura hierárquica do Catálogo Canônico de 22k+ miniaturas',
      'Garagem Virtual: controle físico, conservação e valor patrimonial',
      'Motor de Pré-Vendas: Sinal, Saldo e Parcelamento em até 10x',
      'Collector Health Score: monitoramento de risco e adimplência',
      'Provisionamento automático de compradores com senha provisória',
    ],
    audience: 'Colecionadores, Desenvolvedores, Curadores e Gestores',
  },
  {
    id: 'doc-vendedores',
    title: 'Apostila de Treinamento do Vendedor Homologado',
    subtitle: 'Manual Prático Operacional: Da Gestão de Pré-Vendas ao Cruzamento de Reputação',
    category: 'Vendedores & Lojas',
    categoryColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    badge: 'Treinamento 2026',
    icon: GraduationCap,
    pages: '4 Páginas',
    size: '2.3 MB',
    filename: 'Documento_2_Apostila_Treinamento_Vendedores.pdf',
    url: '/docs/Documento_2_Apostila_Treinamento_Vendedores.pdf',
    description:
      'Guia prático definitivo para importadores e lojistas credenciados. Como operar o Portal do Vendedor (/seller), configurar as 3 modalidades de pré-vendas, baixar parcelas antigas pagas no PIX, importar planilhas do Excel em lote e consultar o Health Score.',
    topics: [
      'Visão geral das 5 abas do Portal do Vendedor (/seller)',
      'Configurando as 3 Modalidades: Sinal, Parcelado (até 10x) e na Chegada',
      'Cadastro rápido individual com geração automática de credencial MiniHub@2026',
      'Importação em lote de planilhas CSV com reconhecimento de parcelas pagas',
      'O Diferencial Anticalote: Semáforo de Risco Verde, Amarelo e Vermelho',
    ],
    audience: 'Lojistas, Importadores de Diecast e Vendedores Credenciados',
  },
  {
    id: 'doc-comercial',
    title: 'Apresentação Comercial & Pitch Deck',
    subtitle: 'O Hub Definitivo do Colecionismo Diecast no Brasil',
    category: 'Institucional & Negócios',
    categoryColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    badge: 'Visão Estratégica',
    icon: Briefcase,
    pages: '3 Páginas',
    size: '2.6 MB',
    filename: 'Documento_3_Apresentacao_Comercial_MiniHubCar.pdf',
    url: '/docs/Documento_3_Apresentacao_Comercial_MiniHubCar.pdf',
    description:
      'A visão de negócio e posicionamento de mercado apresentada pelo fundador Carlos Portes (carlosportes@gmail.com). Análise de mercado (+500k colecionadores ativos), dores do setor informal, proposta de valor e o Roadmap de futuro da plataforma.',
    topics: [
      'Carta de Apresentação do Fundador Carlos Portes',
      'Mercado Bilionário: mais de R$ 180M/ano movimentados no nicho',
      'Comparativo: Por que o MiniHub Car supera os marketplaces generalistas',
      'Roadmap 2026: Leilões ao Vivo, App Mobile com Scanner de IA e Passaporte Digital',
      'Programa pioneiro para os primeiros 50 Vendedores Homologados',
    ],
    audience: 'Parceiros Comerciais, Investidores, Lojistas Pioneiros e Comunidade',
  },
  {
    id: 'doc-redes-sociais',
    title: 'Plano de Ação para Redes Sociais',
    subtitle: 'Kit de Lançamento Orgânico para Instagram, Facebook e WhatsApp',
    category: 'Mídias Sociais & Lançamento',
    categoryColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    badge: 'Marketing Tático',
    icon: Share2,
    pages: '2 Páginas',
    size: '2.2 MB',
    filename: 'Documento_4_Plano_Divulgacao_Redes_Sociais.pdf',
    url: '/docs/Documento_4_Plano_Divulgacao_Redes_Sociais.pdf',
    description:
      'Estratégia sob medida para alavancar a autoridade pessoal de Carlos Portes em grupos e redes. Copies prontas para Feed, Carrosséis educativos de valorização da coleção, abordagem de lojistas no WhatsApp e postagens para grupos do Facebook.',
    topics: [
      'O superpoder de lançar através do perfil pessoal do fundador',
      'Instagram: Post de Storytelling, Carrossel Didático e Roteiro de Stories',
      'Facebook: Modelo de post comunitário que não viola moderação de grupos',
      'WhatsApp: Abordagem 1 a 1 de lojistas parceiros e sequência para Status',
    ],
    audience: 'Equipe de Comunicação, Divulgadores e Fundador',
  },
];

const FAQS = [
  {
    q: 'Como posso acessar a Apostila de Treinamento se já sou Vendedor Homologado?',
    a: 'Você pode baixar o PDF diretamente nesta página ou através do banner de auxílio rápido disponível no topo da aba Pré-Vendas do seu Portal do Vendedor (/seller).',
  },
  {
    q: 'O colecionador precisa pagar para cadastrar miniaturas na Garagem Virtual?',
    a: 'Não! O cadastro da Garagem Virtual, busca no catálogo de 22.000 miniaturas e acompanhamento de pré-vendas são 100% gratuitos para todos os colecionadores.',
  },
  {
    q: 'Como funciona o cruzamento de dados do Collector Health Score?',
    a: 'O sistema analisa o histórico consolidado de cumprimento de prazos e adimplência de reservas entre todas as lojas homologadas da rede. Vendedores nunca veem dados sigilosos, apenas o semáforo de risco (Verde, Amarelo ou Vermelho) e a pontuação.',
  },
  {
    q: 'Minha loja já possui dezenas de pré-vendas em planilhas do Excel. Como migro?',
    a: 'No Portal do Vendedor, acesse a aba Pré-Vendas e clique em "Importar Planilha (.csv)". Você pode baixar o nosso modelo formatado para o Excel brasileiro, colar seus dados e o sistema reconhece até mesmo as parcelas que já foram pagas anteriormente.',
  },
];

export default function GuiasPage() {
  const [selectedPdf, setSelectedPdf] = useState<{ title: string; url: string } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen pb-16 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* HERO HEADER */}
        <div className="relative rounded-2xl border border-border bg-gradient-to-br from-card via-card/90 to-primary/5 p-8 lg:p-12 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
              <Sparkles className="h-3.5 w-3.5" />
              Central Oficial de Conhecimento
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              Manuais, Guias & <span className="text-primary">Documentação Oficial</span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Consulte e faça o download dos materiais oficiais do <strong>MiniHub Car</strong>.
              Documentos estruturados para apoiar colecionadores, capacitar vendedores homologados e
              apresentar nossa visão de negócio para o mercado de miniaturas colecionáveis.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/seller"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow transition-all"
              >
                <Store className="h-4 w-4" />
                Ir para o Portal do Vendedor
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 border border-border font-semibold text-xs transition-all"
              >
                Conhecer a História & Roadmap
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>

        {/* GUIDES GRID */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documentos Executivos Disponíveis para Download
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clique para visualizar diretamente na tela ou salvar o arquivo em formato PDF.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground border border-border">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Arquivos Auditados & Atualizados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {GUIDES.map((doc) => {
              const Icon = doc.icon;
              return (
                <div
                  key={doc.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-border bg-card/70 p-6 backdrop-blur-sm hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="space-y-4">
                    {/* Header badge & icon */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${doc.categoryColor}`}
                          >
                            {doc.category}
                          </span>
                          <span className="ml-2 text-[11px] text-muted-foreground font-mono">
                            {doc.badge}
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-muted-foreground font-mono">
                        <div>{doc.pages}</div>
                        <div>{doc.size}</div>
                      </div>
                    </div>

                    {/* Titles */}
                    <div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {doc.title}
                      </h3>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                        {doc.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {doc.description}
                    </p>

                    {/* Topics checklist */}
                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                        Tópicos Abordados:
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {doc.topics.map((t, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-6 mt-6 border-t border-border flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPdf({ title: doc.title, url: doc.url })}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs border border-border transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4 text-primary" />
                      Visualizar
                    </button>

                    <a
                      href={doc.url}
                      download={doc.filename}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-glow transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CALLOUT: VENDEDORES HOMOLOGADOS */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-amber-500/5 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              <Store className="h-3.5 w-3.5" />
              Programa de Vendedores Homologados
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground">
              Você é lojista ou importa miniaturas no Brasil?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Elimine o estresse das cobranças no WhatsApp e blinde seu capital de giro com o nosso
              sistema de parcelamento em até 10x, importação de planilhas e o exclusivo{' '}
              <strong>Collector Health Score</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <a
              href="/docs/Documento_2_Apostila_Treinamento_Vendedores.pdf"
              download="Documento_2_Apostila_Treinamento_Vendedores.pdf"
              className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4 text-amber-400" />
              Baixar Apostila do Vendedor
            </a>
            <Link
              href="/seller"
              className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 shadow-glow transition-all flex items-center justify-center gap-2"
            >
              Acessar Área do Vendedor
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* FAQ ACCORDION */}
        <div className="rounded-xl border border-border bg-card/60 p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Perguntas Frequentes sobre Manuais e Operação
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tire suas principais dúvidas sobre o funcionamento do MiniHub Car.
            </p>
          </div>

          <div className="divide-y divide-border/60">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between text-left font-bold text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/50">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PDF VIEWER MODAL */}
      {selectedPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl h-[90vh] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{selectedPdf.title}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">Visualizador Oficial de Documentos</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedPdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
                <a
                  href={selectedPdf.url}
                  download
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow flex items-center gap-1.5 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPdf(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors ml-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / iframe */}
            <div className="flex-1 w-full bg-slate-950/80">
              <iframe
                src={`${selectedPdf.url}#toolbar=1`}
                className="w-full h-full border-0"
                title={selectedPdf.title}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
