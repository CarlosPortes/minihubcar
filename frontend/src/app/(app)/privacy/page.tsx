'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Eye, Database, UserCheck, ArrowLeft, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Política de Privacidade e Proteção de Dados (LGPD)
            </h1>
            <p className="text-xs text-muted-foreground">
              Em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) • Atualizado em {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {/* Intro */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">1. Compromisso com a sua Privacidade</h2>
          <p>
            No <strong className="text-foreground">MiniHub Car</strong>, a segurança e a confidencialidade dos dados dos nossos colecionadores e vendedores são prioridades absolutas. Esta Política de Privacidade descreve de maneira transparente como tratamos, armazenamos e protegemos suas informações pessoais.
          </p>
        </section>

        {/* Coleta */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">2. Dados Pessoais que Coletamos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                <UserCheck className="h-4 w-4 text-primary" /> Dados de Cadastro
              </div>
              <p className="text-xs text-muted-foreground">
                Nome completo, e-mail para acesso, senha (armazenada exclusivamente sob formato criptográfico irreversível bcrypt com salt) e telefone de contato voluntário.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                <Database className="h-4 w-4 text-primary" /> Dados da Coleção
              </div>
              <p className="text-xs text-muted-foreground">
                Inventário de miniaturas, valores declarados de aquisição, fotografias enviadas, endereçamento físico de expositores e listas de desejos (wishlists).
              </p>
            </div>
          </div>
        </section>

        {/* Finalidade */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">3. Finalidade do Tratamento de Dados</h2>
          <p>Seus dados são utilizados estritamente para as seguintes finalidades legítimas:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identificação, autenticação e recuperação segura de acesso à conta de usuário;</li>
            <li>Gestão patrimonial, estatísticas de coleção e renderização de expositores 2D/3D;</li>
            <li>Intermediação e comunicação entre compradores e vendedores no marketplace interno;</li>
            <li>Cumprimento de obrigações legais e regulatórias vigentes no ordenamento jurídico brasileiro.</li>
          </ul>
        </section>

        {/* Segurança */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> 4. Segurança da Informação e Senhas
          </h2>
          <p>
            Adotamos medidas técnicas e organizacionais avançadas para proteger seus dados contra acessos não autorizados, perda acidental ou alteração indevida:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Senhas Invioláveis:</strong> Nenhuma senha de usuário é salva em texto puro. Utilizamos derivação criptográfica com <code>bcrypt</code>, tornando impossível a recuperação reversa até mesmo para nossos administradores.
            </li>
            <li>
              <strong>Recuperação Segura:</strong> Links de recuperação de senha utilizam tokens aleatórios criptograficamente seguros (UUIDv4) com validade curta de 1 (uma) hora e invalidação imediata após o primeiro uso.
            </li>
            <li>
              <strong>Comunicação Criptografada:</strong> Todo o tráfego entre seu navegador e nossos servidores é protegido por camadas de transporte seguro (HTTPS / TLS 1.3).
            </li>
          </ul>
        </section>

        {/* Compartilhamento */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">5. Não Compartilhamento Comercial</h2>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-foreground space-y-1">
            <p className="font-semibold text-xs text-primary">Nossos princípios de privacidade:</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O MiniHub Car <strong>JAMAIS</strong> comercializa, aluga ou cede dados pessoais ou listas de colecionadores a agências de marketing, corretoras de dados ou parceiros comerciais para fins de propaganda não solicitada.
            </p>
          </div>
        </section>

        {/* Direitos LGPD */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">6. Seus Direitos como Titular de Dados (Art. 18 da LGPD)</h2>
          <p>Você possui o direito garantido por lei de, a qualquer momento e mediante requisição facilitada:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirmar a existência de tratamento dos seus dados;</li>
            <li>Acessar todos os seus dados cadastrais e de inventário;</li>
            <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>Solicitar a anonimização, bloqueio ou eliminação definitiva dos seus dados;</li>
            <li>Revogar o consentimento previamente fornecido.</li>
          </ul>
        </section>

        {/* Canal DPO */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">7. Encarregado de Dados (DPO) e Canal de Atendimento</h2>
          <p>
            Para exercer qualquer um dos seus direitos previstos pela LGPD ou esclarecer dúvidas a respeito do tratamento dos seus dados, entre em contato direto com o nosso Encarregado pelo e-mail:
          </p>
          <div className="pt-2">
            <a
              href="mailto:privacidade@minihubcar.com.br"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted border border-border text-xs font-semibold transition-colors"
            >
              <Mail className="h-4 w-4 text-primary" />
              privacidade@minihubcar.com.br
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
