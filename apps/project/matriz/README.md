# Matriz SABSA — fuente por capas

Esta carpeta es la **fuente** de la matriz SABSA del proyecto (NovaPay S.A., vinculación a Bre-B).
Cada archivo es una capa (una fila de la matriz) y dentro de él hay una sección por columna.
El Excel `out/SABSA-Matriz.xlsx` se genera desde aquí:

```sh
cd apps/project
uv run --with openpyxl --with pyyaml python sabsa/build_xlsx.py
```

| Archivo | Capa | Vista SABSA | Con quién se habla | ¿Entra al Excel? |
|---|---|---|---|---|
| `1-contextual.md` | Contextual | Business View | Alta dirección (sponsors) | Sí |
| `2-conceptual.md` | Conceptual | Architect's View | CISO, a nivel estratégico, con los directores | Sí |
| `3-logical.md` | Logical | Designer's View | CISO y arquitecto de seguridad | Sí |
| `4-physical.md` | Physical | Builder's View | Director de infraestructura | Sí |
| `5-component.md` | Component | Tradesman's View | Líder de SecOps / DevSecOps | Sí |
| `6-operacional.md` | Service Management | Service Manager's View | Operación de seguridad (SOC, servicio) | No (la plantilla tiene 5 filas) |

## Cómo se lee la matriz
- **Filas = vistas:** Cada capa es la misma iniciativa vista por un actor distinto, de lo general a lo particular. La matriz se llena **de arriba hacia abajo y de izquierda a derecha**.
- **Columnas = 6 preguntas:** Qué (activos), Por qué (motivación/riesgo), Cómo (procesos), Quién (personas), Dónde (ubicación), Cuándo (tiempo).
- **Trazabilidad en dos sentidos** (white paper SABSA, p. 15): Hacia abajo, cada requisito de negocio debe quedar cubierto por algún componente (completitud). Hacia arriba, cada componente debe justificarse en un requisito (justificación de negocio). Al final de cada archivo hay una sección de trazabilidad.
- **Riesgo = amenaza + oportunidad:** SABSA gestiona también la oportunidad (p. 22). Aquí la oportunidad es captar clientes con pagos inmediatos.

## Reglas que dio el docente (resumen de `../00-Desc.md` y `../00-Matrix.md`)
- **Contextual sin tecnología:** Es la conversación con el dueño del negocio.
- **Conceptual sin productos:** Atributos, objetivos de control, procesos, dueños, **normas y estándares** (columna Dónde) y **riesgos con sus iniciativas** (columna Cuándo).
- **Logical = servicios, no controles:** «Autenticación» es un servicio; usuario y contraseña, OTP, 2FA y biometría son sus controles. «Protección de endpoint» es un servicio; antivirus, EDR y XDR son controles. Primero se saca el listado de servicios y de ahí salen los controles.
- **Physical = controles:** Separados por capas de defensa en profundidad, con los tiempos de recuperación (RTO/RPO).
- **Component:** Es la más técnica y la menos importante para la sustentación.
- **Mapa mental, no párrafos:** Cada celda lleva ideas cortas, no textos largos («200 líneas explicando la política, no»).
- **La matriz es una guía:** En la sustentación se cuenta como una historia, no se lee la matriz.

## Correcciones del profesor en el ejercicio de clase (`../00-Matrix.md`, final)
- **El encabezado de la celda manda** («miren muy bien el encabezado de las celdas»): Cada «Qué va aquí» abre con el encabezado exacto de la plantilla `04-SABSA matrix.xlsx`, que es lo que el profesor ve en el Excel.
- **Contextual WHY = amenazas Y oportunidades:** Las amenazas son lo que se puede perder y las oportunidades lo que se puede ganar. Las dos van explícitas.
- **Contextual HOW = todos los procesos del proyecto:** Se incluyen pruebas, desarrollo y aceptación, no solo la operación.
- **Contextual WHO = toda la organización que participa:** «Faltan más áreas internas, porque la aplicación afecta a todo».
- **Contextual WHEN = tiempos de los objetivos del negocio:** Es la fecha que exige el dueño para cada objetivo de WHAT, no el cronograma de implementación. Las fechas de implementación van en Logical WHEN.
- **Conceptual WHAT = atributos de los objetivos:** Cada atributo dice de qué objetivo sale, y van primero los más importantes.
- **Conceptual WHO = también administradores y áreas que prueban:** Administrador de la plataforma y la nube, administrador de la información y usuarios internos.
- **Conceptual WHEN = un framework de gestión de riesgo:** ISO 31000 o ISO/IEC 27005 (o uno interno), seguido de los riesgos y sus iniciativas.
- **Logical WHAT = activos de información:** Incluye bases de datos, código de la aplicación, información transaccional e información clasificada.

## Lectura vertical (cada columna se refina de arriba hacia abajo)
| Columna | Contextual | Conceptual | Logical | Physical | Component |
|---|---|---|---|---|---|
| WHAT | Objetivos del negocio | Atributos de esos objetivos | Inventario de activos de información | Diccionario de datos | Repositorios y procesadores |
| WHY | Amenazas y oportunidades | Objetivos de control y políticas | Políticas por dominio | Reglas y procedimientos | Herramientas de riesgo |
| HOW | Procesos del proyecto | Estrategias (Zero Trust…) | Flujos y servicios de seguridad | Mecanismos (controles) | Herramientas y protocolos |
| WHO | Organización y sponsors | Dueños, custodios, usuarios | Perfiles y privilegios | Interfaces y control de acceso | Identidades, roles y ACL |
| WHERE | Sedes y jurisdicción | Normas y estándares | Dominios y zoom de normas | Plataformas y red por capas | Nodos y direcciones |
| WHEN | Tiempos de los objetivos | Framework de riesgo | Fechas límite y vigencias | RTO, RPO y sesiones | Calendarios y relojes |

Si una celda no encadena con la de arriba o la de abajo, algo sobra o falta. Es la trazabilidad en dos sentidos de SABSA.

## Formato de cada archivo
```markdown
---
capa: logical                 # contextual | conceptual | logical | physical | component | operacional
vista: Designer's View
responsable: ...              # va a la columna H del Excel
con_quien_se_habla: ...
---
# Título
## WHAT — Nombre oficial de la celda
**Qué va aquí:** Definición (white paper SABSA + docente).
**En la matriz:**             ← SOLO esta lista va al Excel, ordenada de MÁS a MENOS importante
- Término: Explicación corta.
**Detalle y justificación:**  ← lo que no cabe en la celda (por qué, fuentes, tablas)
```
- El parser toma los bullets `- ` que hay entre `**En la matriz:**` y el siguiente bloque en negrita o el siguiente `## `.
- `{empresa}`, `{area}` y `{proyecto}` se reemplazan con los valores de `../caso.yaml`.
- Cada celda lleva **entre 5 y 8 bullets**. El generador avisa si una celda queda vacía.

## Nombres de celdas
Se usan los nombres de la Tabla 3 del white paper oficial (`../03-TSI-W100-SABSA-White-Paper.pdf`, p. 16) y, entre paréntesis, la descripción que trae la plantilla del docente. La diapositiva 12 del docente (`../02-…pdf`) muestra además la variante del libro de 2005, en la que la sexta fila se llama «Operational».
