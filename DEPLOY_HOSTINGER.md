# 🚀 Guia de Publicação — MiniHub Car (Coexistindo com AtivoArbóreo na Hostinger VPS)

Este guia foi adaptado para a sua VPS da Hostinger, onde a aplicação **AtivoArbóreo** já está em operação. O **MiniHub Car** rodará de forma 100% isolada, em portas exclusivas, sem afetar ou pausar o AtivoArbóreo.

---

## 🛡️ Garantia de Não Conflito de Portas

Para que o **MiniHub Car** e o **AtivoArbóreo** rodem juntos no mesmo servidor sem conflito:

| Serviço | Porta MiniHub Car | Situação em Relação ao AtivoArbóreo |
| :--- | :--- | :--- |
| **Banco PostgreSQL** | `127.0.0.1:5434` | Isolado (não colide com o banco do AtivoArbóreo) |
| **Backend API** | `127.0.0.1:3334` | Isolado (porta exclusiva) |
| **Frontend Web** | `127.0.0.1:3002` | Isolado (não colide com a porta 3000 do AtivoArbóreo) |
| **Nginx / HTTPS** | `80` e `443` | Compartilhado por múltiplos domínios (cada site tem seu arquivo `.conf`) |

---

## 📋 Credenciais do Super Usuário (MiniHub Car)

- **E-mail**: `admin@minihubcar.com.br`
- **Senha Inicial**: `Password123!`
- **Chave PIX Doações**: `5accf9cd-a478-4e40-a223-a3fbff42b868` (Ciclo: dia 20 a dia 20)
- **Meta Mensal**: `R$ 110,00`

---

## 🛠️ Passo 1: Acessar a sua VPS via SSH

Abra o PowerShell ou terminal e conecte-se:

```bash
ssh root@SEU_IP_DA_HOSTINGER
```

*(Como você já tem o Docker, Nginx e Certbot instalados para o AtivoArbóreo, **não é necessário reinstalar nada**).*

---

## 📂 Passo 2: Criar a Pasta do MiniHub Car e Enviar o Código

Crie uma pasta dedicada para o MiniHub Car:

```bash
mkdir -p /var/www/minihubcar
cd /var/www/minihubcar
```

### Se o seu projeto estiver no GitHub ou GitLab:
```bash
git clone SEU_REPOSITORIO_GIT .
```

### Ou envie do seu computador via SCP (no terminal local do Windows):
```powershell
scp -r C:\Projetos\minihubcar\* root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/
```

---

## ⚙️ Passo 3: Criar o arquivo `.env` de Produção

Dentro de `/var/www/minihubcar` na VPS, crie o arquivo `.env`:

```bash
nano .env
```

Cole o conteúdo:

```env
# Banco de Dados do MiniHub Car
POSTGRES_DB=minihub_car
POSTGRES_USER=minihub_admin
POSTGRES_PASSWORD=MiniHubCar_SuperSenhaPostgres_2026

# Segurança JWT
JWT_SECRET=minihub-jwt-secret-producao-super-seguro-2026
JWT_REFRESH_SECRET=minihub-refresh-secret-producao-super-seguro-2026

# Domínio ou IP (coloque a URL do MiniHub Car)
CORS_ORIGIN=https://minihubcar.com.br
NEXT_PUBLIC_API_URL=/api/v1

# Apoio & Doações (Ciclo de 20 a 20)
DONATION_PIX_KEY=5accf9cd-a478-4e40-a223-a3fbff42b868
DONATION_MONTHLY_GOAL=110.00
```
*(Pressione `Ctrl + O` e `Enter` para salvar, e `Ctrl + X` para fechar).*

---

## 🐳 Passo 4: Subir os Containers do MiniHub Car

Execute o comando para construir e inicializar os containers do MiniHub Car:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verifique se os containers subiram normalmente:
```bash
docker compose -f docker-compose.prod.yml ps
```
Você verá:
- `minihub-postgres`
- `minihub-backend`
- `minihub-frontend`

---

## 🗄️ Passo 5: Inicializar o Banco Limpo (Migrate + Super Usuário)

Com os containers rodando, execute as migrations e o seed limpo de produção:

```bash
# 1. Cria as tabelas estruturais no PostgreSQL
docker compose -f docker-compose.prod.yml exec backend pnpm db:migrate

# 2. Cria as permissões e o Super Usuário (admin@minihubcar.com.br / Password123!)
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:prod
```

---

## 🏎️ Passo 6: Fazer a Carga dos Catálogos Oficiais (Sem Repetição)

Os scripts foram desenhados com **idempotência estrita** (verificam os identificadores e códigos únicos `ux_product_identifier` antes de inserir. Se o modelo já existir, ele é atualizado e enriquecido, **garantindo zero repetição/duplicação** entre catálogos):

```bash
# 1. Carga MINIGTBRASIL (Catálogo oficial Mini GT Brasil + Tarmac / Kaido House)
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:minigtbrasil

# 2. Carga Almost Real (ar_catalogo_english.csv com escalas 1:64, 1:43 e 1:18)
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:ar

# 3. Carga Fandom Mini GT (MGT00001+, edições especiais e fotos históricas da wiki)
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:fandom

# 4. Carga Pop Race (poprace_catalogo.csv)
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:poprace

# 5. Carga Matchbox (matchbox_catalogo.csv - Mainline, Moving Parts, Collectors, 5-Packs)
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:matchbox
```

*(Opcional: se quiser carregar também os catálogos complementares de marcas e Hot Wheels):*
```bash
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:automakers
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:hw
# Carga completa de 12.000 modelos Hot Wheels (1968-2026 via hw_catalogo.csv):
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:hw:full
```

---

## 🔒 Passo 7: Configurar o Nginx e Ativar o SSL (HTTPS)

> ⚠️ **Atenção:** NÃO apague os arquivos de configuração do AtivoArbóreo! O Nginx suporta múltiplos sites simultâneos.

1. Copie o arquivo de configuração do MiniHub Car para o Nginx:
```bash
cp /var/www/minihubcar/deploy/nginx/minihubcar.conf /etc/nginx/sites-available/minihubcar.conf
```

2. O arquivo já vem pré-configurado para `minicarhub.com.br`. Se desejar conferir:
```bash
cat /etc/nginx/sites-available/minihubcar.conf
```

3. Ative o novo site sem mexer no site do AtivoArbóreo:
```bash
ln -s /etc/nginx/sites-available/minihubcar.conf /etc/nginx/sites-enabled/
```

4. Valide a sintaxe do Nginx e recarregue:
```bash
nginx -t
systemctl reload nginx
```

5. Emita o certificado SSL gratuito via Certbot para o novo domínio:
```bash
certbot --nginx -d minihubcar.com.br -d www.minihubcar.com.br
```

---

## 🎉 Pronto!
O **MiniHub Car** estará publicado e funcionando perfeitamente em HTTPS, ao lado do **AtivoArbóreo**, cada um no seu próprio domínio e sem nenhum conflito de recursos!

---

## 📸 Resolução & Atualização das Fotos do Catálogo

Se o site já estiver no ar e você precisar atualizar o frontend ou backend para que as fotos apareçam:

### 1. Enviar os arquivos corrigidos do seu computador local:
No PowerShell do seu computador:
```powershell
# Envia os arquivos de frontend e backend corrigidos
scp C:\Projetos\minihubcar\frontend\src\lib\utils\media.ts root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/frontend/src/lib/utils/
scp C:\Projetos\minihubcar\frontend\src\components\ui\MiniatureImage.tsx root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/frontend/src/components/ui/
scp C:\Projetos\minihubcar\backend\src\app\app.ts root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/backend/src/app/
scp C:\Projetos\minihubcar\backend\src\database\seed-hw-catalogs.ts root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/backend/src/database/
```

### 2. Garantir que a pasta de fotos está na VPS:
Verifique na VPS se a pasta `/var/www/minihubcar/catalogos` contém as fotos:
```bash
ls -la /var/www/minihubcar/catalogos/MINIGTBRASIL/fotos | head -n 10
```
*(Caso ainda não tenha copiado a pasta de fotos da sua máquina local, envie apenas a pasta de catálogos via SCP):*
```powershell
scp -r C:\Projetos\minihubcar\catalogos\MINIGTBRASIL root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/catalogos/
scp -r C:\Projetos\minihubcar\catalogos\AR root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/catalogos/
scp -r C:\Projetos\minihubcar\catalogos\Fandom root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/catalogos/
scp -r C:\Projetos\minihubcar\catalogos\PopRace root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/catalogos/
scp -r C:\Projetos\minihubcar\catalogos\Matchbox root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/catalogos/
scp -r C:\Projetos\minihubcar\catalogos\Spark root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/catalogos/
```

### 3. Executar a carga dos novos catálogos no banco de dados na VPS:
```bash
# Pop Race
docker compose -f docker-compose.prod.yml exec backend npm run db:seed:poprace

# Matchbox
docker compose -f docker-compose.prod.yml exec backend npm run db:seed:matchbox

# Spark Model
docker compose -f docker-compose.prod.yml exec backend npm run db:seed:spark
```

### 4. Recompilar o Frontend e reiniciar o Backend na VPS:
```bash
cd /var/www/minihubcar
docker compose -f docker-compose.prod.yml up -d --build frontend backend
```

### 4. Testar diretamente no navegador ou via curl:
```bash
curl -I https://minihubcar.com.br/catalog-media/MINIGTBRASIL/fotos/MGT00928-007E.jpg
```
Deve retornar `HTTP/2 200` e `content-type: image/jpeg`.

---

## 🏎️ Carga do Catálogo Legado e Miniaturas (8.954 HW + 455 Miniaturas de Todas as Marcas)

Para aplicar a carga completa e garantir que 100% das fotos sejam exibidas sem erro na Hostinger:

### 1. Enviar fotos e scripts para a VPS (No PowerShell do Windows):
Você pode executar o script facilitador de 1 clique:
```cmd
deploy\enviar_fotos_producao.bat
```
*(Ele solicitará o IP da sua VPS e transmitirá via SCP as fotos de `HW`, `Miniaturas`, `backend/uploads` e a pasta `deploy`).*

Ou envie manualmente via PowerShell:
```powershell
scp -r C:\Projetos\minihubcar\catalogos\HW root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/catalogos/
scp -r C:\Projetos\minihubcar\catalogos\Miniaturas root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/catalogos/
scp -r C:\Projetos\minihubcar\backend\uploads\* root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/backend/uploads/
scp -r C:\Projetos\minihubcar\deploy\* root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/deploy/
scp C:\Projetos\minihubcar\docker-compose.prod.yml root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/
scp C:\Projetos\minihubcar\backend\src\app\app.ts root@SEU_IP_DA_HOSTINGER:/var/www/minihubcar/backend/src/app/
```

### 2. Sincronizar as fotos com o container e atualizar o Backend na VPS (SSH):
Conecte-se na sua VPS (`ssh root@SEU_IP_DA_HOSTINGER`):

```bash
cd /var/www/minihubcar

# Copia as fotos enviadas para uploads diretamente para dentro do container
docker cp /var/www/minihubcar/backend/uploads/. minihub-backend:/app/backend/uploads/

# Reinicia o backend para aplicar o mapeamento inteligente de fotos e montagem de volumes
docker compose -f docker-compose.prod.yml up -d --build backend
```

### 3. Aplicar o SQL no PostgreSQL na VPS (SSH):
Execute o script atualizado com os caminhos de casing exato e fallbacks de URLs oficiais:

```bash
cd /var/www/minihubcar
docker compose -f docker-compose.prod.yml exec -T postgres psql -U minihub_admin -d minihub_car < deploy/update_catalog_complete_prod.sql
```

*(Ou se preferir executar via script Node no host da VPS):*
```bash
cd /var/www/minihubcar
node deploy/apply_catalog_prod.mjs
```

### 4. Validação Rápida via curl:
```bash
# Foto local Hot Wheels (casing exato):
curl -I https://minihubcar.com.br/catalog-media/HW/JHW68.jpg

# Foto de miniatura cadastrada:
curl -I https://minihubcar.com.br/uploads/miniatura-1776898827184-529864285.jpeg
```
Ambos devem responder com `HTTP/2 200` e `content-type: image/...`!

