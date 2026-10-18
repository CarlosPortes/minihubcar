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
  Clock,
  DollarSign,
  Car,
  Smartphone,
  FileSpreadsheet,
  Database,
  Check,
  Crown,
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
    badge: 'Oficial v2.6 - Atualizado 2026',
    icon: BookOpen,
    pages: '5 Páginas',
    size: '2.4 MB',
    filename: 'Documento_1_Documentacao_Funcional_MiniHubCar.pdf',
    url: '/docs/Documento_1_Documentacao_Funcional_MiniHubCar.pdf',
    description:
      'Visão aprofundada de todos os módulos do MiniHub Car: Catálogo Canônico (+25k miniaturas com expansão Maisto, Mini GT e Kaido House), Garagem Pessoal Patrimonial, Motor de Pré-Vendas com 3 Condições de Pagamento, Pré-Vendas Externas Particulares, Notificações WhatsApp e Algoritmo Anticalote de Reputação.',
    topics: [
      'Estrutura do Catálogo Canônico de 25k+ miniaturas com linha Maisto, Hot Wheels e Mini GT',
      'Garagem Virtual: controle físico de prateleiras, conservação e exportação de acervo',
      'Gestão Híbrida de Pré-Vendas: Compras da Plataforma e Pré-Vendas Externas (Particulares)',
      '3 Condições de Pagamento: 100% no Recebimento, Sinal + Restante e Parcelamento',
      'Notificações automáticas no WhatsApp (Evolution API) e Collector Health Score',
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

interface InteractiveModule {
  id: string;
  title: string;
  shortDesc: string;
  icon: any;
  badge: string;
  color: string;
  sections: { heading: string; text: string }[];
  linkText: string;
  linkHref: string;
}

const INTERACTIVE_MODULES: InteractiveModule[] = [
  {
    id: 'garagem',
    title: 'Garagem Virtual & Acervo Pessoal',
    shortDesc: 'Cadastre, organize fisicamente e monitore o valor patrimonial da sua coleção',
    icon: Car,
    badge: 'Módulo Central',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    sections: [
      {
        heading: 'Cadastro Ágil & Canônico',
        text: 'Busque no catálogo oficial de mais de 25.000 miniaturas para preencher foto, escala, fabricante e ano com 1 clique, ou cadastre peças customizadas e raras de forma avulsa.',
      },
      {
        heading: 'Organização Física por Prateleiras e Gavetas',
        text: 'Associe cada exemplar a uma prateleira, nicho, expositor acrílico ou gaveta personalizada. Você nunca mais perderá a localização física de uma miniatura.',
      },
      {
        heading: 'Estado de Conservação & Custo Patrimonial',
        text: 'Classifique a condição física (Lacrado no Blister, Loose impecável, Custom, Com Detalhes) e registre o valor pago. O sistema monitora a valorização histórica de mercado.',
      },
      {
        heading: 'Backup & Exportação em Planilha (CSV/Excel)',
        text: 'Exporte o inventário completo do seu acervo com data, custos e códigos para manter cópias offline de segurança ou apresentar a seguradoras patrimoniais.',
      },
    ],
    linkText: 'Acessar Minha Coleção',
    linkHref: '/collection',
  },
  {
    id: 'pre-vendas',
    title: 'Motor de Pré-Vendas & 3 Condições de Pagamento',
    shortDesc: 'Gestão híbrida de compras na plataforma e reservas particulares externas',
    icon: Clock,
    badge: 'Atualizado 2026',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    sections: [
      {
        heading: 'Pré-Vendas da Plataforma vs. Pré-Vendas Externas',
        text: 'Além de reservar com lojistas homologados do MiniHub Car, qualquer colecionador pode cadastrar suas compras externas feitas no WhatsApp, Facebook ou lojas independentes.',
      },
      {
        heading: 'As 3 Condições de Pagamento Disponíveis',
        text: '1) 100% no Recebimento (paga apenas na chegada do lote); 2) Sinal + Restante (com atalhos rápidos de 20%, 30% ou 50%); 3) Parcelamento Mensal (divide em 2x até 12x com cálculo automático).',
      },
      {
        heading: 'Painel Financeiro Consolidado de Reservas',
        text: 'Acompanhe no topo de Meus Pedidos (/orders) o total financeiro contratado, quanto já foi amortizado e o saldo pendente de todas as suas pré-vendas combinadas.',
      },
      {
        heading: 'Conversão Automática em 1 Clique para a Garagem',
        text: 'Quando o pacote chegar na sua residência, clique em "Mover para Minha Coleção" no card da pré-venda. O modelo é incorporado à sua Garagem Virtual sem redigitação de dados.',
      },
    ],
    linkText: 'Ver Meus Pedidos & Pré-Vendas',
    linkHref: '/orders',
  },
  {
    id: 'catalogo',
    title: 'Catálogo Canônico Oficial (+25.000 Peças)',
    shortDesc: 'Base unificada de modelos 1:64 com fotos, dados técnicos e variações',
    icon: BookOpen,
    badge: 'Expansão Maisto 2026',
    color: 'text-primary bg-primary/10 border-primary/20',
    sections: [
      {
        heading: 'Consolidação de Múltiplos Fabricantes Oficiais',
        text: 'O acervo reúne mais de 25.000 miniaturas canônicas: Hot Wheels (Mainline, Premium, Boulevard, RLC), Mini GT, Kaido House, Inno64, Tarmac Works e o recém-integrado catálogo Maisto.',
      },
      {
        heading: 'Linha Completa Maisto Integrada',
        text: 'Agora você pode pesquisar, adicionar à garagem e controlar pré-vendas de linhas clássicas da Maisto: Fresh Metal, Design, Muscle Machines e Special Edition.',
      },
      {
        heading: 'Filtros Inteligentes e Fichas Técnicas Detalhadas',
        text: 'Filtre por fabricante, montadora real (Porsche, Nissan, Ford, etc.), escala (1:64, 1:43, 1:24, 1:18), tipo de roda (Real Riders, plástico) e ano de lançamento.',
      },
      {
        heading: 'Colaboração & Curadoria Coletiva',
        text: 'Encontrou uma miniatura rara ou customizada que ainda não está catalogada? Colecionadores podem sugerir variações e fotos para aprovação da moderação.',
      },
    ],
    linkText: 'Explorar Catálogo',
    linkHref: '/catalog',
  },
  {
    id: 'seguranca',
    title: 'Segurança, Notificações & Reputação',
    shortDesc: 'Ecossistema seguro com alertas WhatsApp e semáforo anticalote',
    icon: ShieldCheck,
    badge: 'Proteção Ativa',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    sections: [
      {
        heading: 'Notificações Instantâneas via WhatsApp (Evolution API)',
        text: 'Integração direta com o WhatsApp oficial do MiniHub Car para disparo de notificações instantâneas de novos cadastros, confirmações de reservas e avisos de chegada.',
      },
      {
        heading: 'Collector Health Score: O Semáforo Anticalote',
        text: 'Proteção contra inadimplência: o algoritmo cruza pontualidade de pagamentos e cumprimento de prazos entre lojistas da rede, gerando reputação Verde, Amarela ou Vermelha.',
      },
      {
        heading: 'Garantia de Estoque Atômico',
        text: 'No Marketplace do MiniHub Car, transações garantem que cotas de pré-vendas e itens de pronta entrega nunca sejam vendidos em duplicidade.',
      },
      {
        heading: 'Programa de Vendedores Homologados',
        text: 'Importadores e lojistas contam com o Portal do Vendedor (/seller), importação de planilhas CSV do Excel e painel de baixa de parcelas via PIX.',
      },
    ],
    linkText: 'Conhecer Portal do Vendedor',
    linkHref: '/seller',
  },
  {
    id: 'planos',
    title: 'Planos de Assinatura & Capacidades Anuais',
    shortDesc: 'Estrutura de planos anuais adaptada à realidade física de expositores e estantes',
    icon: Crown,
    badge: 'Modelo Anual 2026',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    sections: [
      {
        heading: 'Plano Starter (100% Gratuito para Sempre)',
        text: 'Comece com até 100 miniaturas diecast 1:64 (equivalente a 2 expositores cheios de 50 carros) e até 15 colecionáveis especiais (Funkos/Resinas). Sem pegadinhas, sem anúncios e com acesso ao catálogo de +25k peças.',
      },
      {
        heading: 'Garagem Pro (R$ 49,90 / ano - Mais Escolhido)',
        text: 'Multiplique sua capacidade por 6x (até 600 miniaturas e 50 colecionáveis) por cerca de R$ 4,15/mês. Inclui relatórios financeiros patrimoniais, exportação/importação em lote Excel/CSV e selo Pro destacado.',
      },
      {
        heading: 'Curador Master (R$ 79,90 / ano)',
        text: 'Espaço expandido para até 1.500 miniaturas e 100 colecionáveis (~R$ 6,65/mês), com estatísticas avançadas de valorização do acervo e prioridade na fila de aprovação de fotos e novos castings.',
      },
      {
        heading: 'Legend VIP (R$ 119,90 / ano - Sem Limites)',
        text: 'Capacidade ILIMITADA para miniaturas e colecionáveis (~R$ 9,99/mês), selo Legend VIP dourado exclusivo no perfil e vitrine, e canal direto com os desenvolvedores da plataforma.',
      },
    ],
    linkText: 'Ver e Assinar Planos',
    linkHref: '/plans',
  },
];

const FAQS = [
  {
    q: 'O que são Pré-Vendas Externas e como qualquer colecionador pode cadastrá-las?',
    a: 'Qualquer colecionador pode acessar "Meus Pedidos" (/orders) e clicar no botão "+ Nova Pré-Venda Externa". Você pode registrar reservas feitas em grupos de WhatsApp, redes sociais ou importadores independentes, vinculando à miniatura do catálogo ou cadastrando de forma avulsa. Não é necessário ser vendedor homologado.',
  },
  {
    q: 'Quais são as 3 Condições de Pagamento disponíveis no lançamento de Pré-Vendas?',
    a: 'O sistema oferece 3 modalidades práticas com cálculo automático: 1) Total no Recebimento (paga 100% apenas quando o vendedor receber a peça); 2) Sinal + Restante (com atalhos rápidos de 20%, 30% ou 50% de entrada e saldo na entrega); 3) Parcelamento Mensal (divide em 2x até 12x com cálculo automático de cada parcela e registro das parcelas já quitadas).',
  },
  {
    q: 'Como funciona a conversão automática de Pré-Venda para a Garagem Virtual?',
    a: 'Quando a miniatura chegar fisicamente na sua casa, você não precisa cadastrá-la do zero. Basta acessar o card da pré-venda em "Meus Pedidos" e clicar em "Mover para Minha Coleção". O sistema cria o item na sua Garagem com status "Na Coleção", data de aquisição e custo pago já registrados.',
  },
  {
    q: 'Quantas miniaturas o Catálogo Canônico possui e quais marcas estão incluídas?',
    a: 'O catálogo canônico do MiniHub Car conta com mais de 25.000 variações catalogadas, incluindo Hot Wheels (Mainline, Premium, Boulevard, RLC), Mini GT, Kaido House, Inno64, Tarmac Works e o recém-integrado acervo Maisto (Fresh Metal, Design, Muscle Machines e Special Edition) em múltiplas escalas (1:64, 1:43, 1:24, 1:18).',
  },
  {
    q: 'Posso exportar meu acervo da Garagem Virtual para backup ou seguro?',
    a: 'Sim! Na tela da sua Coleção (/collection), você pode exportar seu inventário completo em formato CSV / Excel com marcas, modelos, estado de conservação, valor pago e cotações para manter um backup físico ou apresentar a seguradoras patrimoniais.',
  },
  {
    q: 'Como funcionam as notificações automáticas via WhatsApp (Evolution API)?',
    a: 'O MiniHub Car conta com integração nativa da Evolution API via Docker. Notificações importantes como novos cadastros de colecionadores e atualizações de status de pedidos são disparadas instantaneamente para o WhatsApp com segurança e estabilidade.',
  },
  {
    q: 'O colecionador precisa pagar para cadastrar miniaturas na Garagem Virtual?',
    a: 'Não para começar! O plano Starter é 100% gratuito para sempre para acervos de até 100 miniaturas diecast 1:64 (o equivalente a 2 expositores cheios de 50 carros) e 15 colecionáveis especiais, com busca no catálogo de mais de 25.000 peças e acompanhamento de pré-vendas. Para coleções que ultrapassam essa faixa, oferecemos planos anuais super acessíveis a partir de R$ 49,90/ano (apenas ~R$ 4,15/mês no Garagem Pro).',
  },
  {
    q: 'Como funcionam os Planos de Assinatura Anuais e as capacidades por faixa de miniaturas?',
    a: 'O MiniHub Car adota planos anuais acessíveis pensados na realidade física dos colecionadores: 1) Starter (Grátis até 100 miniaturas); 2) Garagem Pro (R$ 49,90/ano para até 600 miniaturas); 3) Curador Master (R$ 79,90/ano para até 1.500 miniaturas); e 4) Legend VIP (R$ 119,90/ano para miniaturas ilimitadas). O faturamento anual garante o menor custo mensal possível e pode ser assinado com ativação imediata via PIX ou Cartão em /plans.',
  },
  {
    q: 'Como funciona o cruzamento de dados do Collector Health Score?',
    a: 'O sistema analisa o histórico consolidado de cumprimento de prazos e adimplência de reservas entre todas as lojas homologadas da rede. Vendedores nunca veem dados sigilosos, apenas o semáforo de risco (Verde, Amarelo ou Vermelho) e a pontuação.',
  },
  {
    q: 'Minha loja já possui dezenas de pré-vendas em planilhas do Excel. Como migro?',
    a: 'No Portal do Vendedor (/seller), acesse a aba Pré-Vendas e clique em "Importar Planilha (.csv)". Você pode baixar o nosso modelo formatado para o Excel brasileiro, colar seus dados e o sistema reconhece até mesmo as parcelas que já foram pagas anteriormente.',
  },
  {
    q: 'Como posso acessar a Apostila de Treinamento se já sou Vendedor Homologado?',
    a: 'Você pode baixar o PDF diretamente nesta página ou através do banner de auxílio rápido disponível no topo da aba Pré-Vendas do seu Portal do Vendedor (/seller).',
  },
];

export default function GuiasPage() {
  const [selectedPdf, setSelectedPdf] = useState<{ title: string; url: string } | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeModule, setActiveModule] = useState<string>('garagem');

  const selectedModule =
    INTERACTIVE_MODULES.find((m) => m.id === activeModule) || INTERACTIVE_MODULES[0];

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

        {/* GUIA OPERACIONAL INTERATIVO DOS MÓDULOS */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Navegação Didática do Sistema
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                <Layers className="h-6 w-6 text-primary" />
                Guia Operacional dos Principais Módulos
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aprenda a operar cada ferramenta e descubra como tirar o máximo proveito da plataforma.
              </p>
            </div>
          </div>

          {/* Module Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {INTERACTIVE_MODULES.map((mod) => {
              const ModIcon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveModule(mod.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/40'
                      : 'border-border bg-card hover:bg-secondary/60'
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl border ${mod.color}`}>
                      <ModIcon className="h-5 w-5" />
                    </div>
                    {isActive ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground">{mod.badge}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                      {mod.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {mod.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Module Details Card */}
          {selectedModule && (
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-lg animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl border ${selectedModule.color}`}>
                    <selectedModule.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${selectedModule.color}`}>
                        {selectedModule.badge}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-foreground mt-0.5">
                      {selectedModule.title}
                    </h3>
                  </div>
                </div>

                <Link
                  href={selectedModule.linkHref}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary-hover shadow-glow transition-all self-start sm:self-auto"
                >
                  {selectedModule.linkText}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Grid of Topics inside active module */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedModule.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-1.5 hover:border-primary/40 transition-colors"
                  >
                    <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {sec.heading}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                      {sec.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
