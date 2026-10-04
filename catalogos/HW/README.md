# Coletor Mestre Hot Wheels - Fandom Wiki Crawler

Este módulo realiza a varredura completa do catálogo da **Hot Wheels** a partir da Wiki oficial do Fandom ([hotwheels.fandom.com](https://hotwheels.fandom.com/wiki/Hot_Wheels)).

---

## 🎯 Por que o Catálogo Anterior Estava Incompleto?

O coletor anterior realizava apenas uma busca simples (`<ano> Hot Wheels list of`) limitada a 3 páginas por ano. Isso cobria apenas a linha básica tradicional (*Mainline*) e deixava de fora:
1. **Themed Assortments / Silver Series** (ex: *AcceleRacers Series 2025*, onde está o código **`JCB92`** do casting *Iridium*).
2. **Linhas Premium** (*Car Culture*, *Boulevard*, *Pop Culture*, *Fast & Furious Premium*, *Team Transport*).
3. **Coleções Especiais Clássicas** (*Flying Colors*, *Super Chromes*, *The Hot Ones*, *Ultra Hots*, *Sizzlers*).
4. **Exclusivos para Colecionadores** (*Red Line Club - RLC*, *HotWheelsCollectors.com*, *Elite 64*).
5. **Assortimentos Sazonais** (*Batman Series*, *Neon Speeders*, *Spring*, *Winter*, *Anniversary Series*).

---

## 🚀 Como Executar no Windows

> **Destino dos Dados**: Por padrão, o CSV gerado e todas as fotos baixadas são salvos no drive **`D:\Projetos\minihubcar\hw`**:
> - Catálogo CSV: `D:\Projetos\minihubcar\hw\hw_catalogo.csv`
> - Fotos em Alta Definição: `D:\Projetos\minihubcar\hw\fotos\`
> - Checkpoint de Retomada: `D:\Projetos\minihubcar\hw\crawler_checkpoint.json`

Criamos scripts rápidos `.bat` que você pode executar com um duplo clique:

| Script | Função | Destino |
| :--- | :--- | :--- |
| **`1_instalar_dependencias.bat`** | Instala as bibliotecas Python necessárias (`requests`, `beautifulsoup4`, `pillow`). | Ambiente local |
| **`2_testar_amostra_2025_acceleracers.bat`** | Roda um teste rápido com a série do **`JCB92`** (*AcceleRacers 2025*) e lançamentos recentes para validação imediata. | `D:\Projetos\minihubcar\hw\` |
| **`3_coletar_somente_csv_completo.bat`** | Executa a varredura completa de **todos os mais de 325 links e séries** da Hot Wheels, gerando `hw_catalogo.csv`. | `D:\Projetos\minihubcar\hw\hw_catalogo.csv` |
| **`4_coletar_catalogo_e_fotos.bat`** | Executa a varredura completa salvando o CSV e baixando as fotos originais na pasta `fotos/`. | `D:\Projetos\minihubcar\hw\fotos\` |
| **`5_retomar_coleta_checkpoint.bat`** | Caso você pause com `Ctrl+C` ou a internet caia, este comando retoma exatamente de onde parou sem perder nada! | `D:\Projetos\minihubcar\hw\` |

---

## 🛠️ Comandos via Linha de Comando (Avançado)

Você também pode chamar o script Python diretamente com parâmetros flexíveis:

```bash
# 1. Coleta completa padrão
python collect_hotwheels_fandom_crawler.py --modo tudo --saida hw_catalogo.csv

# 2. Coletar apenas séries temáticas modernas e premium
python collect_hotwheels_fandom_crawler.py --secoes "Notable Modern Themed Assortments,Modern Special Series"

# 3. Filtrar por faixa de anos específicos (ex: 2024 a 2026)
python collect_hotwheels_fandom_crawler.py --anos 2024-2026

# 4. Varrer uma única página ou série avulsa
python collect_hotwheels_fandom_crawler.py --pagina "AcceleRacers Series (2025)"

# 5. Baixar fotos durante a coleta
python collect_hotwheels_fandom_crawler.py --modo tudo --baixar-fotos --fotos-dir fotos
```

---

## 📊 Estrutura do Arquivo de Saída (`hw_catalogo.csv`)

O arquivo gerado é 100% compatível com a estrutura de dados do banco do MiniHubCar:

- `codigo_hotwheels`: Código Mattel / SKU oficial (ex: `JCB92`, `HKC80`, `HRT64`).
- `descricao`: Nome do modelo / casting (ex: `Iridium`, `Nissan Skyline GT-R`).
- `cor`: Cor da carroceria / pintura.
- `linha`: Classificação (`Mainline`, `Premium`, `Themed Assortment`, `RLC`, etc.).
- `ano_lancamento`: Ano de lançamento (1968 a 2027).
- `serie`: Nome da série ou sub-série (ex: `AcceleRacers Series (2025)`, `Car Culture: Japan Historics`).
- `serie_numero`: Posição dentro da série (ex: `1/5`).
- `numero_colecao`: Número da coleção geral (ex: `123/250`).
- `url_imagem`: Link direto da imagem em alta resolução no servidor da Fandom.
- `arquivo_imagem`: Nome do arquivo local padronizado (`<codigo_hotwheels>.jpg`).
- `fonte`: `fandom`.
- `url_fonte`: URL da página na wiki para referência e auditoria.

---

## 🗄️ Carga no Banco de Dados (MiniHubCar)

Para importar o CSV gerado para o banco de dados do sistema:

```bash
# Localmente (Backend)
cd backend
npm run db:seed:hw

# Ou via comando direto no container em produção:
docker compose -f docker-compose.prod.yml exec backend npm run db:seed:hw
```
