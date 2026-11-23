---
capa: conceptual
vista: Architect's View (arquitecto)
rol: CISO con los directores de área
responsable: >-
  La responsabilidad de esta capa es del CISO junto con los directores de área. El CISO traduce los objetivos del negocio en atributos, políticas y estrategias de seguridad y define a quién toca meter en el proyecto. La VP de Riesgos y Cumplimiento valida que el marco de riesgos encaje con el SIAR y el SARLAFT y Jurídico revisa las normas y los contratos con terceros.
con_quien_se_habla: El CISO, a nivel estratégico, con los directores de área. Se definen gestión y estrategias de seguridad, políticas, normas y riesgos, sin productos.
voz: Hablamos con el CISO y los directores de área (ver 0-organigrama.md)
---
# Capa Conceptual — gestión y estrategias de seguridad

> Es la visión general con la que se cumplen los requisitos de negocio: principios y conceptos que guían todo lo que viene después (white paper SABSA, p. 11). El docente: "acá ya vamos a dar un poquito de seguridad, pero a muy alto nivel, sin entrar en detalle; no me interesa que vamos a utilizar el [firewall X]". Hay que definir políticas, normas, estándares y conceptos. En esta capa aparecen los pilares de confidencialidad, integridad y disponibilidad ("pregunta de final").

## WHAT — Business Knowledge & Risk Strategy (Business Attributes Profile)
**Qué va aquí:** Encabezado de la plantilla: "Business Attributes Profile". El perfil de atributos de negocio, es decir, las características que el servicio debe garantizar. Según SABSA, estos atributos son los "activos sustitutos" contra los que se evalúa el riesgo, y cada uno lleva una métrica (white paper, pp. 11 y 19). El docente: "me está dando características de esa aplicación: debe ser disponible, debe ser segura".
**En la matriz:**

Los objetivos del negocio se traducen en atributos que el CISO puede medir. El primero es resistente al fraude y viene del tope de 5 puntos básicos: El engaño se tendría que detectar antes de que la plata salga. Le siguen disponible y oportuno, que vienen del servicio siempre activo: Operación 24/7 con 99.9 % al mes y pagos en menos de 20 segundos en el 99.5 % de los casos.

De la confianza de los clientes salen otros tres. Autenticado porque cada orden la da el titular verificado desde un equipo de confianza, íntegro porque el monto, el destinatario y la cuenta no cambian entre que se autoriza y se liquida y confidencial porque los datos personales, los saldos y la relación entre llave y cuenta solo los ve quien los necesita. Del cumplimiento salen no repudiable (queda evidencia de quién ordenó cada pago) y cumplido ({empresa} le puede demostrar su cumplimiento al Banco de la República, a la SFC y a la SIC).

**Para la presentación:**
- Resistente al fraude (viene de fraude controlado): El engaño se detecta antes de que la plata se mueva.
- Disponible (viene de servicio siempre disponible): El servicio opera 24/7 y se recupera rápido si algo falla.
- Autenticado (viene de confianza de los clientes): Cada orden la da el titular verificado y desde un equipo de confianza.
- Íntegro (viene de confianza y cumplimiento): El monto, el destinatario y la cuenta no cambian entre que se autoriza y se liquida.
- Confidencial y privado (viene de confianza y reputación): Los datos personales, los saldos y la relación llave-cuenta solo los ve quien los necesita.
- Oportuno (viene de servicio siempre disponible): El pago llega en menos de 20 segundos.
- No repudiable (viene de cumplimiento): Queda evidencia de quién ordenó cada pago para poder resolver devoluciones.
- Cumplido (viene de cumplimiento): Se le puede demostrar el cumplimiento al Banco de la República, a la SFC y a la SIC.
**Detalle y justificación:**

| Atributo | Pilar | Métrica propuesta (KPI/KRI) | Viene de (Contextual) |
|---|---|---|---|
| Resistente al fraude | Integridad | Fraude < 5 pb del valor transado | Confianza, fraude controlado |
| Disponible | Disponibilidad | ≥ 99.9 % mensual | Servicio siempre disponible |
| Autenticado | Integridad / confidencialidad | 0 pagos sin autenticación fuerte | Confianza |
| Íntegro | Integridad | 0 diferencias en la conciliación con el MOL | Cumplimiento |
| Confidencial | Confidencialidad | 0 incidentes de fuga de datos | Confianza, reputación |
| Oportuno | Disponibilidad | ≥ 99.5 % de pagos en < 20 s | Requisito del Banco de la República |
| No repudiable | Integridad | 100 % de pagos con evidencia firmada | Devoluciones por fraude |
| Cumplido | — | 0 hallazgos regulatorios críticos | Cumplimiento |

La taxonomía oficial está en el white paper (Fig. 4, p. 20, y Fig. 5, p. 21); se tomaron solo los atributos que aplican, como lo indica SABSA (p. 19). Siguiendo a SABSA (p. 18), cada métrica lleva un umbral **primario** (límite aceptable) y uno de **alerta temprana**; el semáforo correspondiente se describe en `6-operacional.md`.

## WHY — Risk Management Objectives (Enablement & Control Objectives; Policy Architecture)
**Qué va aquí:** Encabezado de la plantilla: "Enablement & Control Objectives; Policy Architecture". Los objetivos de control (y de habilitación) que salen del análisis de riesgo sobre los atributos, junto con la arquitectura de políticas (white paper, p. 11). El docente: "acá ya defino unos objetivos de control: cuáles van a ser esos lineamientos de seguridad a alto nivel que voy a asegurar".
**En la matriz:**

Para que esos atributos se cumplan proponemos seis objetivos de control. Ningún pago ni trámite de llaves pasa sin autenticación fuerte del titular y todo pago se evalúa por riesgo de fraude antes de enviarse. La información sensible se protege en tránsito, en reposo y en uso, incluida la que viaja por la integración con Bre-B. El servicio se recupera dentro de los tiempos que acepta el negocio incluso ante un ciberataque, todo acceso es por mínimo privilegio y deja rastro y todo cambio al producto incluye seguridad desde el diseño.

Hay además un objetivo de habilitación: La seguridad no puede estorbar la experiencia porque sin uso no hay crecimiento. Los controles tendrían que caber en los 20 segundos y en pocos pasos. Estos objetivos bajan a una arquitectura de políticas con la política general de seguridad y las de pagos inmediatos, privacidad, desarrollo seguro, criptografía, terceros y uso de IA.

**Para la presentación:**
- Objetivos de control:
  - 1. Ningún pago ni trámite de llaves pasa sin autenticación fuerte del titular.
  - 2. Todo pago se evalúa por riesgo de fraude antes de enviarse.
  - 3. La información sensible se protege en todo su ciclo de vida (en tránsito, en reposo y en uso).
  - 4. El servicio se recupera dentro de los tiempos que acepta el negocio incluso ante un ciberataque.
  - 5. Todo acceso a la información y a los sistemas es por mínimo privilegio y deja rastro.
  - 6. Todo cambio al producto incluye seguridad desde el diseño.
- Objetivo de habilitación: La seguridad no puede estorbar la experiencia (menos de 20 s y pocos pasos) porque sin uso no hay crecimiento.
- Arquitectura de políticas: Proponemos política general de seguridad, de pagos inmediatos, de privacidad, de desarrollo seguro, criptográfica, de terceros y de uso de IA.
**Detalle y justificación:** En SABSA el riesgo tiene dos caras (white paper, p. 22). Por eso, además de los objetivos de **control**, hay un objetivo de **habilitación**: proteger sin matar la oportunidad. Las políticas aquí solo se nombran (es una arquitectura); su contenido va en la capa Logical, columna WHY.

## HOW — Strategies for Process Assurance (Process Mapping Framework; Architectural Strategies for ICT)
**Qué va aquí:** Encabezado de la plantilla: "Process Mapping Framework; Architectural Strategies for ICT". Las estrategias de seguridad y los procesos que hay que implementar. SABSA pide al menos una estrategia por cada área de requisitos (p. 11). El docente: "qué procesos vamos a comenzar a implementar: comunicación, desarrollo, gestión de la información".
**En la matriz:**

La estrategia de fondo es Zero Trust: Nadie es de confianza solo porque está adentro y cada solicitud de clientes, empleados y sistemas se verifica, también la que llega desde el sistema de pago. Sobre ella proponemos defensa en profundidad para que si una capa falla la siguiente contenga el ataque y resiliencia para que el servicio aguante la caída de un sitio completo.

El fraude se manejaría como un proceso continuo (prevenir, detectar, bloquear, devolver y aprender de cada caso) y la seguridad entraría al ciclo de desarrollo desde el diseño. Para la integración con Bre-B eso quiere decir que cada fase del proyecto tiene su actividad de seguridad: Análisis de riesgos en el diseño, pruebas de seguridad en el desarrollo, certificación con el sistema de pago, pentest antes de la marcha blanca y aprobación de seguridad antes del lanzamiento. Completan la estrategia la gestión de la información según su valor, la gestión de incidentes con reporte a la SFC y la privacidad desde el diseño con una sola IA corporativa autorizada.

**Para la presentación:**
- Zero Trust: Nadie es de confianza solo porque está adentro, se verifica cada solicitud de clientes, empleados y sistemas.
- Defensa en profundidad: Les ponemos varias capas de protección para que si una falla la siguiente contenga el ataque.
- Gestión del fraude como proceso continuo: Prevenir, detectar, bloquear, devolver y aprender de cada caso.
- Desarrollo seguro (DevSecOps): La seguridad entra en el ciclo de desarrollo desde el diseño y no al final.
- Gestión de la información: Clasificar, proteger y eliminar la información según su valor.
- Gestión de incidentes y comunicación: Responder, reportarle a la SFC y avisarles a los clientes afectados.
- Resiliencia: Diseñamos el servicio para que aguante la caída de un sitio completo.
- Privacidad desde el diseño e IA gobernada: Se recolecta solo lo necesario y se usa una sola IA corporativa autorizada.
**Detalle y justificación:** Cada estrategia cubre al menos un atributo. Zero Trust cubre autenticado y confidencial; la gestión de fraude cubre resistente al fraude; la resiliencia cubre disponible y oportuno; la gestión de incidentes cubre cumplido. Esto cumple la regla de SABSA de "al menos una estrategia por área de requisitos".

## WHO — Roles & Responsibilities (Owners, Custodians and Users; Service Providers & Customers)
**Qué va aquí:** Encabezado de la plantilla: "Owners, Custodians and Users; Service Providers & Customers". Propietarios, custodios y usuarios de la información, proveedores y clientes, y el tipo de confianza entre ellos (white paper, p. 11). El docente: "quiénes van a ser propietarios de la información o custodios".
**En la matriz:**

Para sacar el proyecto toca meter a varias áreas y cada una con un papel claro. La VP Comercial y de Pagos es la dueña del proceso, el CISO es dueño del riesgo de ciberseguridad y la Gerencia de Prevención de Fraude del riesgo de fraude. Cada dueño de proceso es dueño de su información así que la clasifica y decide quién accede a ella.

Los custodios son los administradores técnicos: El de la plataforma y la nube, el de accesos y el de bases de datos. Jurídico y Cumplimiento entran desde el principio por los contratos con proveedores y los reportes a las autoridades y Operaciones, Servicio al cliente y Prevención de fraude prueban y aceptan antes de salir al público. Los usuarios internos son los agentes de servicio, los analistas de fraude y los desarrolladores y los externos son las personas y los comercios. El Banco de la República, el sistema de pago, la nube y la validación de identidad trabajarían con {empresa} bajo acuerdos de servicio y de seguridad.

**Para la presentación:**
- Dueños:
  - Del proceso: La VP Comercial y de Pagos.
  - Del riesgo: El CISO por ciberseguridad y la Gerencia de Prevención de Fraude por el fraude.
  - De la información: Cada dueño de proceso clasifica sus datos y decide quién accede a ellos.
- A quién toca meter:
  - Administradores técnicos (custodios): El de la plataforma y la nube, el de accesos y el de bases de datos.
  - Jurídico y Cumplimiento: Desde el principio por los contratos con proveedores y los reportes a las autoridades.
  - Áreas que prueban y aceptan: Operaciones, Servicio al cliente y Prevención de fraude validan antes de salir al público.
- Usuarios: Adentro son los agentes de servicio, los analistas de fraude y los desarrolladores, afuera son las personas y los comercios.
- Proveedores y contrapartes: El Banco de la República, el sistema de pago, la nube y la validación de identidad trabajan con {empresa} bajo acuerdos de servicio y de seguridad.
**Detalle y justificación:** Corrección del profesor en clase: "faltan los usuarios internos, las áreas internas que tienen que probar, el administrador del servidor, el administrador de la nube y el administrador de la información". La separación entre dueño del riesgo (CISO, Fraude) y dueño del proceso (VP) evita que quien opera sea quien se audita. Los proveedores quedan como custodios y no como dueños, porque la responsabilidad ante la SFC sigue siendo de la entidad aunque se terceriza el servicio (CBJ, P.I, T.II, Cap. I, num. 2.3.6).

## WHERE — Domain Framework (Security Domain Concepts & Framework) → normas y estándares
**Qué va aquí:** Encabezado de la plantilla: "Security Domain Concepts & Framework". El white paper habla de dominios de seguridad y de sus fronteras (p. 12). El docente lo lee como **"las normativas, los estándares que tengo que cumplir"** ("si es financiero aparecen un montón de normas"), y así se llena aquí. Los dominios técnicos (zonas de red) bajan a Physical.
**En la matriz:**

{empresa} es el superdominio y ahí mandan la Junta y el CISO bajo la SFC con la Circular Básica Jurídica (ciberseguridad y canales), el SIAR, el SARLAFT e ISO/IEC 27001:2022 como sistema de gestión. Dentro de él los dominios de canales, core de pagos, información sensible y gestión reciben política delegada del CISO y ninguno la puede relajar.

Hacia afuera cada dominio tiene su propia norma. En Bre-B manda el Banco de la República con los reglamentos de pagos inmediatos (DSP-465), del directorio de llaves (DSP-470) y del sistema de liquidación (DSP-471). En el sistema de pago mandan su reglamento y sus acuerdos de servicio. Del lado del cliente rigen la Ley 1581 de 2012, la Ley 1266 de 2008 y la Ley 1328 de 2009 y en la nube rigen la responsabilidad compartida, el capítulo de nube de la Circular Básica Jurídica y la Cloud Controls Matrix (v4.1) de la CSA junto con ISO/IEC 27017 y 27018. NIST CSF 2.0, OWASP, ISO 22301 e ISO/IEC 42001 aplican en todos los dominios.

**Para la presentación:**
- Dominios y quién manda:
  - {empresa} (superdominio, mandan la Junta y el CISO bajo la SFC): CBJ de ciberseguridad (P. I, T. IV, Cap. V) y de canales (P. I, T. II, Cap. I), SIAR y SARLAFT, con ISO/IEC 27001:2022 como SGSI.
  - Internos (política delegada por el CISO): Canales, core de pagos, información sensible y gestión, ninguno puede relajar la política del superdominio.
  - Bre-B (manda el Banco de la República): Reglamento de pagos inmediatos (DSP-465, compendio vigente al 6-ago-2026), del directorio de llaves (DSP-470) y del MOL (DSP-471).
  - Sistema de pago (manda la entidad administradora): Su reglamento y los acuerdos de niveles de servicio sobre tiempos intermedios.
  - Cliente y comercio (manda el titular sobre su dispositivo y sus datos): Ley 1581 de 2012, Ley 1266 de 2008 y Ley 1328 de 2009 (consumidor financiero).
  - Proveedor de nube (manda el proveedor, con responsabilidad compartida): Capítulo de nube de la Circular Básica Jurídica (CE 005 de 2019), CSA CCM v4.1 y certificaciones ISO/IEC 27017, 27018 y SOC 2.
- Fronteras y asociaciones: Cada frontera entre dominios se rige por un acuerdo (reglamento, contrato o términos y condiciones) que dice cuánta confianza se le da al otro lado.
- Marcos transversales: NIST CSF 2.0, OWASP, ISO 22301 e ISO/IEC 42001 aplican en todos los dominios internos.
**Detalle y justificación:**

| Norma | Para qué sirve aquí | Dónde se concreta |
|---|---|---|
| DSP-465 (31-mar-2026) | 20 s en el 99.5 %, nombre enmascarado, autenticación fuerte para llaves, bloqueo de llaves por fraude, devolución, 24/7, ISO 20022 | Logical (políticas, flujos) |
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
**Qué va aquí:** Encabezado de la plantilla: "Through-Life Risk Management Framework". El marco de gestión de riesgo continuo (white paper, p. 12). El docente lo lee como la **identificación de riesgos** generales y las iniciativas para tratarlos: "no es hacer una valoración completa, sino identificar los riesgos generales", con ejemplos como seguimiento de anomalías, alertas en tiempo real, hacking ético y auditorías periódicas.
**En la matriz:**

Los riesgos se gestionarían con ISO 31000 como proceso general e ISO/IEC 27005 para la seguridad de la información, alineados con el SIAR de la SFC y con el ciclo de NIST CSF 2.0. La evaluación se repite en el diseño, antes de la certificación con el sistema de pago, antes de la marcha blanca, antes del lanzamiento, en cada cambio mayor, cada trimestre y al retirar un servicio.

Cada riesgo tiene su momento. El fraude por engaño pasa en cada pago así que se trata en tiempo real y con educación continua al cliente. El robo de cuentas aparece cuando el cliente cambia de equipo o de SIM y por eso hay 24 horas de bloqueo preventivo. Las cuentas mula aparecen al recibir plata y la caída del servicio y las vulnerabilidades están siempre (por eso la prueba de continuidad y el hacking ético cada semestre que pide la SFC). Los registros de pagos se guardan 10 años y los datos personales solo mientras dure la finalidad autorizada.

**Para la presentación:**
- Marco de gestión de riesgos: ISO 31000 (proceso general) e ISO/IEC 27005 (seguridad de la información) alineados con el SIAR de la SFC y con el ciclo de NIST CSF 2.0.
- Momentos de evaluación: En el diseño, antes de la certificación con el sistema de pago, antes de la marcha blanca, antes del lanzamiento, en cada cambio mayor, cada trimestre y al retirar un servicio.
- Riesgos y cuándo importan:
  - Fraude por engaño: En cada pago, por eso se trata en tiempo real y con educación continua al cliente.
  - Robo de cuentas: Cuando el cliente cambia de equipo o de SIM, por eso hay una ventana de bloqueo preventivo de 24 horas.
  - Cuentas mula: Al recibir plata, por eso se vigilan las cuentas receptoras y se bloquean llaves por fraude.
  - Caída del servicio y vulnerabilidades: Siempre, por eso hay prueba de continuidad cada semestre, análisis en cada versión y hacking ético semestral (lo exige la SFC).
  - Accesos y terceros: Al dar, cambiar o renovar un acceso o un contrato, por eso se auditan los accesos privilegiados y se evalúa a los proveedores.
- Vida de la información: Los registros de pagos se guardan 10 años y los datos personales solo mientras dure la finalidad autorizada.
**Detalle y justificación:** Corrección del profesor en clase: el encabezado pide un **framework** de gestión de riesgo. "¿Qué framework conocen para la gestión de riesgos? Puede ser estándar o interno: la ISO 27005, la ISO 31000". Por eso la celda abre con el marco (ISO 31000 como proceso general, ISO/IEC 27005 para seguridad de la información, el SIAR como exigencia de la SFC y NIST CSF 2.0 como ciclo) y sigue con los riesgos principales y sus iniciativas, como el seguimiento de anomalías y las pruebas de validación que él mismo puso de ejemplo. El orden de los riesgos refleja probabilidad × impacto (ver la tabla de los 10 riesgos en `3-logical.md`).

## Trazabilidad
- **Hacia arriba:** Cada atributo viene de un activo u objetivo de Contextual WHAT, y cada riesgo de Contextual WHY.
- **Hacia abajo:**
  - Cada objetivo de control se vuelve un servicio en Logical: Objetivo 1 → autenticación fuerte; Objetivo 2 → antifraude; Objetivo 3 → protección de datos y criptografía; Objetivo 4 → continuidad; Objetivo 5 → gestión de accesos privilegiados; Objetivo 6 → desarrollo seguro.
  - Cada norma se vuelve un "zoom" de controles en Logical WHERE.

## Fuentes
- White paper SABSA (`../03-TSI-W100-SABSA-White-Paper.pdf`): pp. 11–12, 16, 18–22.
- [Texto compilado de la CBJ (CE 006/2025)](https://normativa.colpensiones.gov.co/colpens/compilacion/docs/circular_superfinanciera_0006_2025.htm), [SFC, CBF (CE 004/2026)](https://www.superfinanciera.gov.co/publicaciones/10116084/circular-basica-financiera-circular-externa-004-de-2026/).
- [ISO/IEC 27001](https://www.iso.org/standard/27001), [NIST CSF 2.0](https://www.nist.gov/cyberframework), [OWASP MASVS](https://mas.owasp.org/MASVS/), [OWASP API Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [ISO/IEC 42001](https://www.iso.org/standard/81230.html), [ISO 22301](https://www.iso.org/standard/75106.html).
- *Por verificar:* El numeral exacto del SIAR dentro de la CBF.
