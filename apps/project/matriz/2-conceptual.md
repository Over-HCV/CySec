---
capa: conceptual
vista: Architect's View (arquitecto)
responsable: CISO con los directores de área
con_quien_se_habla: El CISO, a nivel estratégico, con los directores de área. Se definen gestión y estrategias de seguridad, políticas, normas y riesgos, sin productos.
---
# Capa Conceptual — gestión y estrategias de seguridad

> Es la visión general con la que se cumplen los requisitos de negocio: principios y conceptos que guían todo lo que viene después (white paper SABSA, p. 11). El docente: «acá ya vamos a dar un poquito de seguridad, pero a muy alto nivel, sin entrar en detalle; no me interesa que vamos a utilizar el [firewall X]». Hay que definir políticas, normas, estándares y conceptos. En esta capa aparecen los pilares de confidencialidad, integridad y disponibilidad («pregunta de final»).

## WHAT — Business Knowledge & Risk Strategy (Business Attributes Profile)
**Qué va aquí:** Encabezado de la plantilla: «Business Attributes Profile». El perfil de atributos de negocio, es decir, las características que el servicio debe garantizar. Según SABSA, estos atributos son los «activos sustitutos» contra los que se evalúa el riesgo, y cada uno lleva una métrica (white paper, pp. 11 y 19). El docente: «me está dando características de esa aplicación: debe ser disponible, debe ser segura».
**En la matriz:**
- Resistente al fraude (objetivo: fraude controlado): Se detecta el engaño antes de mover el dinero.
- Disponible (objetivo: servicio siempre disponible): El servicio opera 24/7 y se recupera rápido ante una falla.
- Autenticado (objetivo: confianza del cliente): Cada orden la da el titular verificado, desde un equipo de confianza.
- Íntegro (objetivos: confianza y cumplimiento): El monto, el destinatario y la cuenta no se alteran entre la autorización y la liquidación.
- Confidencial y privado (objetivos: confianza y reputación): Los datos personales, los saldos y la relación llave-cuenta solo los ve quien los necesita.
- Oportuno (objetivo: servicio siempre disponible): El pago llega en menos de 20 segundos.
- No repudiable (objetivo: cumplimiento): Queda evidencia de quién ordenó cada pago, lo que permite resolver devoluciones.
- Cumplido (objetivo: cumplimiento): Se puede demostrar el cumplimiento ante el Banco de la República, la SFC y la SIC.
**Detalle y justificación:**

| Atributo | Pilar | Métrica propuesta (KPI/KRI) | Viene de (Contextual) |
|---|---|---|---|
| Resistente al fraude | Integridad | Fraude < 5 pb del valor transado | Confianza, fraude controlado |
| Disponible | Disponibilidad | ≥ 99,95 % mensual | Servicio siempre disponible |
| Autenticado | Integridad / confidencialidad | 0 pagos sin autenticación fuerte | Confianza |
| Íntegro | Integridad | 0 diferencias en la conciliación con el MOL | Cumplimiento |
| Confidencial | Confidencialidad | 0 incidentes de fuga de datos | Confianza, reputación |
| Oportuno | Disponibilidad | ≥ 99,5 % de pagos en < 20 s | Requisito del Banco de la República |
| No repudiable | Integridad | 100 % de pagos con evidencia firmada | Devoluciones por fraude |
| Cumplido | — | 0 hallazgos regulatorios críticos | Cumplimiento |

La taxonomía oficial está en el white paper (Fig. 4, p. 20, y Fig. 5, p. 21); se tomaron solo los atributos que aplican, como lo indica SABSA (p. 19). Siguiendo a SABSA (p. 18), cada métrica lleva un umbral **primario** (límite aceptable) y uno de **alerta temprana**; el semáforo correspondiente se describe en `6-operacional.md`.

## WHY — Risk Management Objectives (Enablement & Control Objectives; Policy Architecture)
**Qué va aquí:** Encabezado de la plantilla: «Enablement & Control Objectives; Policy Architecture». Los objetivos de control (y de habilitación) que salen del análisis de riesgo sobre los atributos, junto con la arquitectura de políticas (white paper, p. 11). El docente: «acá ya defino unos objetivos de control: cuáles van a ser esos lineamientos de seguridad a alto nivel que voy a asegurar».
**En la matriz:**
- Objetivo 1: Ningún pago ni trámite de llaves sin autenticación fuerte del titular.
- Objetivo 2: Todo pago se evalúa por riesgo de fraude antes de enviarse.
- Objetivo 3: La información sensible se protege en todo su ciclo de vida (en tránsito, en reposo y en uso).
- Objetivo 4: El servicio se recupera dentro de los tiempos que acepta el negocio, incluso ante un ciberataque.
- Objetivo 5: El acceso a la información y a los sistemas es por mínimo privilegio y deja rastro.
- Objetivo 6: Todo cambio al producto incluye seguridad desde el diseño.
- Objetivo de habilitación: La seguridad no estorba la experiencia (menos de 20 s y pocos pasos), porque sin uso no hay crecimiento.
- Arquitectura de políticas: Política general de seguridad, de pagos inmediatos, de privacidad, de desarrollo seguro, criptográfica, de terceros y de uso de IA.
**Detalle y justificación:** En SABSA el riesgo tiene dos caras (white paper, p. 22). Por eso, además de los objetivos de **control**, hay un objetivo de **habilitación**: proteger sin matar la oportunidad. Las políticas aquí solo se nombran (es una arquitectura); su contenido va en la capa Logical, columna WHY.

## HOW — Strategies for Process Assurance (Process Mapping Framework; Architectural Strategies for ICT)
**Qué va aquí:** Encabezado de la plantilla: «Process Mapping Framework; Architectural Strategies for ICT». Las estrategias de seguridad y los procesos que hay que implementar. SABSA pide al menos una estrategia por cada área de requisitos (p. 11). El docente: «qué procesos vamos a comenzar a implementar: comunicación, desarrollo, gestión de la información».
**En la matriz:**
- Zero Trust: Nadie es de confianza por estar «adentro»; se verifica cada solicitud de clientes, empleados y sistemas.
- Defensa en profundidad: Varias capas de protección, de forma que si una falla la siguiente contiene el ataque.
- Gestión del fraude como proceso continuo: Prevenir, detectar, bloquear, devolver y aprender.
- Desarrollo seguro (DevSecOps): La seguridad entra en el ciclo de desarrollo desde el diseño y no al final.
- Gestión de la información: Clasificar, proteger y eliminar la información según su valor.
- Gestión de incidentes y comunicación: Responder, reportar a la SFC y avisar a los clientes afectados.
- Resiliencia: El servicio se diseña para tolerar la caída de un sitio completo.
- Privacidad desde el diseño e IA gobernada: Se recolecta solo lo necesario y se usa una sola IA corporativa autorizada.
**Detalle y justificación:** Cada estrategia cubre al menos un atributo. Zero Trust cubre autenticado y confidencial; la gestión de fraude cubre resistente al fraude; la resiliencia cubre disponible y oportuno; la gestión de incidentes cubre cumplido. Esto cumple la regla de SABSA de «al menos una estrategia por área de requisitos».

## WHO — Roles & Responsibilities (Owners, Custodians and Users; Service Providers & Customers)
**Qué va aquí:** Encabezado de la plantilla: «Owners, Custodians and Users; Service Providers & Customers». Propietarios, custodios y usuarios de la información, proveedores y clientes, y el tipo de confianza entre ellos (white paper, p. 11). El docente: «quiénes van a ser propietarios de la información o custodios».
**En la matriz:**
- Dueño del proceso: VP Comercial y de Pagos.
- Dueños del riesgo: CISO (ciberseguridad) y Gerencia de Prevención de Fraude (fraude).
- Administrador de la información: Cada dueño de proceso clasifica sus datos y decide quién accede a ellos.
- Administradores técnicos (custodios): Administrador de la plataforma y la nube, administrador de accesos y administrador de bases de datos.
- Áreas internas que prueban y aceptan: Operaciones, Servicio al cliente y Prevención de fraude validan antes de salir al público.
- Usuarios internos: Agentes de servicio, analistas de fraude y desarrolladores.
- Clientes: Personas y comercios.
- Proveedores de servicio y contrapartes: Banco de la República, sistema de pago, nube y validación de identidad, bajo acuerdos de servicio y de seguridad.
**Detalle y justificación:** Corrección del profesor en clase: «faltan los usuarios internos, las áreas internas que tienen que probar, el administrador del servidor, el administrador de la nube y el administrador de la información». La separación entre dueño del riesgo (CISO, Fraude) y dueño del proceso (VP) evita que quien opera sea quien se audita. Los proveedores quedan como custodios y no como dueños, porque la responsabilidad ante la SFC sigue siendo de la entidad aunque se terceriza el servicio (CBJ, P.I, T.II, Cap. I, num. 2.3.6).

## WHERE — Domain Framework (Security Domain Concepts & Framework) → normas y estándares
**Qué va aquí:** Encabezado de la plantilla: «Security Domain Concepts & Framework». El white paper habla de dominios de seguridad y de sus fronteras (p. 12). El docente lo lee como **«las normativas, los estándares que tengo que cumplir»** («si es financiero aparecen un montón de normas»), y así se llena aquí. Los dominios técnicos (zonas de red) bajan a Physical.
**En la matriz:**
- Banco de la República: Reglamento de pagos inmediatos (CRE DSP-465, versión del 31-mar-2026) y reglamentos del DICE y del MOL.
- SFC, ciberseguridad: Circular Básica Jurídica (CE 006/2025), Parte I, Título IV, Capítulo V (antes CE 007/2018).
- SFC, seguridad en canales: Requerimientos mínimos de seguridad y calidad, Parte I, Título II, Capítulo I.
- Riesgo y lavado de activos: SIAR (riesgo operacional) y SARLAFT de la SFC.
- Protección de datos: Ley 1581 de 2012 y hábeas data financiero (Ley 1266 de 2008).
- ISO/IEC 27001:2022: Sistema de gestión de seguridad de la información (93 controles en 4 temas).
- NIST CSF 2.0: Marco para gobernar, identificar, proteger, detectar, responder y recuperar.
- OWASP, ISO 22301 e ISO/IEC 42001: Desarrollo seguro de la app y los servicios, continuidad del negocio y gestión de la IA.
**Detalle y justificación:**

| Norma | Para qué sirve aquí | Dónde se concreta |
|---|---|---|
| DSP-465 (31-mar-2026) | 20 s en el 99,5 %, nombre enmascarado, autenticación fuerte para llaves, bloqueo de llaves por fraude, devolución, 24/7, ISO 20022 | Logical (políticas, flujos) |
| DSP-470 / DSP-471 | Directorio de llaves y liquidación, con manuales de contingencia | Physical, Operacional |
| CBJ P.I, T.IV, Cap. V | Unidad de ciberseguridad, SOC/SIEM, continuidad ante ciberataques, reporte TUIC/TLP, aviso a clientes | Logical, Operacional |
| CBJ P.I, T.II, Cap. I | Autenticación fuerte, cifrado fuerte, perfil transaccional, pentest semestral, doble factor en móvil, QR, biometría | Logical, Physical |
| SIAR (CBF, CE 004/2026) | Riesgo operacional (reemplaza al SARO) | Conceptual WHEN |
| SARLAFT (CBJ P.I, T.IV, Cap. IV) | Conocimiento del cliente y reporte de operaciones sospechosas (cuentas mula) | Logical |
| Ley 1581 / Ley 1266 | Autorización, derechos del titular, transferencia internacional | Logical, Physical |
| ISO/IEC 27001:2022 | SGSI; Anexo A con 93 controles (37 organizacionales, 8 de personas, 14 físicos, 34 tecnológicos). La versión 2013 tenía 114 controles en 14 dominios | Logical WHERE (zoom) |
| NIST CSF 2.0 | 6 funciones para organizar los servicios | Logical |
| OWASP MASVS v2.1 / API Top 10 2023 | Seguridad de la app móvil y de los servicios | Logical WHERE, Physical |
| ISO 22301:2019 | Continuidad 24/7 | Physical WHEN, Operacional |
| ISO/IEC 42001:2023 | Gobierno del modelo antifraude y de la IA corporativa | Logical, Operacional |

PCI DSS **no aplica**, porque Bre-B es de cuenta a cuenta y no hay datos de tarjeta. Solo aplicaría si NovaPay emitiera tarjetas.

## WHEN — Time Management Framework (Through-Life Risk Management Framework) → riesgos e iniciativas
**Qué va aquí:** Encabezado de la plantilla: «Through-Life Risk Management Framework». El marco de gestión de riesgo continuo (white paper, p. 12). El docente lo lee como la **identificación de riesgos** generales y las iniciativas para tratarlos: «no es hacer una valoración completa, sino identificar los riesgos generales», con ejemplos como seguimiento de anomalías, alertas en tiempo real, hacking ético y auditorías periódicas.
**En la matriz:**
- Marco de gestión de riesgos: ISO 31000 (proceso general de riesgos) e ISO/IEC 27005 (riesgos de seguridad de la información), alineados con el SIAR de la SFC.
- Ciclo continuo: NIST CSF 2.0 (gobernar, identificar, proteger, detectar, responder y recuperar), con revisión trimestral e indicadores de riesgo.
- Fraude por engaño: Seguimiento de anomalías en tiempo real y educación continua al cliente.
- Robo de cuentas: Autenticación fuerte y bloqueo preventivo tras un cambio de equipo o de SIM.
- Cuentas mula: Vigilancia de las cuentas que reciben y bloqueo de llaves por fraude.
- Caída del servicio: Pruebas de continuidad y de recuperación cada semestre.
- Vulnerabilidades e integridad: Hacking ético semestral (lo exige la SFC) y pruebas de validación de la información.
- Accesos y terceros: Auditorías periódicas de accesos privilegiados y evaluación de proveedores.
**Detalle y justificación:** Corrección del profesor en clase: el encabezado pide un **framework** de gestión de riesgo. «¿Qué framework conocen para la gestión de riesgos? Puede ser estándar o interno: la ISO 27005, la ISO 31000». Por eso la celda abre con el marco (ISO 31000 como proceso general, ISO/IEC 27005 para seguridad de la información, el SIAR como exigencia de la SFC y NIST CSF 2.0 como ciclo) y sigue con los riesgos principales y sus iniciativas, como el seguimiento de anomalías y las pruebas de validación que él mismo puso de ejemplo. El orden de los riesgos refleja probabilidad × impacto (ver la tabla de los 10 riesgos en `3-logical.md`).

## Trazabilidad
- **Hacia arriba:** Cada atributo viene de un activo u objetivo de Contextual WHAT, y cada riesgo de Contextual WHY.
- **Hacia abajo:**
  - Cada objetivo de control se vuelve un servicio en Logical: Objetivo 1 → autenticación fuerte; Objetivo 2 → antifraude; Objetivo 3 → protección de datos y criptografía; Objetivo 4 → continuidad; Objetivo 5 → gestión de accesos privilegiados; Objetivo 6 → desarrollo seguro.
  - Cada norma se vuelve un «zoom» de controles en Logical WHERE.

## Fuentes
- White paper SABSA (`../03-TSI-W100-SABSA-White-Paper.pdf`): pp. 11–12, 16, 18–22.
- [Texto compilado de la CBJ (CE 006/2025)](https://normativa.colpensiones.gov.co/colpens/compilacion/docs/circular_superfinanciera_0006_2025.htm), [SFC, CBF (CE 004/2026)](https://www.superfinanciera.gov.co/publicaciones/10116084/circular-basica-financiera-circular-externa-004-de-2026/).
- [ISO/IEC 27001](https://www.iso.org/standard/27001), [NIST CSF 2.0](https://www.nist.gov/cyberframework), [OWASP MASVS](https://mas.owasp.org/MASVS/), [OWASP API Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [ISO/IEC 42001](https://www.iso.org/standard/81230.html), [ISO 22301](https://www.iso.org/standard/75106.html).
- *Por verificar:* El numeral exacto del SIAR dentro de la CBF.
