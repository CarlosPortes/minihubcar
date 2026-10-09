# 🏎️ Coletor Oficial do Catálogo Majorette

Este módulo extrai o catálogo completo de miniaturas da **Majorette** a partir da [Majorette Model Cars Wiki (Fandom)](https://majorette-model-cars.fandom.com/wiki/Majorette_Model_Cars_Wiki).

---

## 📋 Seções Extraídas

O coletor varre todas as 7 seções oficiais do wiki:
1. **Year Lists:** De 1964 até 2026 (62 páginas anuais completas).
2. **Vehicles List:** Modelos organizados por montadoras oficiais (Alfa Romeo, BMW, Citroën, Ferrari, Ford, Porsche, Volkswagen, etc.).
3. **Trucks:** Caminhões e ônibus (Bernard, Kenworth, Mack, MAN, Mercedes-Benz, Renault, Scania, Volvo, etc.).
4. **Trailers:** Reboques, caravanas, barcos e carretas.
5. **Major Collections:** Street Cars, Deluxe Cars, Premium Cars, Racing Cars, Vintage Series, Tune Ups Series, Vision Gran Turismo, WRC Cars, Serie 200, Serie 300, etc.
6. **Minor Collections:** Séries temáticas e comemorativas (Coca Cola, Pepsi, Buriram United, FC Barcelona, FC Bayern München, Dallas, Color Pack, Crazy Roadsters, etc.).
7. **Gift Packs:** Conjuntos especiais, 3-Packs, 5-Packs, 9+4, Limited Editions e conjuntos de aniversário.

---

## 📸 Padronização de Fotos

- **Formato:** 100% convertidas para **`.jpg` (JPEG RGB)** em alta qualidade através do Pillow.
- **Nomenclatura:** Cada foto recebe o **código oficial da miniatura** como nome de arquivo (ex: `201C.jpg`, `204D.jpg`, `271C.jpg`).
- **Múltiplas Variações:** Se o mesmo código tiver diferentes fotos (cores/anos distintos), o coletor adiciona um índice sequencial (ex: `271C.jpg`, `271C_1.jpg`) evitando qualquer sobreposição ou perda de imagens.

---

## 🚀 Como Executar

### 1. Instalar dependências (Pillow, Requests, BeautifulSoup4)
Dê dois cliques em:
```cmd
1_instalar_dependencias.bat
```

### 2. Coletar o catálogo completo e baixar todas as fotos
Dê dois cliques em:
```cmd
2_coletar_catalogo_e_fotos.bat
```
*(Ou execute via linha de comando: `python collect_majorette_catalog.py --baixar-fotos --threads 10`)*

### 3. Coletar apenas os metadados (Somente CSV)
Dê dois cliques em:
```cmd
3_coletar_somente_csv.bat
```

---

## 💾 Estrutura do Arquivo `majorette_catalogo.csv`

| Coluna | Descrição | Exemplo |
| :--- | :--- | :--- |
| `codigo` | Código oficial da série/casting | `204D` |
| `modelo` | Nome do modelo | `Ford Mustang GT Police` |
| `montadora` | Montadora oficial | `Ford` |
| `serie` | Série ou coleção | `Deluxe Cars` |
| `ano_lancamento` | Ano de estreia do modelo | `2019` |
| `ano_catalogo` | Ano do catálogo de referência | `2024` |
| `cor` | Cor ou pintura | `Black` |
| `escala` | Escala do veículo | `1:64` |
| `secao_origem` | Seção da Wiki de onde foi extraído | `Major Collections` |
| `pagina_wiki` | Página da Wiki | `Deluxe_Cars` |
| `url_foto_original`| Link CDN da foto em alta resolução | `https://static.wikia.nocookie.net/...` |
| `arquivo_foto` | Arquivo salvo na pasta `fotos/` | `204D.jpg` |
