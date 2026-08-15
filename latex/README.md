# CySec — talleres

Proyecto LaTeX de la asignatura *Seguridad para Arquitectura Empresarial y gestión de la
seguridad* (32310005). La capa reutilizable vive en `tex/`; cada entrega es una carpeta en
`workshops/`.

## Compilar

```sh
make ws-01            # borrador → build/ws-01/main.pdf (cajas naranjas visibles)
make ws-01 FINAL=1    # entregable: sin cajas de borrador
make watch WS=ws-01   # recompila al guardar
make new WS=ws-02     # nuevo taller a partir de workshops/_template
make all              # todos los talleres
make clean            # borra build/
```

Motor: XeLaTeX + biber (TeX Live). Fuentes Libertinus cargadas por archivo desde el árbol
de TeX Live; si faltan, cae a Latin Modern con un warning.

## Estructura

```
tex/cysec.cls          clase: opciones [es|en], final, answers; \makewsheader
tex/common/course.tex  datos fijos del curso (nombre, código, profesor, autor)
tex/common/preamble.tex paquetes, idioma, colores, biblatex
tex/common/boxes.tex   entornos caso / fuentes / pregunta / respuesta / mcq
tex/common/macros.tex  \porque, \todoans, modo final
tex/bib/refs.bib       bibliografía compartida entre talleres
workshops/_template/   semilla que copia `make new`
workshops/ws-01/       Taller 1 — Introducción a ciberseguridad I
```

## Escribir un taller

```latex
\begin{caso}{Nombre del caso (año)} enunciado \end{caso}

\begin{fuentes}
  \fuente{https://…}
\end{fuentes}

\pregunta{¿Pregunta abierta?}
\begin{respuesta}
  Tu respuesta aquí.
\end{respuesta}

\begin{mcq}{Enunciado (1 o más respuestas válidas):}
  \opcion{No elegida.}
  \opcion*{Elegida — se marca con ✓.}
\end{mcq}
```

Un entorno `respuesta` vacío imprime la caja «Pendiente por responder» y deja
`Respuesta pendiente` en el `.log`; así `make ws-01 FINAL=1` delata lo que falta:

```sh
grep -c "Respuesta pendiente" build/ws-01/main.log
```

Los metadatos de cada taller están en `workshops/ws-XX/meta.tex`
(`\wsnumber`, `\wstitle`, `\wssession`, `\wsdate`, `\wsauthor`).
