"""Llena una copia de la plantilla `04-SABSA matrix.xlsx` desde `matriz/[1-5]-*.md`.

    uv run --with openpyxl --with pyyaml python sabsa/build_xlsx.py

Cada .md es una capa: el frontmatter trae el responsable (columna H, un
párrafo narrado) y cada sección `## WHAT|WHY|HOW|WHO|WHERE|WHEN — ...` aporta a
su celda el texto narrado que hay bajo `**En la matriz:**` (uno o dos párrafos).
Los bullets de `**Para la presentación:**` no entran al Excel: son la fuente de
los mapas mentales de las slides. Lo global (título, empresa) sale de `caso.yaml`.

Si una celda todavía no tiene párrafos se usan sus bullets (compatibilidad con
`6-operacional.md`). Un bullet que termina en `:` y tiene debajo bullets
indentados es un **grupo**: sale como rótulo sin guion seguido de su listado.

La plantilla trae los encabezados de cada capa en las filas pares (2, 4, ..., 10)
y deja la fila impar siguiente para el contenido; la columna H es el responsable.
Se escribe sobre la plantilla original para conservar sus estilos y bordes.
"""

import re
import sys
from pathlib import Path

import yaml
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "04-SABSA matrix.xlsx"
CASO = ROOT / "caso.yaml"
MATRIZ = ROOT / "matriz"
OUT = ROOT / "out" / "SABSA-Matriz.xlsx"

CAPAS = ["contextual", "conceptual", "logical", "physical", "component"]
COLUMNAS = {"what": "B", "why": "C", "how": "D", "who": "E", "where": "F", "when": "G"}
FILA_CONTENIDO = {capa: 3 + 2 * i for i, capa in enumerate(CAPAS)}  # 3, 5, 7, 9, 11

ANCHO = 90  # ancho de B..G en caracteres (el texto narrado necesita más ancho para no pasar los 409 pt de alto)
ANCHO_H = 45  # ancho de la columna H (responsable narrado)
MAX_PALABRAS = 200  # tope sugerido por celda
LINEA_PT = 13  # alto aproximado de una línea de texto en puntos


def lineas_estimadas(texto: str, ancho: int) -> int:
    """Cuántas líneas ocupa `texto` en una celda de `ancho` caracteres con wrap."""
    return sum(max(1, -(-len(linea) // ancho)) for linea in texto.split("\n"))


def sustituir(caso: dict) -> dict:
    """Reemplaza {empresa}, {area} y {proyecto} en todos los textos del caso."""
    valores = {k: caso[k] for k in ("empresa", "area", "proyecto")}

    def r(x):
        if isinstance(x, str):
            for k, v in valores.items():
                x = x.replace("{%s}" % k, v)
            return x
        if isinstance(x, list):
            return [r(i) for i in x]
        if isinstance(x, dict):
            return {k: r(v) for k, v in x.items()}
        return x

    return r(caso)


def leer_capa(path: Path) -> tuple[dict, dict[str, list[str]]]:
    """Devuelve (frontmatter, {columna: [líneas]}) de un .md de capa.

    Si la celda tiene párrafos narrados bajo `**En la matriz:**` las líneas son
    esos párrafos. Si no, son los bullets ya armados ("- x", "Rótulo:", "  - x").
    """
    texto = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", texto, re.S)
    if not m:
        sys.exit(f"{path.name}: falta el frontmatter (--- ... ---)")
    meta = yaml.safe_load(m.group(1))
    celdas: dict[str, list[str]] = {}
    parrafos: dict[str, list[str]] = {}
    col, en_matriz = None, False
    for linea in texto[m.end():].splitlines():
        h = re.match(r"^## (WHAT|WHY|HOW|WHO|WHERE|WHEN) —", linea)
        if h:
            col, en_matriz = h.group(1).lower(), False
            if col in celdas:
                sys.exit(f"{path.name}: la sección {h.group(1)} está repetida")
            celdas[col] = []
            parrafos[col] = [""]
        elif linea.startswith("## "):
            col, en_matriz = None, False
        elif col and linea.startswith("**"):
            en_matriz = linea.startswith("**En la matriz:**")
        elif col and en_matriz and linea.strip() and not re.match(r"^\s*- ", linea):
            # párrafo narrado: las líneas seguidas forman un párrafo
            parrafos[col][-1] += (" " if parrafos[col][-1] else "") + re.sub(r"[*`]", "", linea.strip())
        elif col and en_matriz and not linea.strip():
            if parrafos[col][-1]:
                parrafos[col].append("")
        elif col and en_matriz and re.match(r"^\s*- ", linea):
            # el Excel no interpreta markdown: se quitan *énfasis* y `código`
            texto_item = re.sub(r"[*`]", "", linea.strip()[2:]).strip()
            if linea.startswith("- "):
                celdas[col].append("- " + texto_item)
            else:
                # bullet indentado: el bullet de arriba pasa a ser el rótulo
                # del grupo (sin guion) la primera vez que aparece un hijo
                previo = len(celdas[col]) - 1
                while previo >= 0 and celdas[col][previo].startswith("  "):
                    previo -= 1
                if previo < 0:
                    sys.exit(f"{path.name}: bullet indentado sin grupo en {col}")
                if celdas[col][previo].startswith("- "):
                    celdas[col][previo] = celdas[col][previo][2:]
                celdas[col].append("  - " + texto_item)
    for c, ps in parrafos.items():
        ps = [x for x in ps if x]
        if ps:
            celdas[c] = ps
    return meta, celdas


def es_narrada(lineas: list[str]) -> bool:
    return bool(lineas) and not any(x.lstrip().startswith("- ") for x in lineas)


def leer_matriz() -> dict[str, dict]:
    """{capa: {"responsable": str, "celdas": {columna: [bullets]}}} validado."""
    capas = {}
    for path in sorted(MATRIZ.glob("[1-5]-*.md")):
        meta, celdas = leer_capa(path)
        capas[meta["capa"]] = {"responsable": str(meta["responsable"]).strip(), "celdas": celdas}
    errores = [f"falta la capa {c}" for c in CAPAS if c not in capas]
    for capa, datos in capas.items():
        for col in COLUMNAS:
            lineas = datos["celdas"].get(col, [])
            if not lineas:
                errores.append(f"{capa}/{col}: celda vacía")
            elif not es_narrada(lineas):
                print(f"aviso: {capa}/{col} todavía está en bullets (falta narrarla)")
            else:
                palabras = sum(len(x.split()) for x in lineas)
                if palabras > MAX_PALABRAS:
                    print(f"aviso: {capa}/{col} tiene {palabras} palabras (tope sugerido {MAX_PALABRAS})")
    if errores:
        sys.exit("matriz incompleta:\n  " + "\n  ".join(errores))
    return capas


def main() -> None:
    caso = yaml.safe_load(CASO.read_text(encoding="utf-8"))
    caso["capas"] = leer_matriz()
    caso = sustituir(caso)
    wb = load_workbook(TEMPLATE)
    ws = wb.active
    ws.title = "Matriz SABSA"

    # Título arriba de la matriz: se corre todo una fila hacia abajo.
    ws.insert_rows(1)
    for rango in list(ws.merged_cells.ranges):
        rango.shift(0, 1)
    ws.merge_cells("A1:H1")
    ws["A1"] = caso["titulo_matriz"]
    ws["A1"].font = Font(bold=True, size=14)
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30
    # insert_rows no mueve las alturas de fila; se reasignan desde la plantilla.
    original = load_workbook(TEMPLATE).active
    for r in range(1, original.max_row + 1):
        ws.row_dimensions[r + 1].height = original.row_dimensions[r].height

    for col in COLUMNAS.values():
        ws.column_dimensions[col].width = ANCHO
    ws.column_dimensions["H"].width = ANCHO_H

    alineacion = Alignment(wrap_text=True, vertical="top")
    for capa in CAPAS:
        fila = FILA_CONTENIDO[capa] + 1  # +1 por la fila del título
        celdas = caso["capas"][capa]["celdas"]
        max_lineas = 1
        for clave, col in COLUMNAS.items():
            if es_narrada(celdas[clave]):
                texto = "\n\n".join(celdas[clave])
                celda = ws[f"{col}{fila}"]
                celda.value = texto
                celda.font = Font(bold=False, size=10)
                celda.alignment = alineacion
                max_lineas = max(max_lineas, lineas_estimadas(texto, ANCHO))
                continue
            # bullets: cada línea ya viene armada ("Rótulo:", "- bullet" o "  - bullet")
            lineas = []
            for i, x in enumerate(celdas[clave]):
                hijo = x.startswith("  - ")
                # línea en blanco al salir de un grupo, para que lo que sigue
                # (otro rótulo o un bullet suelto) no parezca parte de él
                if i and not hijo and celdas[clave][i - 1].startswith("  - "):
                    lineas.append("")
                lineas.append(x[2:] if hijo else x)
            texto = "\n".join(lineas)
            celda = ws[f"{col}{fila}"]
            celda.value = texto
            celda.font = Font(bold=False, size=10)
            celda.alignment = alineacion
            max_lineas = max(max_lineas, lineas_estimadas(texto, ANCHO))

        resp = ws[f"H{fila}"]
        resp.value = caso["capas"][capa]["responsable"]
        resp.font = Font(bold=False, size=10)
        resp.alignment = alineacion
        max_lineas = max(max_lineas, lineas_estimadas(resp.value, ANCHO_H))
        ws.row_dimensions[fila].height = min(409, max_lineas * LINEA_PT + 8)

    ws.freeze_panes = "B3"
    OUT.parent.mkdir(exist_ok=True)
    wb.save(OUT)
    print(f"ok → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
