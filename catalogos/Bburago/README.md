# Catálogo Oficial Bburago (bburago.com)

Este módulo é responsável pela coleta, estruturação, catalogação e importação de miniaturas oficiais da tradicional fabricante italiana **Bburago** para o **MiniHubCar**.

---

## 🏎️ Visão Geral do Catálogo

A Bburago é mundialmente reconhecida pelo seu acabamento de alto nível em metal diecast e parcerias oficiais históricas com as maiores escuderias da **Fórmula 1** e montadoras lendárias de superesportivos.

### Principais Destaques do Catálogo MiniHubCar:
1. **Fórmula 1 Oficial**:
   - **Scuderia Ferrari**: SF-24, SF-23, F1-75 (Charles Leclerc & Carlos Sainz).
   - **Oracle Red Bull Racing**: RB21, RB20, RB19 (Max Verstappen & Sergio Pérez).
   - **Mercedes-AMG Petronas**: W16, W15, W14 (Lewis Hamilton, George Russell & Kimi Antonelli).
   - **McLaren Formula 1 Team**: MCL38, MCL60 (Lando Norris & Oscar Piastri).
   - **Stake F1 Team Kick Sauber / Alfa Romeo**: C43, C42 (Valtteri Bottas & Guanyu Zhou).
   - **Alpine F1 Team**: A524, A523 (Pierre Gasly & Esteban Ocon).
2. **Hipercarros & Le Mans**:
   - **Ferrari 499P**: Campeã das 24 Horas de Le Mans.
   - **Ferrari F80**: O novo supercarro marco de Maranello.
   - **Toyota Gazoo Racing GR010 Hybrid**: Hipercarro de Le Mans.
   - **Ferrari SF90XX Stradale**, **Ferrari Daytona SP3**, **Ferrari Monza SP1**, **LaFerrari**.
   - **Bugatti Chiron / Bolide / Divo**.
   - **Lamborghini Revuelto**, **Sián FKP 37**, **Huracán**, **Countach LPI 800-4**.
   - **Porsche 911 GT3 RS**, **Porsche 918 Spyder**.
3. **Escalas Oficiais**:
   - **1:18** (Modelos de alto colecionismo, portas e capô funcionais)
   - **1:24** (Street Fire, superesportivos e carros clássicos)
   - **1:43** (Fórmula 1 com cúpula acrílica/teca e base expositora)
   - **1:64** (Linha miniatura colecionável)

---

## 📊 Estatísticas Consolidadas

| Métrica | Quantidade |
| :--- | :--- |
| **Total de Miniaturas / Variações** | **178 modelos** |
| **Fotos Oficiais de Estúdio em Alta Resolução (3000x3000px)** | **178 fotos baixadas (48 MB)** |
| **Escala 1:43 (Fórmula 1 & GT)** | 59 modelos |
| **Escala 1:24 (Street & Supercars)** | 57 modelos |
| **Escala 1:18 (Colecionadores Premium)** | 46 modelos |
| **Escala 1:64 (Miniaturas Compactas)** | 9 modelos |
| **Top Montadoras** | Ferrari (81), Lamborghini (17), Red Bull (14), McLaren (14), Mercedes-Benz (13), Porsche (7), Bugatti (6) |

---

## 🚀 Como Executar no Windows (Scripts Rápidos)

| Script | Função | Destino |
| :--- | :--- | :--- |
| **`1_instalar_dependencias.bat`** | Instala as bibliotecas Python necessárias (`requests`). | Ambiente local |
| **`2_coletar_catalogo_e_fotos.bat`** | Coleta todas as 178 miniaturas e baixa as fotos oficiais em HD. | `bburago_catalogo.csv` e `fotos/` |
| **`3_coletar_somente_csv.bat`** | Atualiza apenas o arquivo de dados sem baixar fotos novamente. | `bburago_catalogo.csv` |

---

## 🗄️ Carga no Banco de Dados (PostgreSQL)

### 1. No Ambiente de Desenvolvimento Local:
```bash
cd backend
npm run db:seed:bburago
```

### 2. No Servidor de Produção (VPS):
```bash
cd /var/www/minihubcar
git pull origin main
docker compose -f docker-compose.prod.yml exec backend pnpm db:seed:bburago
```

---

## 📁 Estrutura dos Arquivos

```
catalogos/Bburago/
├── 1_instalar_dependencias.bat       # Instalação de dependências
├── 2_coletar_catalogo_e_fotos.bat     # Coleta completa + download de fotos
├── 3_coletar_somente_csv.bat          # Coleta rápida apenas do CSV
├── collect_bburago_catalog.py         # Script Python oficial
├── bburago_catalogo.csv               # Catálogo completo estruturado (UTF-8 com BOM)
├── bburago_fotos.zip                  # Pacote compactado com todas as fotos HD
├── fotos/                             # Pasta com as 178 imagens oficiais (3000x3000px)
└── README.md                          # Este documento de referência
```
