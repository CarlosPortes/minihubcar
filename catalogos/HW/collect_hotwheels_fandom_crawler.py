#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Coletor Mestre e Crawler do Catálogo Hot Wheels via Fandom Wiki (API MediaWiki)
--------------------------------------------------------------------------------
Este script realiza a varredura completa das coleções, séries anuais, linhas temáticas
(Themed Assortments / Silver Series), linhas Premium (Car Culture, Boulevard, Pop Culture),
exclusivos (Red Line Club, Elite 64), linhas clássicas (1968-atualidade) e sub-séries.

Recursos:
- Utiliza a API MediaWiki oficial (evita bloqueios Cloudflare).
- Descoberta inteligente de sub-páginas anuais a partir de páginas "Hub" (ex: Car Culture, Boulevard).
- Parser resiliente de tabelas HTML (wikitable) com mapeamento flexível de colunas.
- Extração de imagens em alta resolução (removendo placeholders de lazy-load).
- Sistema de Checkpoint com retomada automática (--resume).
- Exportação em CSV (hw_catalogo.csv) totalmente compatível com o banco do MiniHubCar.
- Download opcional de fotos (--baixar-fotos).
"""

from __future__ import annotations

import argparse
import csv
import html
import io
import json
import logging
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, asdict, fields
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import quote, unquote, urljoin

try:
    import requests
except ImportError:
    requests = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None
    ImageOps = None

LOG = logging.getLogger("hotwheels_crawler")

DEFAULT_DESTINO_DIR = Path(r"D:\Projetos\minihubcar\hw")
API_URL = "https://hotwheels.fandom.com/api.php"
BASE_WIKI_URL = "https://hotwheels.fandom.com/wiki/"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MiniHubCarBot/2.0",
    "Accept": "application/json",
}

CABECALHO_CSV = [
    "codigo_hotwheels",
    "descricao",
    "cor",
    "linha",
    "ano_lancamento",
    "serie",
    "serie_numero",
    "numero_colecao",
    "url_imagem",
    "arquivo_imagem",
    "fonte",
    "url_fonte",
]


@dataclass
class Miniatura:
    codigo_hotwheels: str = ""
    descricao: str = ""
    cor: str = ""
    linha: str = "Mainline"
    ano_lancamento: str = ""
    serie: str = ""
    serie_numero: str = ""
    numero_colecao: str = ""
    url_imagem: str = ""
    arquivo_imagem: str = ""
    fonte: str = "fandom"
    url_fonte: str = ""

    def limpar_campos(self) -> Miniatura:
        self.codigo_hotwheels = limpar_texto(self.codigo_hotwheels).upper()
        self.descricao = limpar_texto(self.descricao)
        self.cor = limpar_texto(self.cor)
        self.linha = limpar_texto(self.linha)
        self.ano_lancamento = limpar_texto(self.ano_lancamento)
        self.serie = limpar_texto(self.serie)
        self.serie_numero = limpar_texto(self.serie_numero)
        self.numero_colecao = limpar_texto(self.numero_colecao)
        self.url_imagem = self.url_imagem.strip()
        self.url_fonte = self.url_fonte.strip()

        if not self.arquivo_imagem:
            if self.codigo_hotwheels:
                code_clean = re.sub(r"[^A-Z0-9_\-]", "", self.codigo_hotwheels)
                if code_clean:
                    self.arquivo_imagem = f"{code_clean}.jpg"
            if not self.arquivo_imagem and self.url_imagem:
                slug_base = f"{self.ano_lancamento}_{self.descricao}_{self.cor}".strip("_")
                slug = re.sub(r"[^a-zA-Z0-9_\-]+", "_", slug_base)[:50].strip("_")
                if not slug:
                    slug = "hw_model"
                import hashlib
                h = hashlib.md5(f"{self.url_imagem}_{self.chave()}".encode("utf-8")).hexdigest()[:6]
                self.arquivo_imagem = f"{slug}_{h}.jpg"
        return self

    def chave(self) -> str:
        if self.codigo_hotwheels:
            return self.codigo_hotwheels
        # Chave composta para modelos sem código Mattel
        base = f"{self.descricao}|{self.ano_lancamento}|{self.serie}|{self.cor}"
        return re.sub(r"\s+", " ", base).strip().lower()


def limpar_texto(valor: object) -> str:
    if valor is None:
        return ""
    texto = html.unescape(str(valor))
    texto = re.sub(r"\[[^\]]*\]", "", texto)          # Remove [1], [nota]
    texto = re.sub(r"<[^>]+>", "", texto)              # Remove tags HTML residuais
    texto = texto.replace("\xa0", " ")
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip(" \t\r\n|,;")


def inferir_linha(page_title: str, serie: str, descricao: str) -> str:
    alvo = f"{page_title} {serie} {descricao}".lower()
    if any(k in alvo for k in ["super treasure hunt", "sth"]):
        return "STH"
    if any(k in alvo for k in ["treasure hunt", "th "]):
        return "TH"
    if any(k in alvo for k in ["red line club", "rlc", "hotwheelscollectors"]):
        return "RLC"
    if any(k in alvo for k in ["car culture", "boulevard", "pop culture", "fast & furious premium", "team transport", "premium"]):
        return "Premium"
    if any(k in alvo for k in ["acceleracers", "batman", "neon speeders", "spring", "winter", "anniversary", "pearl and chrome", "stars & stripes", "themed", "silver series"]):
        return "Themed Assortment"
    if any(k in alvo for k in ["100%"]):
        return "100%"
    if any(k in alvo for k in ["1:18", "1:24", "1:43", "1:50"]):
        return "Larger Scale"
    if any(k in alvo for k in ["monster trucks", "monster jam"]):
        return "Monster Trucks"
    return "Mainline"


def extrair_ano(texto: str) -> str:
    m = re.search(r"\b(19\d{2}|20\d{2})\b", texto)
    return m.group(1) if m else ""


def limpar_url_imagem(raw_url: str) -> str:
    if not raw_url or raw_url.startswith("data:"):
        return ""
    # Remove sufixos de redimensionamento de thumbnail do Fandom
    # Ex: https://static.wikia.nocookie.net/.../image.jpg/revision/latest/scale-to-width-down/100?cb=...
    url = re.sub(r"/revision/latest/scale-to-width-down/\d+", "/revision/latest", raw_url)
    return url


class MediaWikiClient:
    def __init__(self, delay: float = 0.35, cache_dir: Optional[Path] = None):
        if requests is None:
            raise RuntimeError("Biblioteca 'requests' é necessária. Execute: pip install requests")
        if BeautifulSoup is None:
            raise RuntimeError("Biblioteca 'beautifulsoup4' é necessária. Execute: pip install beautifulsoup4")
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)
        self.delay = delay
        self.cache_dir = cache_dir
        self.last_call = 0.0

    def _wait(self):
        elapsed = time.monotonic() - self.last_call
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self.last_call = time.monotonic()

    def get_parsed_page(self, page_title: str) -> Dict:
        """Obtém o conteúdo parseado (HTML, links, categorias) de uma página MediaWiki."""
        cache_file = None
        if self.cache_dir:
            slug = re.sub(r"[^A-Za-z0-9._-]+", "_", page_title)[:120]
            cache_file = self.cache_dir / f"{slug}.json"
            if cache_file.exists():
                try:
                    with open(cache_file, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception:
                    pass

        self._wait()
        params = {
            "action": "parse",
            "page": page_title,
            "prop": "text|links|categories",
            "format": "json",
            "formatversion": "2"
        }
        for tentativa in range(3):
            try:
                r = self.session.get(API_URL, params=params, timeout=20)
                if r.status_code == 429:
                    time.sleep(2.0 * (tentativa + 1))
                    continue
                r.raise_for_status()
                data = r.json()
                if cache_file:
                    self.cache_dir.mkdir(parents=True, exist_ok=True)
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False)
                return data
            except Exception as e:
                if tentativa == 2:
                    LOG.error("Erro ao carregar página '%s': %s", page_title, e)
                    return {}
                time.sleep(1.0)
        return {}

    def get_category_members(self, cat_title: str, limit: int = 150) -> List[str]:
        """Obtém títulos de artigos que pertencem a uma categoria."""
        self._wait()
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": cat_title,
            "cmlimit": limit,
            "format": "json"
        }
        try:
            r = self.session.get(API_URL, params=params, timeout=20)
            data = r.json()
            members = data.get("query", {}).get("categorymembers", [])
            return [m["title"] for m in members if m.get("ns") == 0]
        except Exception as e:
            LOG.warning("Erro ao listar membros da categoria '%s': %s", cat_title, e)
            return []


class TableParser:
    """Parser avançado de tabelas wikitable para miniaturas Hot Wheels."""

    REGEX_CODIGO_MATTEL = re.compile(r"\b([A-Z]{1,3}[A-Z0-9]{2,5}\d{2,3})\b")
    REGEX_SERIE_NUM = re.compile(r"(\d{1,2}\s*/\s*\d{1,2})")

    @classmethod
    def extrair_miniaturas(cls, html_content: str, page_title: str, section_name: str) -> List[Miniatura]:
        if not html_content:
            return []

        soup = BeautifulSoup(html_content, "html.parser")
        tables = soup.find_all("table", class_="wikitable")
        if not tables:
            tables = soup.find_all("table")

        page_year = extrair_ano(page_title)
        canonical_url = BASE_WIKI_URL + quote(page_title.replace(" ", "_"))
        resultados: List[Miniatura] = []

        for table in tables:
            rows = table.find_all("tr")
            if not rows or len(rows) < 2:
                continue

            # Detecta linha de cabeçalho
            col_map = cls._identificar_colunas(rows[0])
            if not col_map or ("name" not in col_map and "toy_num" not in col_map):
                # Tenta cabeçalho na linha 1 caso a linha 0 seja título da tabela
                if len(rows) > 2:
                    col_map = cls._identificar_colunas(rows[1])
                    data_rows = rows[2:]
                else:
                    continue
            else:
                data_rows = rows[1:]

            if not col_map or ("name" not in col_map and "toy_num" not in col_map):
                continue

            for tr in data_rows:
                cells = tr.find_all(["td", "th"])
                if not cells:
                    continue

                def val(k: str) -> str:
                    idx = col_map.get(k)
                    if idx is not None and idx < len(cells):
                        return cells[idx].get_text(strip=True)
                    return ""

                desc = val("name")
                codigo = val("toy_num")
                raw_row_text = tr.get_text(" ", strip=True)

                # Busca código Mattel por regex se coluna estiver vazia ou com texto genérico
                if not codigo or len(codigo) < 3:
                    m = cls.REGEX_CODIGO_MATTEL.search(raw_row_text.upper())
                    if m:
                        codigo = m.group(1)

                if not desc and not codigo:
                    continue

                # Série e Número na Série
                serie = val("series")
                if not serie:
                    # Deriva do contexto da página ou da seção
                    if "by Series" in page_title:
                        # Tenta pegar do cabeçalho h2/h3 mais próximo
                        prev_header = tr.find_previous(["h2", "h3", "h4"])
                        if prev_header:
                            serie = prev_header.get_text(strip=True).replace("[edit]", "").strip()
                    if not serie:
                        serie = page_title.replace("List of", "").replace("Hot Wheels", "").strip()

                serie_num = val("series_num")
                if not serie_num:
                    m_sn = cls.REGEX_SERIE_NUM.search(serie) or cls.REGEX_SERIE_NUM.search(raw_row_text)
                    if m_sn:
                        serie_num = m_sn.group(1).replace(" ", "")

                # Ano
                ano = val("year") or page_year or extrair_ano(raw_row_text)
                if not ano:
                    ano = extrair_ano(page_title)

                # Imagem
                url_img = ""
                # 1. Procura primeiro na célula de foto mapeada
                if "photo" in col_map:
                    photo_idx = col_map["photo"]
                    if photo_idx < len(cells):
                        url_img = cls._extrair_url_imagem(cells[photo_idx])

                # 2. Se não achou, procura em qualquer célula da linha
                if not url_img:
                    for td in cells:
                        url_img = cls._extrair_url_imagem(td)
                        if url_img:
                            break

                linha_tipo = inferir_linha(page_title, serie, desc)

                miniatura = Miniatura(
                    codigo_hotwheels=codigo,
                    descricao=desc,
                    cor=val("color"),
                    linha=linha_tipo,
                    ano_lancamento=ano,
                    serie=serie,
                    serie_numero=serie_num,
                    numero_colecao=val("col_num"),
                    url_imagem=url_img,
                    fonte="fandom",
                    url_fonte=canonical_url,
                ).limpar_campos()

                resultados.append(miniatura)

        return resultados

    @classmethod
    def _extrair_url_imagem(cls, cell) -> str:
        """Extrai a URL original em alta definição evitando gifs base64."""
        # Tenta pegar do link envolvente <a>
        a_tag = cell.find("a", href=True)
        if a_tag and "images" in a_tag["href"] and not a_tag["href"].endswith((".php", ".html")):
            return limpar_url_imagem(a_tag["href"])

        img = cell.find("img")
        if not img:
            return ""

        # Prioriza data-src do lazy-loading
        src = img.get("data-src") or img.get("src") or ""
        return limpar_url_imagem(src)

    @staticmethod
    def _identificar_colunas(header_tr) -> Dict[str, int]:
        cells = header_tr.find_all(["th", "td"])
        col_map: Dict[str, int] = {}

        for idx, th in enumerate(cells):
            h_text = re.sub(r"\s+", " ", th.get_text(strip=True)).lower()
            h_norm = re.sub(r"[^a-z0-9]", "", h_text)

            if any(k in h_text for k in ["toy #", "toy#", "toy num", "toy no", "item #", "sku", "code"]):
                col_map.setdefault("toy_num", idx)
            elif any(k in h_text for k in ["model name", "casting name", "casting", "car name", "vehicle name", "name"]):
                col_map.setdefault("name", idx)
            elif any(k in h_text for k in ["body color", "body colour", "color", "colour", "paint"]):
                col_map.setdefault("color", idx)
            elif any(k in h_text for k in ["series #", "series no", "series num", "segment #", "no. in series"]):
                col_map.setdefault("series_num", idx)
            elif any(k in h_text for k in ["series", "segment", "sub-series", "assortment"]):
                col_map.setdefault("serie", idx)
            elif any(k in h_text for k in ["col #", "col.#", "col. no", "collector #", "coll #"]):
                col_map.setdefault("col_num", idx)
            elif any(k in h_text for k in ["wheel type", "wheels", "wheel"]):
                col_map.setdefault("wheel", idx)
            elif any(k in h_text for k in ["year", "ano"]):
                col_map.setdefault("year", idx)
            elif any(k in h_text for k in ["photo", "image", "loose", "carded"]):
                col_map.setdefault("photo", idx)

        return col_map


class CheckpointManager:
    """Gerencia checkpoints para permitir pausar e retomar a varredura."""

    def __init__(self, path: Path):
        self.path = path
        self.dados = {
            "processed_pages": {},
            "discovered_subpages": [],
            "stats": {"total_collected": 0, "unique_collected": 0}
        }
        self.carregar()

    def carregar(self):
        if self.path.exists():
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    self.dados = json.load(f)
            except Exception as e:
                LOG.warning("Erro ao carregar checkpoint existente: %s", e)

    def salvar(self):
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temp = self.path.with_suffix(".tmp")
            with open(temp, "w", encoding="utf-8") as f:
                json.dump(self.dados, f, indent=2, ensure_ascii=False)
            temp.replace(self.path)
        except Exception as e:
            LOG.error("Erro ao salvar checkpoint: %s", e)

    def ja_processada(self, page_title: str) -> bool:
        return self.dados["processed_pages"].get(page_title, {}).get("status") == "done"

    def marcar_concluida(self, page_title: str, count: int):
        self.dados["processed_pages"][page_title] = {
            "status": "done",
            "items_count": count,
            "timestamp": time.time()
        }
        self.salvar()


class HotWheelsCrawler:
    """Orquestrador da varredura completa da Fandom Wiki."""

    def __init__(
        self,
        seed_file: Path,
        output_csv: Path,
        checkpoint_file: Path,
        fotos_dir: Optional[Path] = None,
        baixar_fotos: bool = False,
        delay: float = 0.35,
        cache_dir: Optional[Path] = None,
        descobrir_subpaginas: bool = True
    ):
        self.seed_file = seed_file
        self.output_csv = output_csv
        self.fotos_dir = fotos_dir
        self.baixar_fotos = baixar_fotos
        self.descobrir_subpaginas = descobrir_subpaginas

        self.client = MediaWikiClient(delay=delay, cache_dir=cache_dir)
        self.checkpoint = CheckpointManager(checkpoint_file)
        self.itens_coletados: Dict[str, Miniatura] = {}
        self._carregar_csv_existente()

    def _carregar_csv_existente(self):
        """Carrega dados já gravados no CSV de saída para mesclagem contínua."""
        if not self.output_csv.exists():
            return
        try:
            with open(self.output_csv, "r", encoding="utf-8-sig") as f:
                # Detecta delimitador (, ou ;)
                amostra = f.read(2048)
                delim = ";" if ";" in amostra else ","
                f.seek(0)
                leitor = csv.DictReader(f, delimiter=delim)
                for row in leitor:
                    item = Miniatura(
                        codigo_hotwheels=row.get("codigo_hotwheels", ""),
                        descricao=row.get("descricao", ""),
                        cor=row.get("cor", ""),
                        linha=row.get("linha", "Mainline"),
                        ano_lancamento=row.get("ano_lancamento", ""),
                        serie=row.get("serie", ""),
                        serie_numero=row.get("serie_numero", ""),
                        numero_colecao=row.get("numero_colecao", ""),
                        url_imagem=row.get("url_imagem", ""),
                        arquivo_imagem=row.get("arquivo_imagem", ""),
                        fonte=row.get("fonte", "fandom"),
                        url_fonte=row.get("url_fonte", ""),
                    ).limpar_campos()
                    self.itens_coletados[item.chave()] = item
            LOG.info("Carregados %d itens existentes do CSV '%s'.", len(self.itens_coletados), self.output_csv.name)
        except Exception as e:
            LOG.warning("Não foi possível carregar CSV existente: %s", e)

    def salvar_csv(self):
        """Grava todos os itens deduplicados no formato CSV canônico do MiniHubCar."""
        self.output_csv.parent.mkdir(parents=True, exist_ok=True)
        itens_ordenados = sorted(
            self.itens_coletados.values(),
            key=lambda m: (m.ano_lancamento or "9999", m.serie, m.codigo_hotwheels or m.descricao)
        )
        temp_csv = self.output_csv.with_suffix(".tmp")
        with open(temp_csv, "w", newline="", encoding="utf-8-sig") as f:
            # Mantém formato padrão compatível com o seeder do MiniHubCar
            escritor = csv.DictWriter(f, fieldnames=CABECALHO_CSV, delimiter=";")
            escritor.writeheader()
            for item in itens_ordenados:
                escritor.writerow(asdict(item))
        temp_csv.replace(self.output_csv)
        LOG.info("💾 CSV consolidado atualizado: %d miniaturas gravadas em '%s'.", len(itens_ordenados), self.output_csv.name)

    def executar(
        self,
        secoes_alvo: Optional[List[str]] = None,
        anos_filtro: Optional[Set[int]] = None,
        pagina_avulsa: Optional[str] = None,
        resume: bool = True
    ):
        """Executa a rotina de varredura conforme parâmetros fornecidos."""
        fila_paginas: List[Tuple[str, str]] = []  # (page_title, section_name)

        if pagina_avulsa:
            fila_paginas.append((pagina_avulsa, "Manual"))
        else:
            if not self.seed_file.exists():
                raise FileNotFoundError(f"Arquivo seed não encontrado: {self.seed_file}")
            with open(self.seed_file, "r", encoding="utf-8") as f:
                seed_data = json.load(f)

            for sec, items in seed_data.items():
                if secoes_alvo and sec not in secoes_alvo and "all" not in secoes_alvo and "tudo" not in secoes_alvo:
                    continue
                for it in items:
                    title = it["page_title"]
                    # Filtro de ano se aplicável
                    if anos_filtro:
                        ano = extrair_ano(title)
                        if ano and int(ano) not in anos_filtro:
                            continue
                    fila_paginas.append((title, sec))

        LOG.info("🚀 Iniciando varredura com %d páginas na fila inicial...", len(fila_paginas))
        processadas = 0
        paginas_vistas: Set[str] = set()

        idx = 0
        while idx < len(fila_paginas):
            page_title, sec_name = fila_paginas[idx]
            idx += 1

            if page_title in paginas_vistas:
                continue
            paginas_vistas.add(page_title)

            if resume and self.checkpoint.ja_processada(page_title):
                LOG.debug("⏩ Pulando (já processada): %s", page_title)
                continue

            LOG.info("[%d/%d] 🔍 Processando: '%s' (Seção: %s)...", idx, len(fila_paginas), page_title, sec_name)
            data = self.client.get_parsed_page(page_title)
            parse_info = data.get("parse", {})
            html_text = parse_info.get("text", "")

            if not html_text:
                LOG.warning("Página vazia ou inexistente: %s", page_title)
                self.checkpoint.marcar_concluida(page_title, 0)
                continue

            # 1. Extração de miniaturas da página atual
            novas = TableParser.extrair_miniaturas(html_text, page_title, sec_name)
            for m in novas:
                chave = m.chave()
                if chave not in self.itens_coletados:
                    self.itens_coletados[chave] = m
                else:
                    # Complementa dados que estavam vazios
                    existente = self.itens_coletados[chave]
                    for f in fields(Miniatura):
                        if not getattr(existente, f.name) and getattr(m, f.name):
                            setattr(existente, f.name, getattr(m, f.name))

            LOG.info("   -> Extraídas %d miniaturas de '%s' (Total acumulado: %d)", len(novas), page_title, len(self.itens_coletados))
            self.checkpoint.marcar_concluida(page_title, len(novas))
            processadas += 1

            # Baixa fotos incrementalmente para as miniaturas recém-descobertas nesta página
            if self.baixar_fotos and self.fotos_dir and novas:
                self._baixar_fotos_lote(novas)

            # 2. Descoberta inteligente de sub-páginas para páginas Hubs
            if self.descobrir_subpaginas:
                subpaginas = self._descobrir_subpaginas(page_title, parse_info)
                for sp in subpaginas:
                    if sp not in paginas_vistas:
                        fila_paginas.append((sp, f"{sec_name} (Sub-page)"))

            # Salva checkpoint e atualiza CSV periodicamente a cada 5 páginas
            if processadas % 5 == 0:
                self.salvar_csv()

        # Salva consolidado final
        self.salvar_csv()
        LOG.info("🎉 Varredura de páginas concluída! Total de miniaturas únicas coletadas: %d", len(self.itens_coletados))

        # Garante integridade de todas as fotos baixadas no final (em varredura ampla)
        if self.baixar_fotos and self.fotos_dir and not pagina_avulsa:
            self._baixar_fotos()

    def _descobrir_subpaginas(self, page_title: str, parse_info: Dict) -> List[str]:
        """Identifica sub-páginas anuais a partir de Navboxes e links internos da página."""
        descobertas = []
        links = [l["title"] for l in parse_info.get("links", []) if l.get("ns") == 0]

        # Se for uma categoria, busca todos os membros
        if page_title.startswith("Category:"):
            return self.client.get_category_members(page_title)

        # Regras para Hubs conhecidos
        termos_hub = [
            "Boulevard", "Car Culture", "AcceleRacers", "Pop Culture",
            "Fast & Furious", "Flying Customs", "The Hot Ones", "Ultra Hots",
            "Vintage Racing", "Team Transport", "Red Line Club", "Elite 64"
        ]
        eh_hub = any(t.lower() in page_title.lower() for t in termos_hub)

        if eh_hub:
            for l in links:
                # Sub-páginas com anos (ex: "2024 Car Culture", "AcceleRacers Series (2025)", "2020 Hot Wheels Boulevard")
                if re.search(r"\b(19\d{2}|20\d{2})\b", l):
                    if any(t.lower() in l.lower() for t in termos_hub):
                        descobertas.append(l)
                elif "Series (" in l:
                    descobertas.append(l)

        return list(dict.fromkeys(descobertas))

    def _baixar_uma_foto(self, item: Miniatura) -> bool:
        """Baixa e salva um arquivo de foto individual em self.fotos_dir de forma resiliente."""
        if not self.fotos_dir or not item.url_imagem or not item.arquivo_imagem:
            return False
        destino = self.fotos_dir / item.arquivo_imagem
        if destino.exists() and destino.stat().st_size > 1000:
            return True

        conteudo: Optional[bytes] = None

        # 1. Tentativa via curl.exe nativo do Windows (evita TLS fingerprint block 403 do Cloudflare)
        try:
            cmd = [
                "curl.exe", "-s", "-L",
                "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "-H", "Referer: https://hotwheels.fandom.com/",
                item.url_imagem
            ]
            res = subprocess.run(cmd, capture_output=True, timeout=20)
            if res.returncode == 0 and len(res.stdout) > 1000 and not res.stdout.startswith(b"<!DOCTYPE"):
                conteudo = res.stdout
        except Exception:
            pass

        # 2. Fallback via session requests
        if not conteudo:
            try:
                self.client._wait()
                r = self.client.session.get(
                    item.url_imagem,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": "https://hotwheels.fandom.com/",
                    },
                    timeout=20
                )
                if r.status_code == 200 and len(r.content) > 1000 and not r.content.startswith(b"<!DOCTYPE"):
                    conteudo = r.content
            except Exception as e:
                LOG.debug("Falha requests ao baixar imagem %s: %s", item.url_imagem, e)

        if not conteudo:
            return False

        destino.parent.mkdir(parents=True, exist_ok=True)

        # 3. Normalização e conversão com PIL para JPEG padrão de alta fidelidade
        if Image is not None and ImageOps is not None:
            try:
                with Image.open(io.BytesIO(conteudo)) as raw_img:
                    img = ImageOps.exif_transpose(raw_img)
                    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                        rgba = img.convert("RGBA")
                        bg = Image.new("RGB", rgba.size, (255, 255, 255))
                        bg.paste(rgba, mask=rgba.getchannel("A"))
                        img = bg
                    else:
                        img = img.convert("RGB")
                    img.save(destino, format="JPEG", quality=92, optimize=True)
                    return True
            except Exception as e:
                LOG.debug("Aviso conversão PIL para %s: %s", destino.name, e)

        # Fallback de gravação binária direta
        destino.write_bytes(conteudo)
        return True

    def _baixar_fotos_lote(self, itens: List[Miniatura]):
        """Baixa as fotos de uma lista de miniaturas recém-extraídas."""
        if not self.fotos_dir:
            return
        self.fotos_dir.mkdir(parents=True, exist_ok=True)
        baixadas = 0
        for item in itens:
            if self._baixar_uma_foto(item):
                baixadas += 1
        if baixadas:
            LOG.info("   📸 Fotos salvas/verificadas: %d em '%s'", baixadas, self.fotos_dir)

    def _baixar_fotos(self):
        """Varre todos os itens coletados e garante que todas as fotos foram baixadas."""
        if not self.fotos_dir:
            return
        self.fotos_dir.mkdir(parents=True, exist_ok=True)
        LOG.info("📸 Verificando integridade e download de fotos em '%s'...", self.fotos_dir)
        total = len(self.itens_coletados)
        ok = 0
        falhas = 0

        for idx, item in enumerate(self.itens_coletados.values()):
            if not item.url_imagem or not item.arquivo_imagem:
                continue
            if self._baixar_uma_foto(item):
                ok += 1
            else:
                falhas += 1

            if (idx + 1) % 50 == 0:
                LOG.info("Fotos baixadas: %d com sucesso, %d falhas (progresso: %d/%d)", ok, falhas, idx + 1, total)

        LOG.info("📸 Concluído download de fotos: %d baixadas/existentes em '%s', %d falhas.", ok, self.fotos_dir, falhas)


def parse_anos_args(expr: str) -> Set[int]:
    anos: Set[int] = set()
    for parte in expr.split(","):
        parte = parte.strip()
        if "-" in parte:
            ini, fim = parte.split("-", 1)
            anos.update(range(int(ini), int(fim) + 1))
        elif parte:
            anos.add(int(parte))
    return anos


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Coletor Fandom Hot Wheels - Varredura Completa do Catálogo"
    )
    parser.add_argument("--modo", default="tudo", choices=["tudo", "amostra", "secoes", "pagina"],
                        help="Modo de operação: 'tudo' (todas as coleções), 'amostra' (teste 2024-2025 + AcceleRacers), 'secoes', ou 'pagina'")
    parser.add_argument("--secoes", default="all", help="Nomes das seções a varrer separadas por vírgula")
    parser.add_argument("--pagina", default="", help="Título de uma página específica no wiki")
    parser.add_argument("--anos", default="", help="Filtro de anos (ex: 2024-2026)")
    parser.add_argument("--destino-dir", default=str(DEFAULT_DESTINO_DIR),
                        help="Diretório base onde salvar o CSV, fotos, checkpoint e cache (padrão: D:\\Projetos\\minihubcar\\hw)")
    parser.add_argument("--saida", default="hw_catalogo.csv", help="Nome ou caminho do CSV de saída")
    parser.add_argument("--seed", default="fandom_seed_pages.json", help="Arquivo JSON de seed das páginas")
    parser.add_argument("--checkpoint", default="crawler_checkpoint.json", help="Arquivo de checkpoint")
    parser.add_argument("--baixar-fotos", action="store_true", help="Baixa fotos das miniaturas")
    parser.add_argument("--fotos-dir", default="fotos", help="Diretório onde salvar as fotos")
    parser.add_argument("--delay", type=float, default=0.35, help="Intervalo em segundos entre chamadas à API")
    parser.add_argument("--cache-dir", default="cache", help="Diretório de cache local da API")
    parser.add_argument("--no-cache", action="store_true", help="Desativa cache em disco")
    parser.add_argument("--reset-checkpoint", action="store_true", help="Apaga checkpoint anterior")
    parser.add_argument("-v", "--verbose", action="store_true", help="Modo verboso de log")

    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S"
    )

    base_dir = Path(__file__).resolve().parent

    # Diretório de destino principal (D:\Projetos\minihubcar\hw)
    destino_base = Path(args.destino_dir)
    try:
        destino_base.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        LOG.warning("Não foi possível criar '%s', usando diretório local: %s", destino_base, e)
        destino_base = base_dir

    seed_path = base_dir / args.seed if not Path(args.seed).is_absolute() else Path(args.seed)
    output_path = Path(args.saida) if Path(args.saida).is_absolute() else (destino_base / args.saida)
    chk_path = Path(args.checkpoint) if Path(args.checkpoint).is_absolute() else (destino_base / args.checkpoint)
    if not args.fotos_dir or args.fotos_dir == ".":
        fotos_path = destino_base
    elif Path(args.fotos_dir).is_absolute():
        fotos_path = Path(args.fotos_dir)
    else:
        fotos_path = destino_base / args.fotos_dir
    cache_path = ((Path(args.cache_dir) if Path(args.cache_dir).is_absolute() else (destino_base / args.cache_dir))) if not args.no_cache else None

    # Se o CSV de destino ainda não existir em D:, mas existir localmente, importa os dados iniciais
    local_csv = base_dir / "hw_catalogo.csv"
    if not output_path.exists() and local_csv.exists() and local_csv.resolve() != output_path.resolve():
        try:
            import shutil
            shutil.copy2(local_csv, output_path)
            LOG.info("📋 Copiado CSV base inicial (%s) para: %s", local_csv.name, output_path)
        except Exception as e:
            LOG.debug("Aviso cópia CSV inicial: %s", e)

    # Se o checkpoint de destino ainda não existir em D:, mas existir localmente, copia
    local_chk = base_dir / "crawler_checkpoint.json"
    if not chk_path.exists() and local_chk.exists() and local_chk.resolve() != chk_path.resolve():
        try:
            import shutil
            shutil.copy2(local_chk, chk_path)
            LOG.info("📋 Copiado checkpoint inicial (%s) para: %s", local_chk.name, chk_path)
        except Exception as e:
            LOG.debug("Aviso cópia checkpoint inicial: %s", e)

    LOG.info("📁 Destino configurado:")
    LOG.info("   CSV Catalogo : %s", output_path)
    LOG.info("   Fotos        : %s", fotos_path)
    LOG.info("   Checkpoint   : %s", chk_path)
    if cache_path:
        LOG.info("   Cache API    : %s", cache_path)

    if args.reset_checkpoint and chk_path.exists():
        chk_path.unlink()
        LOG.info("Checkpoint anterior removido.")

    descobrir = (not bool(args.pagina)) and (args.modo != "amostra")
    crawler = HotWheelsCrawler(
        seed_file=seed_path,
        output_csv=output_path,
        checkpoint_file=chk_path,
        fotos_dir=fotos_path,
        baixar_fotos=args.baixar_fotos,
        delay=args.delay,
        cache_dir=cache_path,
        descobrir_subpaginas=descobrir
    )

    anos_filtro = parse_anos_args(args.anos) if args.anos else None

    if args.modo == "amostra":
        LOG.info("🧪 Modo Amostra: Coletando AcceleRacers Series (2025) e lançamentos de 2024-2025...")
        # Testa a página do JCB92 solicitada pelo usuário e amostras recentes
        paginas_amostra = [
            "AcceleRacers Series (2025)",
            "2024 Hot Wheels Boulevard",
            "2024 Car Culture",
            "List of 2025 Hot Wheels (by Series)"
        ]
        for p in paginas_amostra:
            crawler.executar(pagina_avulsa=p, resume=False)
        return 0

    if args.pagina:
        crawler.executar(pagina_avulsa=args.pagina, resume=False)
        return 0

    secoes = [s.strip() for s in args.secoes.split(",")] if args.secoes != "all" else None
    crawler.executar(secoes_alvo=secoes, anos_filtro=anos_filtro, resume=not args.reset_checkpoint)
    return 0


if __name__ == "__main__":
    sys.exit(main())
