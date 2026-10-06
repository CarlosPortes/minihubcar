"""
Script de Normalização e Sincronização de Imagens do Catálogo Legado
Origem: C:\\Projetos\\miniatures-app\\Fotos
Destino: C:\\Projetos\\minihubcar\\catalogos\\HW

Função:
1. Lê todas as 4.093 imagens da pasta legado.
2. Trata transparência alfa (RGBA, LA, P com transparência) aplicando fundo branco.
3. Converte formatos (.webp, .png, .jfif, .jpeg, .jpg) para .jpg padronizado em alta qualidade.
4. Resolve 27 duplicatas de nomes base escolhendo a imagem com maior resolução/detalhe.
5. Salva na pasta do catálogo do minihubcar (catalogos/HW).
"""

import os
import sys
import json
import time
from PIL import Image

SRC_DIR = r"C:\Projetos\miniatures-app\Fotos"
DST_DIR = r"C:\Projetos\minihubcar\catalogos\HW"
REPORT_PATH = r"C:\Projetos\minihubcar\backend\scripts\photo_sync_report.json"

def get_image_score(path):
    """Retorna pontuação baseada em dimensões e tamanho para desempate."""
    try:
        size_bytes = os.path.getsize(path)
        with Image.open(path) as img:
            w, h = img.size
            return (w * h, size_bytes)
    except Exception:
        return (0, 0)

def normalize_to_jpg(src_path, dst_path, quality=92):
    """Converte e salva como JPEG padronizado, tratando canal alfa."""
    with Image.open(src_path) as img:
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            # Usa o canal alfa como máscara
            alpha = img.split()[-1]
            bg.paste(img, mask=alpha)
            bg.save(dst_path, "JPEG", quality=quality, optimize=True)
        elif img.mode != "RGB":
            rgb_img = img.convert("RGB")
            rgb_img.save(dst_path, "JPEG", quality=quality, optimize=True)
        else:
            img.save(dst_path, "JPEG", quality=quality, optimize=True)

def main():
    start_time = time.time()
    os.makedirs(DST_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)

    print(f"=== INICIANDO NORMALIZAÇÃO DE FOTOS ===")
    print(f"Origem: {SRC_DIR}")
    print(f"Destino: {DST_DIR}")

    files = [f for f in os.listdir(SRC_DIR) if os.path.isfile(os.path.join(SRC_DIR, f))]
    print(f"Total de arquivos encontrados: {len(files)}")

    # Agrupa por nome base (sem extensão, case-insensitive)
    base_groups = {}
    for f in files:
        base, ext = os.path.splitext(f)
        base_norm = base.strip()
        key = base_norm.lower()
        if key not in base_groups:
            base_groups[key] = []
        base_groups[key].append(f)

    print(f"Total de nomes base únicos: {len(base_groups)}")

    stats = {
        "total_source_files": len(files),
        "unique_bases": len(base_groups),
        "converted": 0,
        "copied_or_saved": 0,
        "collisions_resolved": 0,
        "errors": []
    }

    count = 0
    for key, file_list in base_groups.items():
        count += 1
        # Se houver mais de uma extensão para o mesmo nome base, escolhe o melhor
        if len(file_list) > 1:
            stats["collisions_resolved"] += 1
            # Ordena por pontuação de resolução/tamanho decrescente
            best_file = max(file_list, key=lambda f: get_image_score(os.path.join(SRC_DIR, f)))
        else:
            best_file = file_list[0]

        src_path = os.path.join(SRC_DIR, best_file)
        # O nome do arquivo salvo mantém a caixa original do nome base com .jpg em minúsculo
        base_name = os.path.splitext(best_file)[0]
        dst_filename = f"{base_name}.jpg"
        dst_path = os.path.join(DST_DIR, dst_filename)

        try:
            normalize_to_jpg(src_path, dst_path)
            stats["converted"] += 1
        except Exception as e:
            stats["errors"].append({"file": best_file, "error": str(e)})

        if count % 500 == 0 or count == len(base_groups):
            print(f"Processados: {count}/{len(base_groups)} imagens...")

    elapsed = time.time() - start_time
    stats["elapsed_seconds"] = round(elapsed, 2)

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print(f"\n=== FINALIZADO COM SUCESSO EM {stats['elapsed_seconds']}s ===")
    print(f"Imagens normalizadas e salvas em {DST_DIR}: {stats['converted']}")
    print(f"Colisões de nome resolvidas: {stats['collisions_resolved']}")
    print(f"Erros encontrados: {len(stats['errors'])}")
    print(f"Relatório salvo em: {REPORT_PATH}")

if __name__ == "__main__":
    main()
