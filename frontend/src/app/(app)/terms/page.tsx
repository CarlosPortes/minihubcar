'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

export default function TermsOfUsePage() {
  const lastUpdated = '27 de Setembro de 2026';

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="space-y-3 border-b border-border pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o início
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Termos de Uso e Condições Gerais
            </h1>
            <p className="text-xs text-muted-foreground">
              Última atualização: {lastUpdated} • Versão 1.0 Oficial
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">1. Aceitação dos Termos</h2>
          <p>
            Ao criar uma conta, acessar ou utilizar a plataforma <strong className="text-foreground">MiniHub Car</strong>, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso e com nossa{' '}
            <Link href="/privacy" className="text-primary hover:underline font-medium">
              Política de Privacidade
            </Link>
            . Caso não concorde com qualquer disposição aqui estabelecida, solicitamos que não utilize nossos serviços.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">2. Natureza e Objeto do Serviço</h2>
          <p>
            O MiniHub Car é uma plataforma digital especializada voltada para entusiastas e colecionadores de miniaturas (em especial na escala 1:64), fornecendo:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Catálogo técnico detalhado com especificações de modelos, montadoras, fabricantes e fotos;</li>
            <li>Sistema de inventário pessoal e controle patrimonial (custo de aquisição, valuation e status);</li>
            <li>Endereçamento espacial em expositores, armários e gavetas com representação gráfica 2D e 3D;</li>
            <li>Marketplace comunitário para aproximação de compradores e vendedores independentes (Peer-to-Peer).</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">3. Cadastro, Segurança e Recuperação de Senhas</h2>
          <p>
            O usuário é o único responsável pela veracidade e precisão das informações cadastrais fornecidas. Cada usuário é pessoalmente responsável por manter a confidencialidade de suas credenciais de login.
          </p>
          <p>
            A plataforma disponibiliza mecanismo de recuperação de senhas através de tokens temporários seguros de uso único. Qualquer atividade realizada através de sua conta será de sua exclusiva responsabilidade.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">4. Regras do Marketplace e Transações P2P</h2>
          <div className="p-4 rounded-xl bg-card border border-border space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Conduta do Vendedor e Qualidade dos Itens
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>
                <strong>Veracidade da Condição:</strong> O vendedor deve descrever com exatidão o estado real da miniatura anunciada (se está em blister lacrado, se é solta/loose, se há imperfeições na pintura ou danos na cartela).
              </li>
              <li>
                <strong>Tolerância Zero a Contrafações:</strong> É estritamente proibido anunciar ou comercializar réplicas não autorizadas, miniaturas falsificadas ou produtos pirateados.
              </li>
              <li>
                <strong>Embalagem Apropriada:</strong> Por se tratar de itens colecionáveis e frágeis, o vendedor se compromete a acondicionar o produto com proteção reforçada (plástico bolha, caixas rígidas) para evitar danos durante o transporte.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">5. Propriedade Intelectual e Marcas Registradas</h2>
          <p>
            Todos os direitos sobre a interface, design, código-fonte, arquitetura de software e marca do MiniHub Car são de propriedade exclusiva de seus desenvolvedores.
          </p>
          <p>
            Marcas registradas de miniaturas (como Mini GT, Kaido House, Hot Wheels, Tarmac Works, Inno64, etc.) e logotipos de montadoras de automóveis (como Nissan, Porsche, Ferrari, BMW, etc.) são de propriedade de seus respectivos titulares. Sua menção na plataforma ocorre com finalidade puramente descritiva, histórica e catalográfica.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">6. Moderação de Conteúdo e Suspensão de Contas</h2>
          <p>
            O MiniHub Car reserva-se o direito de suspender ou banir preventivamente contas que violem estes termos, tentem praticar golpes, desrespeitem outros colecionadores no chat ou descumpram os combinados de negociação.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">7. Legislação Aplicável e Foro</h2>
          <p>
            Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil, em especial o Código de Defesa do Consumidor e o Marco Civil da Internet. Fica eleito o foro da comarca de domicílio do usuário para dirimir quaisquer controvérsias oriundas do presente instrumento.
          </p>
        </section>

        {/* Contact Note */}
        <div className="p-4 rounded-xl bg-secondary/40 border border-border text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0" />
          <span>
            Dúvidas jurídicas ou denúncias de infrações de conduta devem ser encaminhadas para{' '}
            <strong className="text-foreground">contato@minihubcar.com.br</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}
