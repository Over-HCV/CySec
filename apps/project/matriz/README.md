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
| `0-organigrama.md` | Guía | Organigrama, cómo se le habla a cada capa y qué se explica en cada una | Todos los cargos | No (es la guía para escribir las demás) |
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
- **Logical = servicios, no controles:** "Autenticación" es un servicio; usuario y contraseña, OTP, 2FA y biometría son sus controles. "Protección de endpoint" es un servicio; antivirus, EDR y XDR son controles. Primero se saca el listado de servicios y de ahí salen los controles.
- **Physical = controles:** Separados por capas de defensa en profundidad, con los tiempos de recuperación (RTO/RPO).
- **Component:** Es la más técnica y la menos importante para la sustentación.
- **Mapa mental en las slides, narración en el Excel:** En la presentación cada capa se muestra como mapa mental y no se lee ("200 líneas explicando la política, no"). En el Excel cada celda va narrada en uno o dos párrafos cortos (máximo unas 200 palabras) como en la versión de Contextual del compañero.
- **La matriz es una guía:** En la sustentación se cuenta como una historia, no se lee la matriz.

## Correcciones del profesor en el ejercicio de clase (`../00-Matrix.md`, final)
- **El encabezado de la celda manda** ("miren muy bien el encabezado de las celdas"): Cada "Qué va aquí" abre con el encabezado exacto de la plantilla `04-SABSA matrix.xlsx`, que es lo que el profesor ve en el Excel.
- **Contextual WHY = amenazas Y oportunidades:** Las amenazas son lo que se puede perder y las oportunidades lo que se puede ganar. Las dos van explícitas.
- **Contextual HOW = todos los procesos del proyecto:** Se incluyen pruebas, desarrollo y aceptación, no solo la operación.
- **Contextual WHO = toda la organización que participa:** "Faltan más áreas internas, porque la aplicación afecta a todo".
- **Contextual WHEN = tiempos de los objetivos del negocio:** Es la fecha que exige el dueño para cada objetivo de WHAT, no el cronograma de implementación. Las fechas de implementación van en Logical WHEN.
- **Conceptual WHAT = atributos de los objetivos:** Cada atributo dice de qué objetivo sale, y van primero los más importantes.
- **Conceptual WHO = también administradores y áreas que prueban:** Administrador de la plataforma y la nube, administrador de la información y usuarios internos.
- **Conceptual WHEN = un framework de gestión de riesgo:** ISO 31000 o ISO/IEC 27005 (o uno interno), seguido de los riesgos y sus iniciativas.
- **Logical WHAT = activos de información:** Incluye bases de datos, código de la aplicación, información transaccional e información clasificada.

## Asesoría del docente (noviembre de 2026) y voz por cargo
La transcripción de la asesoría salió con muchos errores, esto es lo que entendimos (el detalle y la lista de chequeo están en `0-organigrama.md`):
- **Cada capa suena como su interlocutor:** Arriba habla el dueño ("queremos vincularnos a Bre-B"), después el CISO ("para eso toca meter a sistemas, a legal y al de base de datos") y abajo los arquitectos y especialistas ("la aplicación se compone de base de datos, servidores...").
- **Contextual son requerimientos y beneficios:** Cada objetivo dice qué ganamos y la seguridad se nombra solo con los tres pilares (confidencialidad, integridad y disponibilidad).
- **Contextual HOW a muy alto nivel y Contextual WHO con los sponsors:** Dueños, Junta, accionistas, clientes, proveedores y áreas interesadas en general.
- **Es arquitectura y no implementación:** No se baja a la configuración de cada máquina.
- **Las dos capas de abajo son las que él va a preguntar:** Cada componente con su control (base de datos con firewall, conexión por canal dedicado y cifrado, usuarios con doble factor).
- **Logical WHAT describe también los componentes del sistema** y la matriz sirve para que la seguridad no se quede por fuera del cronograma.

Por eso cada celda está escrita **con las palabras del cargo con el que se habla en esa capa**. La compañía va en tercera persona porque nosotros somos el equipo de seguridad y no la compañía, así que el nosotros queda solo para lo que hace ese equipo ("si los conectamos", "le ponemos"). En el Excel va el texto narrado y los bullets quedan para los mapas mentales de las slides. Cuando varios bullets arrancan igual se agrupan bajo un rótulo (`- Oportunidades:` y debajo su listado indentado) y los decimales van con punto. El resto de reglas está en `docs/estilo-redaccion.md`.

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

## Recomendaciones que le hicieron a otro grupo (noviembre de 2026)
El docente le revisó la matriz a otro grupo (migración de SAP a la nube) y dejó tres recomendaciones que también nos aplican:

1. **Validar el texto generado por IA:** Se aplicó la sección 10 de `docs/estilo-redaccion.md` (muletillas) y cada cifra quedó con su fuente.
2. **Los mecanismos y controles no se pueden perder al bajar de capa:** Si no aparecen "la matriz queda como una migración sin seguridad". Aquí el equivalente es la integración con Bre-B, así que se armó el hilo de abajo para que cada capa diga cómo se protege esa integración en su nivel.
3. **Basarse en la documentación oficial:** Para SAP eran SAP Activate y las SAP Security Guides complementadas con ISO 27001, NIST CSF y CSA CCM. Aquí el equivalente son los reglamentos del Banco de la República, la Circular Básica Jurídica de la SFC y las guías del proveedor de nube (ver Fuentes oficiales).

### Hilo de la integración segura con Bre-B
| Capa | Celda | Cómo se protege la integración |
|---|---|---|
| Contextual | HOW | La integración tiene que ser confidencial, íntegra y disponible, con registro de cada transacción |
| Conceptual | WHY y HOW | Objetivo de control de cifrado en tránsito, Zero Trust también para lo que llega del sistema de pago y una actividad de seguridad en cada fase del proyecto (como SAP Activate) |
| Logical | HOW y WHEN | Servicio de mensajería interbancaria segura, la integración se habilita solo con certificación y pruebas de seguridad, cronograma con licencias y pentest |
| Physical | HOW y WHERE | Conector con canal dedicado y cifrado, mTLS, firma de cada mensaje ISO 20022, subred propia con 2 enlaces privados |
| Component | HOW y WHERE | AWS Direct Connect desde Equinix BG1, Istio para mTLS, CloudHSM para las llaves, ISO 20022 sobre REST |
| Operacional | HOW | Monitoreo 24/7 de la conexión y playbook de caída del sistema de pago |

## Fuentes oficiales
Se usan primero y se complementan con los estándares internacionales.

| Fuente | Para qué | Enlace |
|---|---|---|
| Banco de la República, reglamentos de Bre-B (DSP-465 pagos inmediatos, DSP-470 directorio de llaves, DSP-471 MOL) | Tiempos (20 s en el 99.5 %), nombre enmascarado, bloqueo de llaves, devolución, mensajería | [banrep.gov.co](https://www.banrep.gov.co/es/normatividad/sistemas-pago/pagos-inmediatos-bre-b) |
| Banco de la República, "Bre-B: del diseño a la realidad" (6-oct-2026) | Llaves, participantes, disponibilidad del primer semestre de 2026, uso del efectivo | [PDF](https://www.banrep.gov.co/sites/default/files/publicaciones/archivos/presentacion-bre-b-un-anio.pdf) |
| SFC, Circular Básica Jurídica (ciberseguridad, canales y Parte I, Título I, Capítulo VI de nube, que entró con la CE 005 de 2019) | Requisitos mínimos de seguridad y de uso de la nube | [CE 005 de 2019](https://normativa.colpensiones.gov.co/colpens/docs/circular_superfinanciera_0005_2019.htm) |
| AWS Security Reference Architecture | Cómo se reparten los servicios de seguridad en cuentas y redes | [docs.aws.amazon.com](https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture/welcome.html) |
| AWS Well-Architected, pilar de seguridad | Buenas prácticas por dominio (identidad, detección, protección de datos, respuesta) | [docs.aws.amazon.com](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html) |
| AWS, modelo de responsabilidad compartida | Qué le toca al proveedor y qué a NovaPay | [aws.amazon.com](https://aws.amazon.com/compliance/shared-responsibility-model/) |
| CSA Cloud Controls Matrix v4.1 | Controles de nube mapeados a ISO 27001 y NIST | [cloudsecurityalliance.org](https://cloudsecurityalliance.org/artifacts/cloud-controls-matrix-v4-1) |
| ISO/IEC 27001:2022 y NIST CSF 2.0 | Sistema de gestión y ciclo de funciones de seguridad | — |

## Formato de cada archivo
```markdown
---
capa: logical                 # contextual | conceptual | logical | physical | component | operacional
vista: Designer's View
rol: ...                      # el cargo en corto
responsable: >-               # va a la columna H del Excel, narrado
  La responsabilidad de esta capa es de...
con_quien_se_habla: ...
---
# Título
## WHAT — Nombre oficial de la celda
**Qué va aquí:** Definición (white paper SABSA + docente).

**En la matriz:**             ← SOLO este texto narrado va al Excel (1 o 2 párrafos)

Párrafo narrado...

**Para la presentación:**     ← bullets para el mapa mental de la slide
- Término: Explicación corta.

**Detalle y justificación:**  ← lo que no cabe en la celda (por qué, fuentes, tablas)
```
- El parser toma los párrafos que hay entre `**En la matriz:**` y el siguiente bloque en negrita o el siguiente `## `. Si una celda no tiene párrafos usa sus bullets.
- `{empresa}`, `{area}` y `{proyecto}` se reemplazan con los valores de `../caso.yaml`.
- El generador avisa si una celda queda vacía, si sigue en bullets o si pasa de 200 palabras.

## Nombres de celdas
Se usan los nombres de la Tabla 3 del white paper oficial (`../03-TSI-W100-SABSA-White-Paper.pdf`, p. 16) y, entre paréntesis, la descripción que trae la plantilla del docente. La diapositiva 12 del docente (`../02-…pdf`) muestra además la variante del libro de 2005, en la que la sexta fila se llama "Operational".
