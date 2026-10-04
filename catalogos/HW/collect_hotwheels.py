#!/usr/bin/env python3
"""
Coletor de catalogo Hot Wheels (1968-2026) para o projeto minihubcar.

Fontes publicas suportadas
--------------------------
1. hotwheels.fandom.com  (API MediaWiki - nao raspa HTML, usa a API oficial do wiki)
2. South Texas Diecast      (tabelas HTML por ano/letra)
3. hwcollectorsnews.com     (listas de serie, opcional)

Saida
-----
- CSV no formato do catalogo minihubcar
- (opcional) fotos baixadas em --fotos-dir com o nome igual ao codigo Hot Wheels

Uso rapido
----------
    python collect_hotwheels.py --anos 1968-2026 --fonte fandom --saida hw_catalogo.csv
    python collect_hotwheels.py --anos 2026 --fonte fandom --baixar-fotos --fotos-dir C:/Projetos/minihubcar/catalogos/HW
    python collect_hotwheels.py --anos 1968-2026 --fonte todos --saida completo.csv --delay 1.5

Sem rede? Use --offline-diretorio com respostas salvas para testar a normalizacao.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, asdict, fields
from pathlib import Path
from typing import Iterable, Iterator
from urllib.parse import quote, urljoin

# ----------------------------------------------------------------------------
# HTTP - usa requests quando disponivel, senao urllib da stdlib.
# ----------------------------------------------------------------------------
try:
    import requests  # type: ignore
except ImportError:  # pragma: no cover
    requests = None  # type: ignore

from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

LOG = logging.getLogger("hotwheels")

UA_PADRAO = (
    "minihubcar-catalog-bot/1.0 (uso pessoal; contato: carlos@example.com) "
    "python-requests/urllib"
)

# ----------------------------------------------------------------------------
# Modelo de dados - ordem das colunas = ordem do CSV entregue
# ----------------------------------------------------------------------------
CABECALHO = [
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
    fonte: str = ""
    url_fonte: str = ""

    def completar(self) -> "Miniatura":
        """Deriva campos que faltam (nome do arquivo de foto = codigo)."""
        self.codigo_hotwheels = limpar(self.codigo_hotwheels).upper()
        for campo in ("descricao", "cor", "serie", "linha", "serie_numero",
                      "numero_colecao", "ano_lancamento"):
            setattr(self, campo, limpar(getattr(self, campo)))
        if self.codigo_hotwheels and not self.arquivo_imagem:
            self.arquivo_imagem = f"{self.codigo_hotwheels}.jpg"
        if not self.linha:
            self.linha = inferir_linha(self.descricao, self.serie)
        return self

    def chave(self) -> str:
        base = self.codigo_hotwheels or f"{self.descricao}|{self.ano_lancamento}|{self.serie}"
        return re.sub(r"\s+", " ", base).strip().lower()


def limpar(valor: object) -> str:
    if valor is None:
        return ""
    texto = html.unescape(str(valor))
    texto = re.sub(r"\[[^\]]*\]", "", texto)          # [1], [nota]
    texto = re.sub(r"<[^>]+>", "", texto)              # tags residuais
    texto = texto.replace(" ", " ")
    return re.sub(r"\s+", " ", texto).strip(" \t|,;")


def inferir_linha(descricao: str, serie: str = "") -> str:
    alvo = f"{descricao} {serie}".lower()
    regras = [
        (("super treasure hunt", "sth"), "STH"),
        (("treasure hunt", "th "), "TH"),
        (("red line club", "rlc"), "RLC"),
        (("car culture", "premium", "boulevard", "pop culture"), "Premium"),
    ]
    for chaves, linha in regras:
        if any(chave in alvo for chave in chaves):
            return linha
    return "Mainline"


# ----------------------------------------------------------------------------
# Camada HTTP com cache e controle de taxa
# ----------------------------------------------------------------------------
def slug(url: str) -> str:
    """Nome deterministico para uma URL (cache e modo offline)."""
    return re.sub(r"[^A-Za-z0-9._-]+", "_", url)[-180:]


class Cliente:
    def __init__(self, cache_dir: Path | None, delay: float, timeout: int = 30,
                 offline_dir: Path | None = None) -> None:
        self.cache_dir = cache_dir
        self.offline_dir = offline_dir
        self.delay = delay
        self.timeout = timeout
        self._ultimo = 0.0

    def _esperar(self) -> None:
        faltava = self.delay - (time.monotonic() - self._ultimo)
        if faltava > 0:
            time.sleep(faltava)
        self._ultimo = time.monotonic()

    def _cache_path(self, url: str) -> Path | None:
        if not self.cache_dir:
            return None
        return self.cache_dir / f"{slug(url)}.cache"

    def texto(self, url: str, *, cache_ok: bool = True) -> str:
        caminho = self._cache_path(url)
        if cache_ok and caminho and caminho.exists():
            return caminho.read_text(encoding="utf-8", errors="replace")

        if self.offline_dir:
            for nome in (Path(url).name, f"{slug(url)}.txt", f"{slug(url)}.json"):
                local = self.offline_dir / nome
                if local.exists():
                    return local.read_text(encoding="utf-8", errors="replace")
            raise FileNotFoundError(f"[offline] resposta simulada ausente para {url}")

        self._esperar()
        LOG.info("GET %s", url)
        try:
            if requests is not None:
                resposta = requests.get(url, headers={"User-Agent": UA_PADRAO}, timeout=self.timeout)
                resposta.raise_for_status()
                conteudo = resposta.text
            else:
                req = Request(url, headers={"User-Agent": UA_PADRAO})
                with urlopen(req, timeout=self.timeout) as resp:  # noqa: S310
                    conteudo = resp.read().decode("utf-8", errors="replace")
        except (HTTPError, URLError) as erro:
            raise RuntimeError(f"falha ao baixar {url}: {erro}") from erro

        if caminho:
            caminho.parent.mkdir(parents=True, exist_ok=True)
            caminho.write_text(conteudo, encoding="utf-8")
        return conteudo

    def json(self, url: str) -> dict:
        return json.loads(self.texto(url))

    def binario(self, url: str, destino: Path) -> bool:
        destino.parent.mkdir(parents=True, exist_ok=True)
        if destino.exists() and destino.stat().st_size > 0:
            return True
        self._esperar()
        try:
            if requests is not None:
                resposta = requests.get(url, headers={"User-Agent": UA_PADRAO}, timeout=self.timeout)
                resposta.raise_for_status()
                destino.write_bytes(resposta.content)
            else:
                req = Request(url, headers={"User-Agent": UA_PADRAO})
                with urlopen(req, timeout=self.timeout) as resp:  # noqa: S310
                    destino.write_bytes(resp.read())
            return True
        except Exception as erro:  # noqa: BLE001
            LOG.warning("nao foi possivel baixar %s (%s)", url, erro)
            return False


# ----------------------------------------------------------------------------
# Fonte 1 - Hot Wheels Wiki (API MediaWiki)
# ----------------------------------------------------------------------------
class FonteFandom:
    """Le as listas de miniaturas por ano usando a API do wiki.

    Paginas usadas: 'List of <ano> Hot Wheels' / '<ano> Hot Wheels'.
    A API parse retorna HTML; convertemos as tabelas em linhas.
    """

    nome = "fandom"
    BASE = "https://hotwheels.fandom.com/api.php"

    def __init__(self, cliente: Cliente) -> None:
        self.cliente = cliente

    def paginas_do_ano(self, ano: int) -> list[str]:
        url = (
            f"{self.BASE}?action=query&list=search&srsearch="
            f"{quote(f'{ano} Hot Wheels list of')}&srlimit=20&format=json"
        )
        dados = self.cliente.json(url)
        titulos = [r["title"] for r in dados.get("query", {}).get("search", [])]
        return [t for t in titulos if str(ano) in t]

    def html_da_pagina(self, titulo: str) -> str:
        url = (
            f"{self.BASE}?action=parse&page={quote(titulo)}"
            f"&prop=text&formatversion=2&format=json"
        )
        dados = self.cliente.json(url)
        return dados.get("parse", {}).get("text", "")

    def coletar(self, anos: Iterable[int]) -> Iterator[Miniatura]:
        for ano in anos:
            try:
                paginas = self.paginas_do_ano(ano)
            except Exception as erro:  # noqa: BLE001
                LOG.error("ano %s: busca falhou (%s)", ano, erro)
                continue
            if not paginas:
                LOG.warning("ano %s: nenhuma pagina encontrada", ano)
                continue
            for titulo in paginas[:3]:
                try:
                    corpo = self.html_da_pagina(titulo)
                except Exception as erro:  # noqa: BLE001
                    LOG.error("pagina %s falhou (%s)", titulo, erro)
                    continue
                url_pagina = "https://hotwheels.fandom.com/wiki/" + quote(titulo.replace(" ", "_"))
                for miniatura in extrair_miniaturas(corpo, ano, self.nome, url_pagina):
                    yield miniatura


# ----------------------------------------------------------------------------
# Fonte 2 - South Texas Diecast (tabelas HTML)
# ----------------------------------------------------------------------------
class FonteSouthTexas:
    nome = "southtexasdiecast"
    BASE = "http://www.southtexasdiecast.com/hwguide/"

    def __init__(self, cliente: Cliente) -> None:
        self.cliente = cliente

    def coletar(self, anos: Iterable[int]) -> Iterator[Miniatura]:
        for ano in anos:
            url = urljoin(self.BASE, f"{ano}.html")
            try:
                corpo = self.cliente.texto(url)
            except Exception as erro:  # noqa: BLE001
                LOG.warning("ano %s indisponivel em %s (%s)", ano, url, erro)
                continue
            for miniatura in extrair_miniaturas(corpo, ano, self.nome, url):
                yield miniatura


# ----------------------------------------------------------------------------
# Extracao generica de tabelas HTML (sem dependencia externa)
# ----------------------------------------------------------------------------
TAG_TABELA = re.compile(r"<table[^>]*>(.*?)</table>", re.I | re.S)
TAG_LINHA = re.compile(r"<tr[^>]*>(.*?)</tr>", re.I | re.S)
TAG_CELULA = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.I | re.S)
TAG_IMG = re.compile(r"<img[^>]+src=[\"']([^\"']+)[\"']", re.I)

MAPA_COLUNAS = {
    "col": "numero_colecao",
    "colno": "numero_colecao",
    "collection": "numero_colecao",
    "collectionno": "numero_colecao",
    "number": "numero_colecao",
    "no": "numero_colecao",
    "toy": "codigo_hotwheels",
    "toyno": "codigo_hotwheels",
    "code": "codigo_hotwheels",
    "sku": "codigo_hotwheels",
    "model": "descricao",
    "modelname": "descricao",
    "name": "descricao",
    "description": "descricao",
    "car": "descricao",
    "color": "cor",
    "colour": "cor",
    "series": "serie",
    "segment": "serie",
    "line": "linha",
}

# chaves sem espacos, #, pontuacao e maiusculas -> coluna de destino
MAPA_NORMALIZADO = {
    re.sub(r"[^a-z0-9]", "", chave): campo for chave, campo in MAPA_COLUNAS.items()
}

# cabecalhos que significam "numero dentro da serie" (ex.: Series # -> 4/5)
CHAVES_SERIE_NUMERO = {"series", "seriesno", "seriesnum", "seriesnumber", "seriespos"}


def normalizar_cabecalho(texto: str) -> str:
    return re.sub(r"[^a-z0-9]", "", limpar(texto).lower())

REGEX_CODIGO = re.compile(r"\b([A-Z]{1,3}[A-Z0-9]{2,5}\d{2,3})\b")
REGEX_SERIE = re.compile(r"(\d{1,2})\s*/\s*(\d{1,2})")


def extrair_miniaturas(corpo_html: str, ano: int, fonte: str, url_fonte: str) -> Iterator[Miniatura]:
    for tabela in TAG_TABELA.findall(corpo_html):
        linhas = TAG_LINHA.findall(tabela)
        if not linhas:
            continue
        indices = mapear_colunas(linhas[0])
        if not indices:
            continue
        for linha in linhas[1:]:
            celulas = [limpar(c) for c in TAG_CELULA.findall(linha)]
            if not celulas or not any(celulas):
                continue
            miniatura = montar_miniatura(celulas, indices, linha, ano, fonte, url_fonte)
            if miniatura:
                yield miniatura


def mapear_colunas(linha_cabecalho: str) -> dict[str, int]:
    celulas = TAG_CELULA.findall(linha_cabecalho)
    chaves = [normalizar_cabecalho(c) for c in celulas]
    indices: dict[str, int] = {}
    for posicao, chave in enumerate(chaves):
        if chave in CHAVES_SERIE_NUMERO:
            indices.setdefault("serie_numero_celula", posicao)
            continue
        campo = MAPA_NORMALIZADO.get(chave)
        if campo and campo not in indices:
            indices[campo] = posicao
    # se a tabela nao tem coluna de serie, mas tem "Segment"/"Series",
    # derivamos a serie principal da coluna de numero dentro da serie.
    return indices


def montar_miniatura(celulas: list[str], indices: dict[str, int], linha_html: str,
                     ano: int, fonte: str, url_fonte: str) -> Miniatura | None:
    def pegar(campo: str) -> str:
        posicao = indices.get(campo)
        if posicao is None or posicao >= len(celulas):
            return ""
        return celulas[posicao]

    descricao = pegar("descricao")
    codigo = pegar("codigo_hotwheels")
    if not codigo:
        juntos = " ".join(celulas)
        achado = REGEX_CODIGO.search(juntos.upper())
        codigo = achado.group(1) if achado else ""
    if not descricao and not codigo:
        return None

    serie = pegar("serie")
    serie_numero = ""
    achado_serie = REGEX_SERIE.search(serie)
    if achado_serie:
        serie_numero = f"{achado_serie.group(1)}/{achado_serie.group(2)}"

    imagem = TAG_IMG.search(linha_html)
    url_imagem = ""
    if imagem:
        candidato = html.unescape(imagem.group(1))
        if not candidato.startswith("data:"):
            url_imagem = urljoin(url_fonte, candidato)

    return Miniatura(
        codigo_hotwheels=codigo,
        descricao=descricao,
        cor=pegar("cor"),
        linha=pegar("linha") or inferir_linha(descricao, serie),
        ano_lancamento=str(ano),
        serie=serie,
        serie_numero=serie_numero,
        numero_colecao=pegar("numero_colecao"),
        url_imagem=url_imagem,
        fonte=fonte,
        url_fonte=url_fonte,
    ).completar()


# ----------------------------------------------------------------------------
# Orquestracao, deduplicacao e escrita
# ----------------------------------------------------------------------------
def parse_anos(expr: str) -> list[int]:
    anos: list[int] = []
    for parte in expr.split(","):
        parte = parte.strip()
        if "-" in parte:
            inicio, fim = parte.split("-", 1)
            anos.extend(range(int(inicio), int(fim) + 1))
        elif parte:
            anos.append(int(parte))
    return anos


def deduplicar(miniaturas: Iterable[Miniatura]) -> list[Miniatura]:
    vistos: dict[str, Miniatura] = {}
    for item in miniaturas:
        item.completar()
        chave = item.chave()
        atual = vistos.get(chave)
        if atual is None:
            vistos[chave] = item
            continue
        # combina preenchendo lacunas
        for campo in (f.name for f in fields(Miniatura)):
            if not getattr(atual, campo) and getattr(item, campo):
                setattr(atual, campo, getattr(item, campo))
    return sorted(vistos.values(), key=lambda m: (m.ano_lancamento, m.serie, m.codigo_hotwheels))


def escrever_csv(miniaturas: list[Miniatura], destino: Path) -> Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    with destino.open("w", newline="", encoding="utf-8-sig") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=CABECALHO, extrasaction="ignore")
        escritor.writeheader()
        for item in miniaturas:
            escritor.writerow(asdict(item))
    return destino


def baixar_fotos(miniaturas: list[Miniatura], cliente: Cliente, pasta: Path) -> tuple[int, int]:
    ok = falhas = 0
    pasta.mkdir(parents=True, exist_ok=True)
    for item in miniaturas:
        if not item.url_imagem:
            continue
        nome = f"{item.codigo_hotwheels or item.chave()}.jpg"
        destino = pasta / nome
        if cliente.binario(item.url_imagem, destino):
            item.arquivo_imagem = nome
            ok += 1
        else:
            falhas += 1
    return ok, falhas


def montar_fontes(nome: str, cliente: Cliente) -> list:
    disponiveis = {
        "fandom": FonteFandom,
        "southtexas": FonteSouthTexas,
    }
    if nome == "todos":
        return [cls(cliente) for cls in disponiveis.values()]
    if nome not in disponiveis:
        raise SystemExit(f"fonte desconhecida: {nome} (use {', '.join(disponiveis)} ou 'todos')")
    return [disponiveis[nome](cliente)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Varredura do catalogo Hot Wheels 1968-2026 para o projeto minihubcar.",
    )
    parser.add_argument("--anos", default="1968-2026", help="ex.: 1968-2026, 2026, 1998,2005-2010")
    parser.add_argument("--fonte", default="fandom", choices=["fandom", "southtexas", "todos"])
    parser.add_argument("--saida", default="hw_catalogo.csv", help="caminho do CSV gerado")
    parser.add_argument("--fotos-dir", default="", help="pasta das fotos (nome = codigo Hot Wheels)")
    parser.add_argument("--baixar-fotos", action="store_true", help="baixa as fotos encontradas")
    parser.add_argument("--delay", type=float, default=1.0, help="intervalo entre requisicoes (s)")
    parser.add_argument("--cache-dir", default="internal/hw_cache", help="cache HTTP")
    parser.add_argument("--offline-diretorio", default="", help="usa respostas salvas em vez de rede")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    cliente = Cliente(
        cache_dir=Path(args.cache_dir) if args.cache_dir else None,
        delay=args.delay,
        offline_dir=Path(args.offline_diretorio) if args.offline_diretorio else None,
    )
    anos = parse_anos(args.anos)
    LOG.info("varrendo %s ano(s): %s..%s", len(anos), anos[0], anos[-1])

    coletadas: list[Miniatura] = []
    for fonte in montar_fontes(args.fonte, cliente):
        LOG.info("fonte: %s", fonte.nome)
        for item in fonte.coletar(anos):
            coletadas.append(item)
            if len(coletadas) % 500 == 0:
                LOG.info("%s registros coletados", len(coletadas))

    unicas = deduplicar(coletadas)
    LOG.info("%s registros coletados, %s unicos", len(coletadas), len(unicas))

    if args.baixar_fotos:
        pasta = Path(args.fotos_dir or "fotos")
        ok, falhas = baixar_fotos(unicas, cliente, pasta)
        LOG.info("fotos: %s baixadas, %s falhas em %s", ok, falhas, pasta)

    destino = escrever_csv(unicas, Path(args.saida))
    LOG.info("CSV gravado em %s (%s linhas)", destino, len(unicas))
    return 0


if __name__ == "__main__":
    sys.exit(main())
