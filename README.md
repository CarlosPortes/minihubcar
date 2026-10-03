# MiniHub Car — Plataforma para Colecionadores de Miniaturas

MiniHub Car é uma plataforma completa e moderna voltada para colecionadores de miniaturas automotivas (com foco prioritário na escala 1:64 como Mini GT, Hot Wheels, Kaido House, Tarmac Works e Matchbox).

O projeto foi inteiramente construído com base nas especificações técnicas e de regras de negócio do MVP contidas na pasta `docs/3.0`.

---

## 🏎️ Tecnologias Utilizadas

### Backend (`/backend`)
- **Node.js** com **TypeScript** (strict mode)
- **Fastify 5**: Servidor HTTP de altíssima performance
- **PostgreSQL 16+**: Autoridade e integridade transacional de dados
- **Drizzle ORM**: Camada de dados tipada e migrations versionadas
- **Zod**: Validação estrita de contratos e variáveis de ambiente
- **JWT & Cookies HTTP-Only**: Autenticação segura com Access e Refresh tokens
- **Pino**: Logging estruturado e correlação por `X-Request-Id`
- **Vitest**: Testes unitários e de regras de domínio

### Frontend (`/frontend`)
- **Next.js 15 (App Router)** com **React 19** e **TypeScript**
- **PWA (Progressive Web App)**: App instalável no celular (iOS/Android) com Service Worker e manifesto nativo
- **Tailwind CSS** com design tokens escuros e estética automotiva premium
- **TanStack Query (React Query)**: Gerenciamento e cache de estado remoto
- **Lucide Icons**: Ícones modernos e consistentes
- **Importação/Exportação**: Carga em lote com validação de catálogo, arquivo de rejeição e exportação em CSV (compatível com Excel)

---

## 📦 Estrutura do Workspace (Monorepo)

```
minihubcar/
├── backend/                  # API REST em Fastify + Drizzle ORM
│   ├── src/
│   │   ├── app/              # Configuração do Fastify e registro de rotas
│   │   ├── config/           # Validação de variáveis de ambiente com Zod
│   │   ├── database/         # Pool Postgres, client Drizzle, 35 tabelas em schemas
│   │   ├── modules/          # Domínios: auth, catalog, collection, locations, etc.
│   │   └── shared/           # Error handler padronizado e classes de ApiError
│   ├── drizzle/              # Migrations SQL versionadas
│   └── tests/                # Testes automatizados Vitest
│
├── frontend/                 # Aplicação Next.js App Router
│   ├── src/
│   │   ├── app/              # Páginas: (auth), (app)/dashboard, catalog, collection...
│   │   ├── components/       # Layout, AppShell, Navbar, Sidebar, MobileNav
│   │   ├── features/         # Auth context e stores
│   │   ├── lib/              # API client unificado
│   │   └── styles/           # Design tokens e Tailwind
│
├── catalogos/                # Dados reais de catálogo (1.300+ miniaturas e fotos)
├── docs/                     # 34 especificações completas da versão 3.0 do MVP
└── docker-compose.yml        # Configuração rápida para subir PostgreSQL via Docker
```

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- Node.js LTS (v20+)
- pnpm (v10 ou v11)
- PostgreSQL (local ou via Docker)

### 2. Instalação das dependências
```bash
pnpm install
```

### 3. Banco de Dados e Migrations
Se for utilizar o Docker:
```bash
docker compose up -d
```
Gere e aplique as migrations:
```bash
# Gerar arquivos SQL caso altere os schemas Drizzle
pnpm db:generate

# Aplicar migrations no PostgreSQL
pnpm db:migrate

# Executar seed com dados de catálogo reais e usuários de teste
pnpm db:seed
```

### 4. Executar em Modo de Desenvolvimento
Para rodar backend e frontend juntos:
```bash
pnpm dev
```
Ou individualmente:
- **Backend**: `pnpm dev:backend` (porta 3333)
- **Frontend**: `pnpm dev:frontend` (porta 3000)

---

## 🔑 Usuários Pré-configurados no Seed

| Papel | E-mail | Senha | Permissões |
| :--- | :--- | :--- | :--- |
| **Colecionador** | `colecionador@minihubcar.com.br` | `Password123!` | Gerenciar coleção, fotos, wishlist, listas e compras/vendas |
| **Administrador** | `admin@minihubcar.com.br` | `Password123!` | Curadoria de solicitações e governança de catálogo |

---

## 🧪 Testes Automatizados

Para rodar os testes da suíte backend:
```bash
pnpm test
```
Para verificação de tipos TypeScript em todo o monorepo:
```bash
pnpm typecheck
```

---

## 📱 Recursos Recentes Implementados
- **Filtros Avançados na Coleção**: Busca refinada por Montadora do carro real, Localização/Expositor físico, Condição de conservação e Fabricante da miniatura.
- **Exportação & Importação em Lote**:
  - Exportação completa da coleção para CSV/Excel com formatação UTF-8 BOM e separador `;`.
  - Importação em lote a partir de planilha/modelo, com validação inteligente contra o catálogo oficial e download automático do **Arquivo de Rejeições** com motivo detalhado para itens não encontrados.
- **Solicitações Detalhadas de Catálogo**:
  - Sugestão de novas miniaturas com suporte a **novo fabricante** não existente e **upload de fotos**.
  - Painel de moderação de solicitações para Administradores com aprovação e rejeição documentadas.
- **PWA para Smartphone**:
  - Adição direta à tela inicial no Android e iPhone.
  - Navegação em tela cheia (standalone) com ícones em alta resolução e carregamento acelerado por Service Worker.
