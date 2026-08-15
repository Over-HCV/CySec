# CySec

Repositorio de la asignatura *Seguridad para Arquitectura Empresarial y gestión de la
seguridad* (32310005, Universidad del Rosario) y de los proyectos que salen de ella.

| carpeta | qué es |
|---|---|
| `apps/` | aplicaciones. Cada app es autocontenida: web, backend, base de datos e infraestructura dentro de su propia carpeta. |
| `apps/texel/` | editor LaTeX colaborativo en tiempo real (tipo Overleaf): Nuxt + Supabase + compilador en Cloud Run. |
| `latex/` | proyecto LaTeX de los talleres del curso (`make -C latex ws-01`). Ver `latex/README.md`. |
| `docs/` | documentación del repositorio en markdown. |
| `theory/` | apuntes teóricos del curso (protocolos, capas, herramientas). Ver `theory/README.md`. |
| `notes/` | material crudo del profesor, extraído de los PDF de clase. |

## Arranque rápido

```sh
make -C latex ws-01            # compila el Taller 1 → latex/build/ws-01/main.pdf
cd apps/texel && cat README.md # cómo levantar el editor colaborativo
```
