#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Coletor Mestre Oficial do Catálogo Majorette (Fandom Model Cars Wiki)
====================================================================
Extrai o catálogo completo de miniaturas da marca Majorette:
- Year Lists (1964 a 2026)
- Vehicles List (modelos por montadoras oficiais)
- Trucks (caminhões e ônibus)
- Trailers (reboques, caravanas e barcos)
- Major Collections (Street Cars, Deluxe Cars, Premium Cars, Vintage Series, etc.)
- Minor Collections (Séries especiais, Coca Cola, Buriram, etc.)
- Gift Packs (3-Packs, 5-Packs, 9+4, Limited Editions)

Funcionalidades:
- Normaliza 100% das fotos como JPG de alta resolução.
- Nomeia as fotos utilizando o código oficial da miniatura (ex: 201C.jpg).
- Evita duplicações e suporta múltiplas variações de cores/anos com sufixos únicos.
- Download concorrente multithread de alta performance.
- Gera o arquivo padronizado majorette_catalogo.csv.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CSV = BASE_DIR / "majorette_catalogo.csv"
DEFAULT_FOTOS_DIR = BASE_DIR / "fotos"

BASE_API = "https://majorette-model-cars.fandom.com/api.php"
BASE_WIKI = "https://majorette-model-cars.fandom.com/wiki"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MiniHubCar/MajoretteCollector"
    )
}

IMAGE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Referer": "https://majorette-model-cars.fandom.com/",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}

KNOWN_AUTOMAKERS = [
    ("Alfa Romeo", ["Alfa Romeo", "Alfa"]),
    ("Alpine", ["Alpine"]),
    ("Aston Martin", ["Aston Martin"]),
    ("Audi", ["Audi"]),
    ("Autobianchi", ["Autobianchi"]),
    ("Bentley", ["Bentley"]),
    ("Bernard", ["Bernard"]),
    ("BMW", ["BMW"]),
    ("Brabus", ["Brabus"]),
    ("Bugatti", ["Bugatti"]),
    ("Cadillac", ["Cadillac"]),
    ("Chevrolet", ["Chevrolet", "Chevy", "Corvette", "Camaro"]),
    ("Chrysler", ["Chrysler"]),
    ("Citroën", ["Citroen", "Citroën"]),
    ("Claas", ["Claas"]),
    ("Dacia", ["Dacia"]),
    ("Daf", ["Daf"]),
    ("Datsun", ["Datsun"]),
    ("Dodge", ["Dodge", "Viper", "Charger"]),
    ("DS Automobiles", ["DS Automobiles", "DS"]),
    ("Excalibur", ["Excalibur"]),
    ("Ferrari", ["Ferrari"]),
    ("Fiat", ["Fiat", "Abarth"]),
    ("Fliegl", ["Fliegl"]),
    ("Ford", ["Ford", "Mustang", "Bronco", "Raptor"]),
    ("GMC", ["GMC"]),
    ("Hanomag", ["Hanomag"]),
    ("Honda", ["Honda"]),
    ("Hyundai", ["Hyundai"]),
    ("Iveco", ["Iveco"]),
    ("Jaguar", ["Jaguar"]),
    ("Jeep", ["Jeep"]),
    ("Kenworth", ["Kenworth"]),
    ("KTM", ["KTM"]),
    ("Lamborghini", ["Lamborghini"]),
    ("Lancia", ["Lancia"]),
    ("Land Rover", ["Land Rover", "Range Rover", "Defender"]),
    ("Lexus", ["Lexus"]),
    ("Liebherr", ["Liebherr"]),
    ("Mack", ["Mack"]),
    ("Magirus", ["Magirus"]),
    ("MAN", ["MAN"]),
    ("Maserati", ["Maserati"]),
    ("Matra", ["Matra"]),
    ("Mazda", ["Mazda", "RX-7", "Miata"]),
    ("McLaren", ["McLaren"]),
    ("Mercedes-Benz", ["Mercedes-Benz", "Mercedes", "AMG"]),
    ("MG", ["MG"]),
    ("MINI", ["MINI", "Cooper"]),
    ("Mitsubishi", ["Mitsubishi"]),
    ("Morgan", ["Morgan"]),
    ("Nissan", ["Nissan", "GT-R", "Skyline"]),
    ("Opel", ["Opel"]),
    ("Pagani", ["Pagani"]),
    ("Peugeot", ["Peugeot"]),
    ("Plymouth", ["Plymouth"]),
    ("Poclain", ["Poclain"]),
    ("Pontiac", ["Pontiac", "Firebird"]),
    ("Porsche", ["Porsche"]),
    ("Renault", ["Renault"]),
    ("Rolls-Royce", ["Rolls-Royce", "Rolls Royce"]),
    ("Rover", ["Rover"]),
    ("Saab", ["Saab"]),
    ("Saviem", ["Saviem"]),
    ("Scania", ["Scania"]),
    ("Seat", ["Seat"]),
    ("Simca", ["Simca"]),
    ("Skoda", ["Skoda", "Škoda"]),
    ("Subaru", ["Subaru"]),
    ("Suzuki", ["Suzuki"]),
    ("Tesla", ["Tesla"]),
    ("Toyota", ["Toyota", "Supra", "Celica", "Yaris"]),
    ("Triumph", ["Triumph"]),
    ("Vauxhall", ["Vauxhall"]),
    ("Volkswagen", ["Volkswagen", "VW", "Beetle", "Golf", "Käfer", "Transporter"]),
    ("Volvo", ["Volvo"]),
]


def clean_text(text: str) -> str:
    """Limpa textos de tabelas, tags HTML e artefatos wiki."""
    if not text:
        return ""
    # Remove citações wiki como [1], [a], etc.
    t = re.sub(r"\[[^\]]*\]", "", text)
    # Remove tags HTML residuais
    t = re.sub(r"<[^>]+>", "", t)
    # Normaliza múltiplos espaços e quebras de linha
    t = re.sub(r"\s+", " ", t).strip()
    return t


def sanitize_filename(name: str) -> str:
    """Remove caracteres inválidos do Windows para nomes de arquivos."""
    name = clean_text(name)
    name = re.sub(r'[\\/*?:"<>|]', "-", name)
    name = re.sub(r"\s+", "_", name)
    name = re.sub(r"-+", "-", name)
    return name.strip("-_.")


def deduce_automaker(model: str, brand_val: str, page_title: str) -> str:
    """Deduz a montadora oficial a partir de marca, modelo ou título da página."""
    b = clean_text(brand_val)
    m = clean_text(model)
    p = clean_text(page_title)

    for official, keywords in KNOWN_AUTOMAKERS:
        for kw in keywords:
            pattern = rf"\b{re.escape(kw)}\b"
            if b and re.search(pattern, b, re.IGNORECASE):
                return official
            if re.search(pattern, m, re.IGNORECASE):
                return official
            if re.search(pattern, p, re.IGNORECASE):
                return official

    if b and b.lower() not in ["majorette", "caravans", "trailers", "boats", "trucks", "n/a", "-"]:
        return b
    return "Majorette"


def make_request(params: Dict[str, Any], retries: int = 3) -> Dict[str, Any]:
    """Executa requisição à API do MediaWiki com retentativas."""
    session = requests.Session()
    session.headers.update(HEADERS)
    for attempt in range(retries):
        try:
            r = session.get(BASE_API, params=params, timeout=35)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            if attempt == retries - 1:
                print(f"⚠️ Erro ao consultar API {params.get('page')}: {exc}")
                return {}
            time.sleep(1.5 * (attempt + 1))
    return {}


def get_high_res_photo_url(src: str) -> str:
    """Converte URL de thumbnail do Fandom para URL original de alta resolução."""
    if not src or "data:image" in src:
        return ""
    # Ex: https://static.wikia.nocookie.net/.../image.jpg/revision/latest/scale-to-width-down/100?cb=...
    url = re.sub(r"/scale-to-width-down/\d+", "", src)
    url = re.sub(r"/scale-to-height-down/\d+", "", url)
    return url


class MajoretteCollector:
    def __init__(
        self,
        output_csv: Path = DEFAULT_CSV,
        fotos_dir: Path = DEFAULT_FOTOS_DIR,
        download_photos: bool = True,
        threads: int = 8,
        section_filter: Optional[str] = None,
        max_pages: Optional[int] = None,
    ):
        self.output_csv = output_csv
        self.fotos_dir = fotos_dir
        self.download_photos = download_photos
        self.threads = threads
        self.section_filter = section_filter
        self.max_pages = max_pages

        self.fotos_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

        # Mapa de páginas a extrair: {page_id: {"name": str, "section": str}}
        self.pages_to_crawl: Dict[str, Dict[str, str]] = {}
        # Armazena registros coletados: List[Dict[str, Any]]
        self.catalog_items: List[Dict[str, Any]] = []
        # Rastreador de códigos para nomes únicos de fotos: {clean_code: count}
        self.code_photo_counter: Dict[str, int] = {}
        # Cache de URLs de fotos já mapeadas para arquivos: {url: photo_filename}
        self.photo_url_cache: Dict[str, str] = {}

    def discover_all_sections(self):
        """Descobre todas as páginas das 7 seções oficiais na Home."""
        print("🔍 [1/4] Descobrindo seções e páginas do catálogo Majorette...")
        r = make_request({"action": "parse", "page": "Majorette_Model_Cars_Wiki", "prop": "text", "format": "json"})
        html = r.get("parse", {}).get("text", {}).get("*", "")
        if not html:
            print("❌ Falha ao carregar a página principal do wiki.")
            return

        soup = BeautifulSoup(html, "html.parser")
        headers = soup.find_all(["h2", "h3"])

        sections: Dict[str, List[Tuple[str, str]]] = {}
        for h in headers:
            title = h.get_text(strip=True).replace("[]", "").strip()
            # Mapeamento normalizado das seções alvo
            canonical_section = None
            if "Year Lists" in title:
                canonical_section = "Year Lists"
            elif "Vehicles List" in title:
                canonical_section = "Vehicles List"
            elif "Trucks" in title:
                canonical_section = "Trucks"
            elif "Trailers" in title:
                canonical_section = "Trailers"
            elif "Major Collections" in title:
                canonical_section = "Major Collections"
            elif "Minor Collections" in title:
                canonical_section = "Minor Collections"
            elif "Gift Packs" in title:
                canonical_section = "Gift Packs"

            if not canonical_section:
                continue

            curr = h.next_sibling
            pages = []
            while curr:
                if curr.name in ["h2", "h3"]:
                    break
                if hasattr(curr, "find_all"):
                    for a in curr.find_all("a"):
                        href = a.get("href", "")
                        text = a.get_text(strip=True)
                        if href.startswith("/wiki/") and not href.startswith("/wiki/Special:") and text:
                            page_id = unquote(href.replace("/wiki/", ""))
                            pages.append((text, page_id))
                curr = curr.next_sibling
            if pages:
                sections[canonical_section] = pages

        # Tratamento especial de Gift Packs: expande todas as séries linkadas
        if "Gift Packs" in sections:
            print("   🎁 Mapeando Giftpacks e séries individuais...")
            gp_pages = self._discover_giftpack_subpages()
            sections["Gift Packs"] = gp_pages

        # Consolidar páginas
        for sec_name, p_list in sections.items():
            if self.section_filter and self.section_filter.lower() not in sec_name.lower():
                continue
            for text, page_id in p_list:
                if page_id not in self.pages_to_crawl:
                    self.pages_to_crawl[page_id] = {"name": text, "section": sec_name}

        print(f"✅ Total de páginas encontradas para raspagem: {len(self.pages_to_crawl)}")
        for sec_name in ["Year Lists", "Vehicles List", "Trucks", "Trailers", "Major Collections", "Minor Collections", "Gift Packs"]:
            count = sum(1 for p in self.pages_to_crawl.values() if p["section"] == sec_name)
            if count > 0:
                print(f"   • {sec_name}: {count} páginas")

    def _discover_giftpack_subpages(self) -> List[Tuple[str, str]]:
        """Extrai todas as páginas específicas de giftpacks da página índice."""
        r = make_request({"action": "parse", "page": "Giftpacks_%26_Series", "prop": "text", "format": "json"})
        html = r.get("parse", {}).get("text", {}).get("*", "")
        soup = BeautifulSoup(html, "html.parser")
        results = [("Giftpacks & Series Index", "Giftpacks_%26_Series")]
        for a in soup.find_all("a"):
            href = a.get("href", "")
            text = a.get_text(strip=True)
            if href.startswith("/wiki/") and not href.startswith("/wiki/Special:") and text:
                page_id = unquote(href.replace("/wiki/", ""))
                if "List_of" not in page_id and page_id not in [p[1] for p in results]:
                    results.append((text, page_id))
        return results

    def extract_page_data(self, page_id: str, meta: Dict[str, str]):
        """Extrai dados de todas as tabelas contidas em uma página específica."""
        r = make_request({"action": "parse", "page": page_id, "prop": "text", "format": "json"})
        html = r.get("parse", {}).get("text", {}).get("*", "")
        if not html:
            return

        soup = BeautifulSoup(html, "html.parser")
        tables = soup.find_all("table")

        for table in tables:
            th_cells = table.find_all("th")
            headers = [clean_text(th.get_text()).lower() for th in th_cells]
            if not headers:
                continue

            # Mapeamento dinâmico de colunas
            col_map = self._map_columns(headers)
            if col_map.get("model") is None and col_map.get("code") is None:
                continue

            rows = table.find_all("tr")
            for row in rows:
                td_cells = row.find_all(["td", "th"])
                # Pular cabeçalhos
                if len(td_cells) == len(th_cells) and all(c.name == "th" for c in td_cells):
                    continue

                cell_texts = [clean_text(c.get_text()) for c in td_cells]
                if not any(cell_texts):
                    continue

                # Extrai dados conforme mapeamento
                code = self._get_cell_value(cell_texts, col_map.get("code"))
                model = self._get_cell_value(cell_texts, col_map.get("model"))
                brand = self._get_cell_value(cell_texts, col_map.get("brand"))
                serie = self._get_cell_value(cell_texts, col_map.get("serie"))
                color = self._get_cell_value(cell_texts, col_map.get("color"))
                year = self._get_cell_value(cell_texts, col_map.get("year"))

                # Se não tem modelo nem código válido, descartar linha de layout
                if not model and not code:
                    continue

                # Normalização e complementação
                if not model and code:
                    model = code
                if not code and model:
                    # Gerar código a partir de padrão da série
                    code = self._fallback_code(model, meta)

                automaker = deduce_automaker(model, brand, page_id)

                # Ano do catálogo vs ano de lançamento
                cat_year = ""
                m_year = re.search(r"List_of_(\d{4})_Majorette", page_id)
                if m_year:
                    cat_year = m_year.group(1)
                if not year and cat_year:
                    year = cat_year

                if not serie:
                    if meta["section"] in ["Major Collections", "Minor Collections"]:
                        serie = meta["name"]
                    elif meta["section"] == "Trucks":
                        serie = "Trucks & Buses"
                    elif meta["section"] == "Trailers":
                        serie = "Trailers & Caravans"
                    else:
                        serie = "Majorette Mainline"

                # Extrair imagem
                img_tag = row.find("img")
                photo_url = ""
                if img_tag:
                    raw_src = img_tag.get("data-src") or img_tag.get("src") or ""
                    if "data:image" in raw_src:
                        raw_src = img_tag.get("data-src") or ""
                    photo_url = get_high_res_photo_url(raw_src)

                # Definir nome do arquivo de foto baseado no código
                photo_filename = self._assign_photo_filename(code, photo_url, year, color)

                item = {
                    "codigo": code,
                    "modelo": model,
                    "montadora": automaker,
                    "serie": serie,
                    "ano_lancamento": year,
                    "ano_catalogo": cat_year,
                    "cor": color,
                    "escala": "1:64" if not any(k in model.lower() for k in ["truck", "bus", "camion"]) else "1:64 / 1:87",
                    "secao_origem": meta["section"],
                    "pagina_wiki": page_id,
                    "url_foto_original": photo_url,
                    "arquivo_foto": photo_filename,
                }
                self.catalog_items.append(item)

    def _map_columns(self, headers: List[str]) -> Dict[str, Optional[int]]:
        """Mapeia dinamicamente os índices das colunas a partir dos cabeçalhos."""
        mapping: Dict[str, Optional[int]] = {
            "code": None,
            "model": None,
            "brand": None,
            "serie": None,
            "color": None,
            "year": None,
            "photo": None,
        }

        for idx, h in enumerate(headers):
            h_low = h.lower()
            if any(k in h_low for k in ["serie nr", "col#", "col #", "number", "ref", "no", "code"]) and mapping["code"] is None:
                mapping["code"] = idx
            elif any(k in h_low for k in ["model", "casting", "vehicle", "name"]) and mapping["model"] is None:
                mapping["model"] = idx
            elif any(k in h_low for k in ["brand", "make", "marque"]) and mapping["brand"] is None:
                mapping["brand"] = idx
            elif any(k in h_low for k in ["serie", "series", "collection"]) and mapping["serie"] is None:
                mapping["serie"] = idx
            elif any(k in h_low for k in ["color", "colour", "livery", "paint"]) and mapping["color"] is None:
                mapping["color"] = idx
            elif any(k in h_low for k in ["year", "released", "produced", "date"]) and mapping["year"] is None:
                mapping["year"] = idx
            elif any(k in h_low for k in ["photo", "image", "picture"]) and mapping["photo"] is None:
                mapping["photo"] = idx

        return mapping

    def _get_cell_value(self, cell_texts: List[str], idx: Optional[int]) -> str:
        if idx is not None and 0 <= idx < len(cell_texts):
            return cell_texts[idx]
        return ""

    def _fallback_code(self, model: str, meta: Dict[str, str]) -> str:
        """Gera um código elegante de fallback quando a linha não possui Serie Nr."""
        clean_m = sanitize_filename(model).upper()
        # Se for carro comum
        return f"MAJ-{clean_m[:12]}"

    def _assign_photo_filename(self, code: str, photo_url: str, year: str, color: str) -> str:
        """Garante que a foto receba o nome do código e não seja sobrescrita."""
        if not photo_url:
            return ""

        # Se a mesma URL já tem um arquivo atribuído, reutiliza
        if photo_url in self.photo_url_cache:
            return self.photo_url_cache[photo_url]

        clean_c = sanitize_filename(code)
        if not clean_c:
            clean_c = "MAJORETTE"

        # Primeira ocorrência do código: {codigo}.jpg
        if clean_c not in self.code_photo_counter:
            self.code_photo_counter[clean_c] = 1
            filename = f"{clean_c}.jpg"
        else:
            # Variações adicionais do mesmo código: {codigo}_{index}.jpg
            idx = self.code_photo_counter[clean_c]
            self.code_photo_counter[clean_c] += 1
            filename = f"{clean_c}_{idx}.jpg"

        self.photo_url_cache[photo_url] = filename
        return filename

    def crawl_all(self):
        """Executa a raspagem de todas as páginas mapeadas."""
        pages = list(self.pages_to_crawl.items())
        if self.max_pages:
            pages = pages[: self.max_pages]

        total = len(pages)
        print(f"\n📥 [2/4] Extraindo tabelas de {total} páginas...")

        for i, (page_id, meta) in enumerate(pages, 1):
            if i % 10 == 0 or i == total:
                print(f"   [{i}/{total}] Processando: {meta['name']} ({meta['section']}) | Miniaturas até agora: {len(self.catalog_items)}")
            try:
                self.extract_page_data(page_id, meta)
            except Exception as e:
                print(f"⚠️ Erro ao processar página {page_id}: {e}")

        print(f"✅ Extração de metadados concluída! Total de registros brutos: {len(self.catalog_items)}")

    def deduplicate_and_clean(self):
        """Remove duplicatas idênticas de modelo/ano/cor/código preservando o enriquecimento."""
        print("\n🧹 [3/4] Deduplicando e consolidando o catálogo...")
        seen = set()
        deduped = []
        for it in self.catalog_items:
            key = (
                it["codigo"].upper(),
                it["modelo"].lower(),
                it["cor"].lower(),
                it["ano_lancamento"],
                it["url_foto_original"],
            )
            if key in seen:
                continue
            seen.add(key)
            deduped.append(it)

        self.catalog_items = deduped
        print(f"✅ Catálogo consolidado: {len(self.catalog_items)} miniaturas únicas!")

        photos_with_url = sum(1 for it in self.catalog_items if it["url_foto_original"])
        print(f"📸 Total de miniaturas com fotos oficiais prontas para download: {photos_with_url}")

    def save_csv(self):
        """Salva o CSV formatado em UTF-8 com separador ponto-e-vírgula."""
        fieldnames = [
            "codigo",
            "modelo",
            "montadora",
            "serie",
            "ano_lancamento",
            "ano_catalogo",
            "cor",
            "escala",
            "secao_origem",
            "pagina_wiki",
            "url_foto_original",
            "arquivo_foto",
        ]

        with open(self.output_csv, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
            writer.writeheader()
            for it in self.catalog_items:
                writer.writerow(it)

        print(f"💾 CSV salvo com sucesso em: {self.output_csv}")

    def download_and_normalize_photos(self):
        """Baixa as fotos em paralelo e converte para JPG normalizado usando Pillow."""
        if not self.download_photos:
            print("\n⏩ Download de fotos desativado (--somente-csv).")
            return

        # Coletar fotos únicas a baixar: {filename: url}
        to_download: Dict[str, str] = {}
        for it in self.catalog_items:
            url = it.get("url_foto_original")
            filename = it.get("arquivo_foto")
            if url and filename:
                if filename not in to_download:
                    to_download[filename] = url

        total = len(to_download)
        print(f"\n🖼️  [4/4] Baixando e normalizando {total} fotos em JPG (Threads: {self.threads})...")

        sucessos = 0
        pulados = 0
        erros = 0

        def _download_task(filename: str, url: str) -> Tuple[str, bool, str]:
            out_file = self.fotos_dir / filename
            if out_file.exists() and out_file.stat().st_size > 500:
                return (filename, True, "cached")

            try:
                r = requests.get(url, headers=IMAGE_HEADERS, timeout=25)
                r.raise_for_status()
                img_bytes = r.content

                # Normalização de imagem com Pillow -> JPG RGB
                with Image.open(BytesIO(img_bytes)) as img:
                    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                        bg = Image.new("RGB", img.size, (255, 255, 255))
                        if img.mode != "RGBA":
                            img = img.convert("RGBA")
                        bg.paste(img, mask=img.split()[3])
                        img_rgb = bg
                    else:
                        img_rgb = img.convert("RGB")

                    img_rgb.save(out_file, "JPEG", quality=95, optimize=True)
                return (filename, True, "downloaded")
            except Exception as e:
                return (filename, False, str(e))

        with ThreadPoolExecutor(max_workers=self.threads) as executor:
            futures = {executor.submit(_download_task, fn, url): fn for fn, url in to_download.items()}
            for i, fut in enumerate(as_completed(futures), 1):
                fn, ok, status = fut.result()
                if ok:
                    if status == "cached":
                        pulados += 1
                    else:
                        sucessos += 1
                else:
                    erros += 1

                if i % 100 == 0 or i == total:
                    print(f"   [{i}/{total}] Fotos processadas: {sucessos} novas, {pulados} já em cache, {erros} erros")

        print(f"\n✨ Processamento de fotos concluído!")
        print(f"   • Novas fotos convertidas: {sucessos}")
        print(f"   • Fotos em cache: {pulados}")
        print(f"   • Falhas: {erros}")
        print(f"   • Diretório de fotos: {self.fotos_dir}")


def main():
    parser = argparse.ArgumentParser(description="Coletor Mestre Oficial do Catálogo Majorette (Fandom)")
    parser.add_argument("--somente-csv", action="store_true", help="Gera apenas o CSV sem baixar as fotos")
    parser.add_argument("--baixar-fotos", action="store_true", default=True, help="Baixa e normaliza as fotos em JPG")
    parser.add_argument("--threads", type=int, default=8, help="Número de threads para download concorrente (padrão: 8)")
    parser.add_argument("--secao", type=str, default=None, help="Filtra por seção específica (ex: 'Year Lists', 'Deluxe')")
    parser.add_argument("--limite-paginas", type=int, default=None, help="Limite máximo de páginas a processar (para testes)")

    args = parser.parse_args()

    download_flag = args.baixar_fotos and not args.somente_csv

    collector = MajoretteCollector(
        download_photos=download_flag,
        threads=args.threads,
        section_filter=args.secao,
        max_pages=args.limite_paginas,
    )

    start_time = time.time()
    collector.discover_all_sections()
    collector.crawl_all()
    collector.deduplicate_and_clean()
    collector.save_csv()
    collector.download_and_normalize_photos()
    duration = time.time() - start_time

    print(f"\n🏁 Processo completo finalizado em {duration:.1f} segundos!")


if __name__ == "__main__":
    main()
