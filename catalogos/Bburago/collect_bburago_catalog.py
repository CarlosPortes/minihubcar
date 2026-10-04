#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Coletor Mestre Oficial do Catálogo Bburago
==========================================
Extrai o catálogo completo de miniaturas oficiais da Bburago (bburago.com):
- Modelos: Ferrari, Red Bull Racing F1, Mercedes-AMG F1, McLaren F1,
  Lamborghini, Porsche, Bugatti, Toyota Hypercar Le Mans, etc.
- Escalas: 1:18, 1:24, 1:32, 1:43 e 1:64
- Séries: Signature Series, Race & F1 Series, Ferrari Race & Play, Street Fire,
  Plus Series, Model Kit, Exclusive Series
- Códigos SKU oficiais (ex: 18-16930, 18-38176A, 18-26034)
- Pilotos oficiais F1 (Verstappen, Hamilton, Leclerc, Sainz, Antonelli, Norris, Piastri)
- Fotos oficiais de estúdio em altíssima resolução (Shopify CDN 3000x3000px)
- Suporte a download multithreaded de imagens locais
- Gera o arquivo padronizado: bburago_catalogo.csv
"""

import os
import sys
import csv
import json
import re
import time
import argparse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_CSV = BASE_DIR / "bburago_catalogo.csv"
DEFAULT_FOTOS_DIR = BASE_DIR / "fotos"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MiniHubCar/2.0"
    ),
    "Accept": "application/json"
}

KNOWN_AUTOMAKERS = [
    ("Ferrari", ["Ferrari", "Scuderia Ferrari", "LaFerrari", "F80", "SF-24", "SF-23", "488", "499P", "SF90"]),
    ("Red Bull Racing", ["Red Bull", "Oracle Red Bull", "Red Bull Racing", "RedBull"]),
    ("Mercedes-Benz", ["Mercedes-AMG", "Mercedes", "Mercedes Benz", "Petronas"]),
    ("McLaren", ["McLaren"]),
    ("Lamborghini", ["Lamborghini"]),
    ("Porsche", ["Porsche"]),
    ("Bugatti", ["Bugatti"]),
    ("Toyota", ["Toyota", "GR010", "GR Supra", "Gazoo"]),
    ("Jaguar", ["Jaguar", "E-type"]),
    ("Renault", ["Renault"]),
    ("MINI", ["MINI", "Cooper"]),
    ("Alpine", ["Alpine"]),
    ("Alfa Romeo", ["Alfa Romeo", "Stake F1", "Giulietta"]),
    ("Aston Martin", ["Aston Martin", "AMR"]),
    ("BMW", ["BMW"]),
    ("Jeep", ["Jeep"]),
    ("Land Rover", ["Land Rover", "Range Rover"]),
    ("Maserati", ["Maserati"]),
    ("Audi", ["Audi"]),
    ("Ford", ["Ford"]),
    ("Chevrolet", ["Chevrolet", "Corvette", "Camaro"]),
    ("Nissan", ["Nissan", "GT-R"]),
    ("Volkswagen", ["Volkswagen", "VW"]),
    ("Fiat", ["Fiat", "Abarth"]),
    ("Ducati", ["Ducati"]),
]

KNOWN_DRIVERS = [
    ("Max Verstappen", [r"\bVerstappen\b", r"\b#1\b"]),
    ("Sergio Perez", [r"\bPerez\b", r"\b#11\b"]),
    ("Lewis Hamilton", [r"\bHamilton\b", r"\b#44\b"]),
    ("George Russell", [r"\bRussell\b", r"\b#63\b"]),
    ("Charles Leclerc", [r"\bLeclerc\b", r"\b#16\b"]),
    ("Carlos Sainz", [r"\bSainz\b", r"\b#55\b"]),
    ("Lando Norris", [r"\bNorris\b", r"\b#4\b"]),
    ("Oscar Piastri", [r"\bPiastri\b", r"\b#81\b"]),
    ("Kimi Antonelli", [r"\bAntonelli\b", r"\b#12\b"]),
    ("Pierre Gasly", [r"\bGasly\b", r"\b#10\b"]),
    ("Esteban Ocon", [r"\bOcon\b", r"\b#31\b"]),
    ("Fernando Alonso", [r"\bAlonso\b", r"\b#14\b"]),
    ("Valtteri Bottas", [r"\bBottas\b", r"\b#77\b"]),
    ("Guanyu Zhou", [r"\bZhou\b", r"\b#24\b"]),
    ("Ayrton Senna", [r"\bSenna\b"]),
    ("Michael Schumacher", [r"\bSchumacher\b"]),
    ("Sebastien Buemi", [r"\bBuemi\b"]),
    ("Kamui Kobayashi", [r"\bKobayashi\b"]),
    ("Nyck de Vries", [r"\bde Vries\b"]),
]

def clean_text(text: str) -> str:
    """Corrige artefatos de codificação unicode da loja da Bburago."""
    if not text:
        return ""
    # Tratar caracteres com falha de decodificação na origem da Bburago
    t = text.replace("\ufffd", "'")
    t = re.sub(r"(\w)\s*'\s*s\b", r"\1's", t)
    t = re.sub(r"\s*[\u2013\u2014]\s*", " - ", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

def detect_automaker(title: str, tags: list) -> str:
    full_text = f"{title} {' '.join(tags)}".lower()
    for name, aliases in KNOWN_AUTOMAKERS:
        for alias in aliases:
            if re.search(r'\b' + re.escape(alias.lower()) + r'\b', full_text):
                return name
    return "Outro"

def detect_scale(product: dict) -> str:
    title = product.get("title", "")
    for v in product.get("variants", []):
        opt = v.get("option1") or ""
        if "1:" in opt or "1/" in opt:
            m = re.search(r'1[:/]\d+', opt)
            if m:
                return m.group(0).replace("/", ":")
    m = re.search(r'1[:/]\d+', title)
    if m:
        return m.group(0).replace("/", ":")
    return "1:43"

def detect_color(tags: list, title: str) -> str:
    for t in tags:
        if t.startswith("color_group:"):
            return clean_text(t.split(":", 1)[1]).title()
    colors = [
        "Rosso Corsa", "Matte Black", "Gloss Black", "Black", "Red", "Yellow",
        "Giallo", "White", "Bianco", "Blue", "Blu", "Silver", "Argento",
        "Green", "Verde", "Orange", "Arancio", "Grey", "Grigio"
    ]
    for c in colors:
        if re.search(r'\b' + re.escape(c) + r'\b', title, re.IGNORECASE):
            return c.title()
    return "Padrão Oficial"

def detect_series(title: str, tags: list) -> str:
    tags_str = " ".join(tags).lower()
    title_lower = title.lower()
    if "signature" in title_lower or "signature" in tags_str:
        return "Signature Series"
    if "model kit" in title_lower or "kit" in tags_str:
        return "Model Kit"
    if "exclusive" in title_lower or "web exclusive" in tags_str:
        return "Exclusive Series"
    if "f1" in title_lower or "formula 1" in title_lower or "racing" in title_lower:
        return "Race & F1 Series"
    if "race & play" in title_lower or "ferrari-race-play" in tags_str:
        return "Ferrari Race & Play"
    if "plus" in title_lower:
        return "Plus Series"
    if "street fire" in title_lower:
        return "Street Fire"
    return "Bburago Diecast"

def detect_driver(full_text: str) -> str:
    for name, patterns in KNOWN_DRIVERS:
        for pat in patterns:
            if re.search(pat, full_text, re.IGNORECASE):
                return name
    return ""

def detect_year(title: str, body: str) -> str:
    m = re.search(r'\b(19\d\d|20\d\d)\b', title)
    if m:
        return m.group(1)
    m = re.search(r'\b(19\d\d|20\d\d)\b', body)
    if m:
        return m.group(1)
    return "2024"

def clean_model_name(title: str, automaker: str, scale: str) -> str:
    cleaned = clean_text(title)
    # Remove escala
    cleaned = re.sub(r'1[:/]\d+', '', cleaned)
    # Remove prefixos e sufixos de marketing
    cleaned = re.sub(r'\b(WEB EXCLUSIVE|Exclusive Series|Signature Series|Diecast|Scale|Scala)\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'[\-\–\|]', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def fetch_all_products() -> list:
    """Busca produtos de múltiplos endpoints para garantir cobertura 100%."""
    print("📡 Conectando à API Oficial da Bburago...")
    products_by_id = {}

    endpoints = [
        "https://www.bburago.com/products.json?limit=250",
        "https://www.bburago.com/collections/vedi-tutti/products.json?limit=250",
        "https://www.bburago.com/en-es/collections/vedi-tutti/products.json?limit=250",
    ]

    for url in endpoints:
        try:
            res = requests.get(url, headers=HEADERS, timeout=25)
            if res.status_code == 200:
                data = res.json()
                for p in data.get("products", []):
                    products_by_id[p["id"]] = p
            elif res.status_code == 429:
                print("⏳ Rate limit temporário. Aguardando 5s...")
                time.sleep(5)
        except Exception as e:
            print(f"⚠️ Aviso na busca {url}: {e}")

    items = list(products_by_id.values())
    print(f"📦 Total de miniaturas oficiais catalogadas: {len(items)}")
    return items

def download_single_image(url: str, dest_path: Path) -> bool:
    if dest_path.exists() and dest_path.stat().st_size > 5000:
        return True
    for attempt in range(3):
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            if r.status_code == 200 and len(r.content) > 1000:
                dest_path.write_bytes(r.content)
                return True
            time.sleep(1)
        except Exception:
            time.sleep(1.5)
    return False

def collect_bburago(output_csv: Path, baixar_fotos: bool = False, fotos_dir: Path = DEFAULT_FOTOS_DIR, threads: int = 6):
    products = fetch_all_products()
    if not products:
        print("❌ Nenhum produto encontrado.")
        return False

    if baixar_fotos:
        fotos_dir.mkdir(parents=True, exist_ok=True)
        print(f"📸 Pasta de fotos locais pronta: {fotos_dir}")

    csv_rows = []
    download_tasks = []

    for p in products:
        title = clean_text(p.get("title", ""))
        body_html = p.get("body_html", "")
        tags = [clean_text(t) for t in p.get("tags", [])]
        handle = p.get("handle", "")
        images = p.get("images", [])
        variants = p.get("variants", [])

        automaker = detect_automaker(title, tags)
        scale = detect_scale(p)
        color = detect_color(tags, title)
        series_name = detect_series(title, tags)
        model_name = clean_model_name(title, automaker, scale)
        desc_clean = clean_text(body_html)
        full_text = f"{title} {' '.join(tags)} {desc_clean}"
        driver = detect_driver(full_text)
        year = detect_year(title, desc_clean)

        img_urls = [img.get("src", "") for img in images if img.get("src")]
        primary_image = img_urls[0] if img_urls else ""
        gallery_images = ";".join(img_urls[1:]) if len(img_urls) > 1 else ""

        for v in variants:
            raw_sku = (v.get("sku") or "").strip()
            if not raw_sku:
                raw_sku = f"BB-{p.get('id')}"
            
            sku_safe = re.sub(r'[\/\\:\*\?"<>\|]', '_', raw_sku)
            arquivo_imagem = f"bburago_{sku_safe}.jpg" if primary_image else ""

            if baixar_fotos and primary_image:
                dest_photo = fotos_dir / arquivo_imagem
                download_tasks.append((primary_image, dest_photo))

            row = {
                "sku": raw_sku,
                "titulo": title,
                "montadora": automaker,
                "modelo": model_name,
                "escala": scale,
                "serie": series_name,
                "cor": color,
                "ano_modelo": year,
                "piloto": driver,
                "preco_eur": v.get("price", "0.00"),
                "url_imagem_principal": primary_image,
                "arquivo_imagem": arquivo_imagem,
                "galeria_imagens": gallery_images,
                "total_fotos": len(img_urls),
                "url_produto": f"https://www.bburago.com/products/{handle}",
                "descricao": desc_clean[:600],
            }
            csv_rows.append(row)

    # Escrever CSV
    fields = [
        "sku", "titulo", "montadora", "modelo", "escala",
        "serie", "cor", "ano_modelo", "piloto", "preco_eur",
        "url_imagem_principal", "arquivo_imagem", "galeria_imagens",
        "total_fotos", "url_produto", "descricao"
    ]

    with open(output_csv, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, delimiter=";")
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"\n🎉 Catálogo Bburago salvo com sucesso em:\n   {output_csv}")
    print(f"📊 Total de registros salvos: {len(csv_rows)} miniaturas.")

    # Baixar fotos se solicitado
    if baixar_fotos and download_tasks:
        print(f"\n🚀 Baixando {len(download_tasks)} fotos de estúdio oficiais em alta definição ({threads} threads)...")
        success_count = 0
        with ThreadPoolExecutor(max_workers=threads) as executor:
            future_to_file = {executor.submit(download_single_image, url, dest): dest for url, dest in download_tasks}
            for future in as_completed(future_to_file):
                if future.result():
                    success_count += 1
                sys.stdout.write(f"\r📥 Fotos baixadas: {success_count}/{len(download_tasks)}")
                sys.stdout.flush()
        print(f"\n✅ Download concluído: {success_count} fotos salvas em {fotos_dir}")

    # Estatísticas
    scale_counts = {}
    automaker_counts = {}
    for r in csv_rows:
        sc = r["escala"]
        aut = r["montadora"]
        scale_counts[sc] = scale_counts.get(sc, 0) + 1
        automaker_counts[aut] = automaker_counts.get(aut, 0) + 1

    print("\nResumo por Escalas:")
    for s, count in sorted(scale_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   • {s}: {count} miniaturas")

    print("\nTop Montadoras:")
    for a, count in sorted(automaker_counts.items(), key=lambda x: x[1], reverse=True)[:7]:
        print(f"   • {a}: {count} modelos")

    return True

def main():
    parser = argparse.ArgumentParser(description="Coletor Oficial Bburago")
    parser.add_argument("--saida", default=str(DEFAULT_CSV), help="Caminho do CSV gerado")
    parser.add_argument("--baixar-fotos", action="store_true", help="Baixa todas as fotos oficiais localmente")
    parser.add_argument("--fotos-dir", default=str(DEFAULT_FOTOS_DIR), help="Diretório onde salvar as fotos")
    parser.add_argument("--threads", type=int, default=8, help="Número de threads para download de fotos")
    args = parser.parse_args()

    collect_bburago(
        output_csv=Path(args.saida),
        baixar_fotos=args.baixar_fotos,
        fotos_dir=Path(args.fotos_dir),
        threads=args.threads
    )

if __name__ == "__main__":
    main()
