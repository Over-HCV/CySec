"""Llena una copia de la plantilla `04-SABSA matrix.xlsx` con el contenido de `caso.yaml`.

    uv run --with openpyxl --with pyyaml python sabsa/build_xlsx.py

La plantilla trae los encabezados de cada capa en las filas pares (2, 4, ..., 10)
y deja la fila impar siguiente para el contenido; la columna H es el responsable.
Se escribe sobre la plantilla original para conservar sus estilos y bordes.
"""

from pathlib import Path

import yaml
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "04-SABSA matrix.xlsx"
CASO = ROOT / "caso.yaml"
OUT = ROOT / "out" / "SABSA-Matriz.xlsx"

CAPAS = ["contextual", "conceptual", "logical", "physical", "component"]
COLUMNAS = {"what": "B", "why": "C", "how": "D", "who": "E", "where": "F", "when": "G"}
FILA_CONTENIDO = {capa: 3 + 2 * i for i, capa in enumerate(CAPAS)}  # 3, 5, 7, 9, 11

ANCHO = 48  # ancho de B..G en caracteres
LINEA_PT = 13  # alto aproximado de una línea de texto en puntos


def lineas_estimadas(texto: str, ancho: int) -> int:
    """Cuántas líneas ocupa `texto` en una celda de `ancho` caracteres con wrap."""
    return sum(max(1, -(-len(linea) // ancho)) for linea in texto.split("\n"))


def main() -> None:
    caso = yaml.safe_load(CASO.read_text(encoding="utf-8"))
    # {empresa} y {area} en los textos se sustituyen por los valores del caso.
    for clave in ("mision", "objetivo_area", "titulo_matriz"):
        caso[clave] = caso[clave].replace("{empresa}", caso["empresa"]).replace("{area}", caso["area"])
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
    ws.column_dimensions["H"].width = 30

    alineacion = Alignment(wrap_text=True, vertical="top")
    for capa in CAPAS:
        fila = FILA_CONTENIDO[capa] + 1  # +1 por la fila del título
        celdas = caso["capas"][capa]
        max_lineas = 1
        for clave, col in COLUMNAS.items():
            texto = "\n".join(f"- {item}" for item in celdas[clave])
            celda = ws[f"{col}{fila}"]
            celda.value = texto
            celda.font = Font(bold=False, size=10)
            celda.alignment = alineacion
            max_lineas = max(max_lineas, lineas_estimadas(texto, ANCHO))

        resp = ws[f"H{fila}"]
        resp.value = caso["responsables"][capa]
        resp.font = Font(bold=True, size=10)
        resp.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        ws.row_dimensions[fila].height = min(409, max_lineas * LINEA_PT + 8)

    ws.freeze_panes = "B3"
    OUT.parent.mkdir(exist_ok=True)
    wb.save(OUT)
    print(f"ok → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
