# CySec

Repositorio de la asignatura *Seguridad para Arquitectura Empresarial y gestión de la
seguridad* (32310005, Universidad del Rosario) y de los proyectos que salen de ella.

| carpeta | qué es |
|---|---|
| `latex/` | proyecto LaTeX de los talleres del curso (`make -C latex ws-01`). Ver `latex/README.md`. |
| `docs/` | documentación del repositorio en markdown. |
| `theory/` | apuntes teóricos del curso (protocolos, capas, herramientas). Ver `theory/README.md`. |
| `notes/` | material crudo del profesor, extraído de los PDF de clase. |

## Arranque rápido

```sh
make -C latex ws-01            # compila el Taller 1 → latex/build/ws-01/main.pdf
```

## Texel

El editor LaTeX colaborativo que sale de este curso vive en su propio
repositorio: **[Over-HCV/texel](https://github.com/Over-HCV/texel)**. Lee los
talleres de aquí —la plantilla de proyecto nuevo sale de `latex/tex/` y
`latex/workshops/_template/`— y sincroniza los cambios en las dos direcciones,
así que un taller se puede escribir tanto en VS Code como en la aplicación.

Para trabajar en los dos a la vez, clónalos como hermanos:

```sh
git clone https://github.com/Over-HCV/texel.git ../texel
```

Así los scripts de Texel encuentran este repo sin configurar nada; si lo tienes
en otro sitio, pásalo con `CYSEC_DIR` (tests) o `TEXEL_LATEX_DIR` (plantilla).
