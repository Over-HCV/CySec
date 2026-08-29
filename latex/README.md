# CySec — talleres

Proyecto LaTeX de la asignatura *Seguridad para Arquitectura Empresarial y gestión de la
seguridad* (32310005). La capa reutilizable vive en `tex/`; cada entrega es una carpeta en
`workshops/`.

## Dos formas de compilar lo mismo

|              | Dónde        | Cómo                                                                        |
| ------------ | ------------ | --------------------------------------------------------------------------- |
| **Terminal** | esta carpeta | `make ws-01` llama a `latexmk` y deja el PDF en `build/ws-01/main.pdf`      |
| **Texel**    | navegador    | el servicio de compilación ejecuta el mismo `latexmk`; no hace falta `make` |

`build/` es solo salida: se regenera en cada compilación y está en `.gitignore`.
El `Makefile` no es parte del documento, es el atajo para no escribir el comando
de `latexmk` entero cada vez (y `make new WS=ws-02` copia `workshops/_template`).

**Qué se sube a Texel**: la carpeta `latex/` entera, no un taller suelto.
`workshops/ws-01/main.tex` hace `\documentclass[es]{cysec}` y `\input{meta}`, y
la clase, el preámbulo y la bibliografía viven en `tex/`; sin ellos no compila.
En Texel, «Nuevo proyecto» ya crea esa estructura completa a partir de
`workshops/_template` + `tex/` (ver `apps/texel/web/scripts/build-template.ts`),
así que solo hace falta cargar la carpeta si quieres subir un taller ya escrito.

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
tex/common/preamble.tex paquetes, idioma, colores, biblatex, listings (estilo cysec)
tex/common/boxes.tex   entornos caso / fuentes / pregunta / respuesta / mcq /
                       \captura (placeholder de evidencia) / analisis
tex/common/macros.tex  \porque, \todoans, modo final
tex/bib/refs.bib       bibliografía compartida entre talleres
workshops/_template/   semilla que copia `make new`
workshops/ws-01/       Taller 1 — Introducción a ciberseguridad I
workshops/ws-02/       Taller 2 — SQL Injection y XSS (capturas en pics/)
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

% Laboratorio con evidencias: comando + captura + análisis
\begin{lstlisting}[language=bash]
sqlmap -u "http://objetivo/?param=1" --batch
\end{lstlisting}

\captura{sqlmap-escaneo.png}{Salida del escaneo inicial}

\begin{analisis}
  Lo que la captura evidencia y por qué.
\end{analisis}
```

Un entorno `respuesta` vacío imprime la caja «Pendiente por responder» y deja
`Respuesta pendiente` en el `.log`; un `analisis` vacío hace lo propio con
`Análisis pendiente`, y una `\captura` sin su archivo en `pics/` deja
`Captura pendiente`. Así `make ws-01 FINAL=1` delata todo lo que falta:

```sh
grep -c "pendiente" build/ws-01/main.log
```

Los metadatos de cada taller están en `workshops/ws-XX/meta.tex`
(`\wsnumber`, `\wstitle`, `\wssession`, `\wsdate`, `\wsauthor`).
