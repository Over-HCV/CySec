#!/usr/bin/env python3
import argparse
import csv
import os
import random
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import requests
from bs4 import BeautifulSoup

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
BASE_QUERY = 'inurl:".asp?id="'
PRESETS = {
    "china": ["cn", "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn", "ac.cn", "hk", "mo", "tw"],
    "global": [],
}
DOUBLE_SUFFIXES = {
    "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn", "ac.cn",
    "com.hk", "edu.hk", "gov.hk", "org.hk",
    "com.tw", "edu.tw", "gov.tw", "org.tw",
    "com.mo", "gov.mo", "edu.mo",
    "co.uk", "org.uk", "ac.uk", "gov.uk",
    "com.au", "net.au", "org.au", "gov.au",
    "com.ar", "gob.ar", "edu.ar",
    "com.mx", "gob.mx", "edu.mx",
    "com.co", "edu.co", "gov.co",
    "com.br", "gov.br", "edu.br",
    "com.es", "gob.es", "edu.es",
}
CSV_FIELDS = ["url", "domain", "tld", "title", "snippet", "engine", "query", "found_at"]


def get_tld(domain: str) -> str:
    parts = domain.lower().split(".")
    if len(parts) >= 3 and ".".join(parts[-2:]) in DOUBLE_SUFFIXES:
        return ".".join(parts[-2:])
    return parts[-1] if parts else ""


def decode_ddg_link(href: str) -> str | None:
    if not href:
        return None
    if href.startswith("http") and "duckduckgo.com/l/" not in href:
        return href
    parsed = urlparse(href)
    qs = parse_qs(parsed.query)
    if "uddg" in qs:
        return unquote(qs["uddg"][0])
    return None


def ddg_search(query: str, max_pages: int, delay_min: float, delay_max: float) -> list[dict]:
    results = []
    offset = 0
    headers = {"User-Agent": UA, "Accept-Language": "en-US,en,q=0.9"}
    for page in range(max_pages):
        try:
            resp = requests.post(
                "https://html.duckduckgo.com/html/",
                data={"q": query, "s": offset},
                headers=headers,
                timeout=30,
            )
        except requests.RequestException as exc:
            print(f"  [ddg] error de red: {exc}", file=sys.stderr)
            break
        body = resp.text.lower()
        if resp.status_code != 200 or "anomaly" in body or "bots use duckduckgo" in body or "challenge" in body:
            print(
                f"  [ddg] bloqueado por anti-bot (HTTP {resp.status_code}); "
                "reintenta mas tarde, desde otra red o usa --engine serpapi/google.",
                file=sys.stderr,
            )
            break
        soup = BeautifulSoup(resp.text, "html.parser")
        added = 0
        for div in soup.select("div.result"):
            anchor = div.select_one("a.result__a")
            if anchor is None:
                continue
            url = decode_ddg_link(anchor.get("href", ""))
            if not url:
                continue
            snippet_tag = div.select_one(".result__snippet")
            results.append(
                {
                    "url": url,
                    "title": anchor.get_text(strip=True),
                    "snippet": snippet_tag.get_text(" ", strip=True) if snippet_tag else "",
                }
            )
            added += 1
        print(f"  [ddg] pagina {page + 1}: {added} resultados")
        if added == 0:
            break
        nxt = soup.select_one("a.result__pager-next") or soup.find("a", rel="next")
        next_offset = None
        if nxt is not None and nxt.get("href"):
            qs = parse_qs(urlparse(nxt["href"]).query)
            if "s" in qs:
                try:
                    next_offset = int(qs["s"][0])
                except ValueError:
                    next_offset = None
        if next_offset is None:
            break
        offset = next_offset
        if page < max_pages - 1:
            pause = random.uniform(delay_min, delay_max)
            print(f"  [ddg] espera {pause:.1f}s")
            time.sleep(pause)
    return results


def google_search(query: str, max_pages: int) -> list[dict] | None:
    api_key = os.environ.get("GOOGLE_API_KEY")
    cx = os.environ.get("GOOGLE_CX")
    if not api_key or not cx:
        return None
    results = []
    for page in range(max_pages):
        start = page * 10 + 1
        if start > 91:
            break
        try:
            resp = requests.get(
                "https://www.googleapis.com/customsearch/v1",
                params={"key": api_key, "cx": cx, "q": query, "start": start, "num": 10},
                timeout=30,
            )
        except requests.RequestException as exc:
            print(f"  [google] error de red: {exc}", file=sys.stderr)
            break
        if resp.status_code != 200:
            print(f"  [google] error {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
            break
        items = resp.json().get("items", [])
        for item in items:
            results.append(
                {
                    "url": item.get("link", ""),
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                }
            )
        print(f"  [google] pagina {page + 1}: {len(items)} resultados")
        if len(items) < 10:
            break
        time.sleep(1)
    return results


def serpapi_search(query: str, max_pages: int) -> list[dict] | None:
    api_key = os.environ.get("SERPAPI_KEY")
    if not api_key:
        return None
    results = []
    for page in range(max_pages):
        start = page * 100
        try:
            resp = requests.get(
                "https://serpapi.com/search.json",
                params={"engine": "google", "q": query, "num": 100, "start": start, "api_key": api_key},
                timeout=60,
            )
        except requests.RequestException as exc:
            print(f"  [serpapi] error de red: {exc}", file=sys.stderr)
            break
        if resp.status_code != 200:
            print(f"  [serpapi] error {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
            break
        items = resp.json().get("organic_results", [])
        for item in items:
            results.append(
                {
                    "url": item.get("link", ""),
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                }
            )
        print(f"  [serpapi] pagina {page + 1}: {len(items)} resultados")
        if len(items) < 100:
            break
        time.sleep(1)
    return results


def build_queries(preset: str, tlds: list[str] | None, extra: str) -> list[str]:
    suffixes = tlds if tlds else PRESETS.get(preset, [])
    queries = []
    for suffix in suffixes:
        site = suffix if suffix.startswith(".") else f".{suffix}"
        queries.append(f"{BASE_QUERY} site:{site} {extra}".strip())
    if not queries:
        queries.append(f"{BASE_QUERY} {extra}".strip())
    return queries


def enrich(raw: dict, engine: str, query: str) -> dict:
    url = raw["url"]
    domain = urlparse(url).netloc.lower()
    return {
        "url": url,
        "domain": domain,
        "tld": get_tld(domain),
        "title": raw.get("title", ""),
        "snippet": raw.get("snippet", ""),
        "engine": engine,
        "query": query,
        "found_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def load_existing(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8-sig") as fh:
        return {row["url"]: row for row in csv.DictReader(fh)}


def save(rows: list[dict], out: str) -> tuple[int, int]:
    path = Path(out)
    existing = load_existing(path)
    new_count = sum(1 for r in rows if r["url"] not in existing)
    for r in rows:
        existing.setdefault(r["url"], r)
    with path.open("w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for r in existing.values():
            writer.writerow(r)
    return new_count, len(existing)


def show_stats(out: str) -> None:
    path = Path(out)
    if not path.exists():
        print("Sin datos todavia. Ejecuta una recoleccion primero.")
        return
    rows = list(load_existing(path).values())
    domains = {r["domain"] for r in rows}
    tlds = Counter(r["tld"] for r in rows)
    engines = Counter(r["engine"] for r in rows)
    lines = [
        "# Resumen OSINT: sitios http con inurl:.asp?id=",
        "",
        f"Generado: {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        "",
        f"- URLs totales (solo http://): **{len(rows)}**",
        f"- Dominios unicos: **{len(domains)}**",
        f"- Buscadores: " + ", ".join(f"{k}: {v}" for k, v in engines.most_common()),
        "",
        "## Top TLDs",
        "",
        "| TLD | URLs |",
        "|---|---|",
    ]
    for tld, count in tlds.most_common(20):
        lines.append(f"| {tld} | {count} |")
    summary = "\n".join(lines) + "\n"
    Path(out).with_suffix(".summary.md").write_text(summary, encoding="utf-8")
    print(summary)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recoleccion pasiva de sitios http:// con inurl:.asp?id= (solo consulta buscadores; nunca contacta los sitios hallados)."
    )
    parser.add_argument("--engine", default="ddg", help="Motores separados por coma: ddg, google, serpapi.")
    parser.add_argument("--preset", choices=sorted(PRESETS), default="china")
    parser.add_argument("--tlds", help="Lista de TLDs separada por comas (ej: cn,hk). Sobreescribe --preset.")
    parser.add_argument("--extra", default="", help="Terminos extra para acotar la query.")
    parser.add_argument("--max-pages", type=int, default=3)
    parser.add_argument("--delay-min", type=float, default=6.0)
    parser.add_argument("--delay-max", type=float, default=11.0)
    parser.add_argument("--out", default="results.csv")
    parser.add_argument("--stats", action="store_true", help="Solo mostrar estadisticas del CSV y salir.")
    args = parser.parse_args()

    if args.stats:
        show_stats(args.out)
        return

    tlds = [t.strip() for t in args.tlds.split(",")] if args.tlds else None
    engines = [e.strip() for e in args.engine.split(",") if e.strip()]
    queries = build_queries(args.preset, tlds, args.extra)
    print(f"Shards a consultar: {len(queries)}")
    for q in queries:
        print(f"\nQuery: {q}")
        collected: list[dict] = []
        for engine in engines:
            if engine == "ddg":
                collected += [enrich(r, "ddg", q) for r in ddg_search(q, args.max_pages, args.delay_min, args.delay_max)]
            elif engine == "google":
                got = google_search(q, args.max_pages)
                if got is None:
                    print("  [google] sin GOOGLE_API_KEY/GOOGLE_CX en el entorno; se omite.", file=sys.stderr)
                else:
                    collected += [enrich(r, "google", q) for r in got]
            elif engine == "serpapi":
                got = serpapi_search(q, args.max_pages)
                if got is None:
                    print("  [serpapi] sin SERPAPI_KEY en el entorno; se omite.", file=sys.stderr)
                else:
                    collected += [enrich(r, "serpapi", q) for r in got]
            else:
                print(f"  motor desconocido: {engine}", file=sys.stderr)
        http_only = [r for r in collected if r["url"].startswith("http://")]
        discarded = len(collected) - len(http_only)
        print(f"  http://: {len(http_only)} | https:// descartados: {discarded}")
        new, total = save(http_only, args.out)
        print(f"  nuevos guardados: {new} | total en {args.out}: {total}")
        if engines != ["ddg"] or len(queries) > 1:
            time.sleep(random.uniform(args.delay_min, args.delay_max))

    show_stats(args.out)


if __name__ == "__main__":
    main()
