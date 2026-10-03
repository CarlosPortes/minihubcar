#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Coletor Oficial do Catálogo Bburago (Shopify API)
-------------------------------------------------
Varre todas as miniaturas oficiais disponíveis na loja oficial Bburago (bburago.com):
- Modelos clássicos e modernos (Ferrari, Lamborghini, Bugatti, Porsche, Red Bull Racing F1, Mercedes-AMG F1, etc.)
- Escalas: 1:18, 1:24, 1:43 e 1:64
- Códigos SKU oficiais (ex: 18-16930, 18-36835)
- Fotos oficiais de estúdio em altíssima resolução (3000x3000px)
- Cores, acabamentos e especificações
Gera o arquivo padronizado: bburago_catalogo.csv
"""

import os
import sys
import csv
import json
import re
import time
import requests
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_CSV = BASE_DIR / "bburago_catalogo.csv"
FOTOS_DIR = BASE_DIR / "fotos"
FOTOS_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MiniHubCarBot/2.0",
    "Accept": "application/json"
}

KNOWN_AUTOMAKERS = [
    ("Ferrari", ["Ferrari", "Scuderia Ferrari"]),
    ("Red Bull Racing", ["Red Bull", "Oracle Red Bull"]),
    ("Lamborghini", ["Lamborghini"]),
    ("Porsche", ["Porsche"]),
    ("Bugatti", ["Bugatti"]),
    ("Mercedes-Benz", ["Mercedes-AMG", "Mercedes", "Mercedes Benz"]),
    ("McLaren", ["McLaren"]),
    ("Alpine", ["Alpine"]),
    ("Alfa Romeo", ["Alfa Romeo"]),
    ("Aston Martin", ["Aston Martin"]),
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

def detect_automaker(title, tags):
    full_text = f"{title} {' '.join(tags)}".lower()
    for name, aliases in KNOWN_AUTOMAKERS:
        for alias in aliases:
            if re.search(r'\b' + re.escape(alias.lower()) + r'\b', full_text):
                return name
    return "Outro"

def detect_scale(product):
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
    
    return "1:43" # Default mais comum

def detect_color(tags, title):
    for t in tags:
        if t.startswith("color_group:"):
            return t.split(":", 1)[1].strip().title()
    colors = ["Red", "Rosso", "Black", "Nero", "Yellow", "Giallo", "White", "Bianco", "Blue", "Blu", "Silver", "Argento", "Green", "Verde", "Orange", "Arancio"]
    for c in colors:
        if re.search(r'\b' + c + r'\b', title, re.IGNORECASE):
            return c.title()
    return "Padrão Oficial"

def detect_series(title, tags):
    if "Signature" in title or "Signature Series" in tags:
        return "Signature Series"
    if "Exclusive" in title or "WEB EXCLUSIVE" in title:
        return "Exclusive Series"
    if "Race" in title or "Racing" in title or "F1" in title or "Formula 1" in title:
        return "Race & F1 Series"
    if "Plus" in title:
        return "Plus Series"
    if "Street Fire" in title:
        return "Street Fire"
    return "Bburago Diecast"

def clean_model_name(title, automaker, scale):
    cleaned = title
    # Remove escala
    cleaned = re.sub(r'1[:/]\d+', '', cleaned)
    # Remove marcas comuns do início se duplicadas
    cleaned = re.sub(r'\b(WEB EXCLUSIVE|Exclusive Series|Signature Series|Diecast)\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'[\-\–\|]', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def collect_bburago():
    print("🏎️  Iniciando Coletor Oficial do Catálogo Bburago (Shopify API)...")
    products = []
    page = 1

    while True:
        url = f"https://www.bburago.com/en-es/collections/vedi-tutti/products.json?limit=250&page={page}"
        print(f"📡 Buscando página {page}...")
        success = False
        for attempt in range(4):
            try:
                res = requests.get(url, headers=HEADERS, timeout=25)
                if res.status_code == 429:
                    wait_sec = 6 * (attempt + 1)
                    print(f"⏳ Rate limit 429 detectado. Aguardando {wait_sec}s antes de tentar novamente...")
                    time.sleep(wait_sec)
                    continue
                if res.status_code != 200:
                    print(f"❌ Erro HTTP {res.status_code} na página {page}")
                    break
                data = res.json()
                page_products = data.get("products", [])
                if not page_products:
                    print("🏁 Fim dos produtos encontrados.")
                    success = True
                    break
                products.extend(page_products)
                print(f"✅ {len(page_products)} produtos carregados nesta página.")
                page += 1
                success = True
                time.sleep(2)
                break
            except Exception as e:
                print(f"❌ Erro na tentativa {attempt + 1}: {e}")
                time.sleep(4)
        if not success or not page_products:
            break

    print(f"\n📦 Total de produtos brutos obtidos: {len(products)}")

    csv_rows = []
    seen_skus = set()

    for p in products:
        title = p.get("title", "").strip()
        body_html = p.get("body_html", "")
        tags = p.get("tags", [])
        handle = p.get("handle", "")
        images = p.get("images", [])
        variants = p.get("variants", [])

        automaker = detect_automaker(title, tags)
        scale = detect_scale(p)
        color = detect_color(tags, title)
        series_name = detect_series(title, tags)
        model_name = clean_model_name(title, automaker, scale)

        # Imagens
        img_urls = [img.get("src", "") for img in images if img.get("src")]
        primary_image = img_urls[0] if img_urls else ""
        gallery_images = ";".join(img_urls[1:]) if len(img_urls) > 1 else ""

        for v in variants:
            sku = (v.get("sku") or "").strip()
            if not sku:
                sku = f"BB-{p.get('id')}-{v.get('id')}"
            
            price_eur = v.get("price", "0.00")
            variant_title = v.get("title", "")
            
            # Limpa descrição de tags HTML
            desc_clean = re.sub(r'<[^>]+>', ' ', body_html)
            desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()

            row = {
                "sku": sku,
                "titulo": title,
                "montadora": automaker,
                "modelo": model_name,
                "escala": scale,
                "serie": series_name,
                "cor": color,
                "preco_eur": price_eur,
                "url_imagem_principal": primary_image,
                "galeria_imagens": gallery_images,
                "total_fotos": len(img_urls),
                "url_produto": f"https://www.bburago.com/products/{handle}",
                "descricao": desc_clean[:500],
            }
            csv_rows.append(row)

    # Escrever CSV
    fields = [
        "sku",
        "titulo",
        "montadora",
        "modelo",
        "escala",
        "serie",
        "cor",
        "preco_eur",
        "url_imagem_principal",
        "galeria_imagens",
        "total_fotos",
        "url_produto",
        "descricao",
    ]

    with open(OUTPUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, delimiter=";")
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"\n🎉 Catálogo Bburago compilado com sucesso!")
    print(f"📁 Arquivo salvo em: {OUTPUT_CSV}")
    print(f"📊 Total de miniaturas/variações catalogadas: {len(csv_rows)}")

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

    print("\nTop 5 Montadoras:")
    for a, count in sorted(automaker_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"   • {a}: {count} modelos")

    return True

if __name__ == "__main__":
    collect_bburago()
