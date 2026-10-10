---
capa: contextual
vista: Business View (negocio)
responsable: Junta Directiva - Presidencia - VP Comercial y de Pagos (sponsors)
con_quien_se_habla: Alta dirección. Se pregunta para qué es el proyecto, a quién sirve, qué gana y qué arriesga el negocio.
---
# Capa Contextual — requisitos de negocio

> Esta capa describe el negocio en el que vive el proyecto, sin nada técnico (white paper SABSA, pp. 10–11). El docente la plantea como si el dueño del negocio estuviera sentado enfrente: qué se busca, por qué, con qué procesos y áreas, quién patrocina, dónde y en qué tiempos. Es la capa «más sencilla», pero ninguna arquitectura que se la salte sale bien.

## WHAT — Business Decisions (Taxonomy of Business Assets, including Goals & Objectives)
**Qué va aquí:** Encabezado de la plantilla: «Taxonomy of Business Assets, including Goals & Objectives». Los activos del negocio y los objetivos del proyecto, en lenguaje de alta dirección (marca, confianza, continuidad, cumplimiento). Según el docente: «¿será que es técnico? No; es muy alto negocio».
**En la matriz:**
- Confianza del cliente: Los fondos y los datos de los clientes son el activo principal; una estafa masiva o una filtración golpea más a la marca que cualquier caída.
- Lanzamiento de Bre-B: Ofrecer en la app transferencias por llaves y pagos QR interoperables con todo el sistema financiero.
- Crecimiento: Captar a quienes hoy usan efectivo y aportar al objetivo de duplicar los clientes activos en 2027.
- Servicio siempre disponible: Que el cliente pueda pagar a cualquier hora y que el dinero llegue en segundos.
- Fraude controlado: Crecer sin superar el tope de fraude que fija la Junta (5 puntos básicos del valor transado).
- Cumplimiento: Operar dentro de las reglas del Banco de la República y de la SFC, porque sin cumplimiento no hay permiso para operar.
- Reputación: Ser reconocidos por la seguridad de los pagos, como lo plantea la visión 2030.
**Detalle y justificación:** El orden responde a la visión («reconocida por la seguridad de sus pagos») y al objetivo estratégico («duplicar clientes **sin aumentar el fraude**»). Por eso la confianza va antes que el crecimiento: el crecimiento sin confianza no se sostiene en pagos inmediatos, donde el dinero no se puede reversar. El tope de 5 pb es un supuesto del caso.

## WHY — Business Risk (Opportunities & Threats Inventory)
**Qué va aquí:** Encabezado de la plantilla: «Opportunities & Threats Inventory». Las oportunidades y amenazas del negocio, es decir, la motivación del proyecto. SABSA trata el riesgo como oportunidad y amenaza a la vez (white paper, p. 22). El docente insiste en que aquí van sobre todo **motivadores externos** (mercado, regulación).
**En la matriz:**
- Oportunidad, crecimiento: Bre-B ya suma más de 110 millones de llaves y 245 participantes; conectarse permite captar a quienes hoy usan efectivo.
- Oportunidad, comercios: Los pagos QR abren una línea de negocio con comercios pequeños que hoy solo reciben efectivo.
- Oportunidad, marca: Ser reconocidos como la opción segura en un mercado donde las estafas con Bre-B son noticia.
- Oportunidad, eficiencia: Menos manejo de efectivo y transferencias entre entidades sin costo para el cliente.
- Amenaza, fraude: Estafas por engaño, robo de cuentas y cuentas mula; el pago es inmediato e irrevocable.
- Amenaza, caídas: Una caída se nota de inmediato; los principales participantes estuvieron entre 95,8 % y 99,0 % de disponibilidad en el primer semestre de 2026.
- Amenaza, regulación: Incumplir las reglas del Banco de la República o de la SFC trae sanciones y puede frenar la operación.
- Amenaza, datos y terceros: Filtración de datos personales (Ley 1581) y fallas o compromisos de los proveedores.
**Detalle y justificación:**
- Cifras de Bre-B: 110 M de llaves, 245 participantes (8 de ellos compañías de financiamiento), récord de 10,4 M de transacciones en un día y disponibilidad de los principales participantes entre 95,76 % y 98,95 % (ene–jun 2026). Fuente: presentación oficial del Banco de la República por el primer año de Bre-B (6-oct-2026).
- El vector de fraude local más común es un SMS con un enlace para «aceptar» una transferencia de Bre-B; Bre-B no requiere aceptar nada para recibir (alertas del Banco de la República y de los bancos).
- El Decreto 1069 de 2025 obliga a las entidades con más de 1,5 M de depósitos a ofrecer transferencias inmediatas (*según resúmenes de firmas de abogados; texto oficial por verificar*).
- No se incluyen amenazas técnicas (DDoS, ransomware, vulnerabilidades) con su nombre técnico. Aquí se expresan como «caídas del servicio» o «filtración», que es como las entiende la alta dirección. El nombre técnico aparece desde la capa Conceptual.

## HOW — Business Processes (Inventory of Operational Processes)
**Qué va aquí:** Encabezado de la plantilla: «Inventory of Operational Processes». Los procesos del negocio y las áreas que el proyecto necesita para funcionar. El ejemplo del docente: desarrollo, proveedores de infraestructura, front office comercial, contabilidad («cada transacción tiene que contabilizarse») y seguridad de la información como proceso.
**En la matriz:**
- Vinculación a Bre-B: Acuerdo con un sistema de pago (SPBVI) y habilitación de la cuenta de liquidación en el Banco de la República.
- Desarrollo del producto: Construir llaves, transferencias y QR en la app, con la seguridad incluida desde el diseño.
- Pruebas y certificación: Pruebas internas, de seguridad y de certificación con el sistema de pago antes de salir.
- Aceptación: Marcha blanca con empleados y un grupo cerrado de clientes, y aprobación formal de los sponsors.
- Operación de llaves y pagos: Inscribir, trasladar y bloquear llaves, y atender el envío y la recepción 24/7.
- Prevención y atención del fraude: Detectar, bloquear y devolver según las reglas de Bre-B.
- Conciliación, contabilidad y liquidez: Cuadre diario de lo que se mueve por Bre-B y fondos suficientes en la cuenta de liquidación.
- Comercial, servicio al cliente y cumplimiento: Lanzamiento y vinculación de comercios, atención de reclamos y reportes a la SFC, al Banco de la República y a la UIAF.
**Detalle y justificación:** Ninguna entidad se conecta «directo» al núcleo de Bre-B. Los participantes se vinculan a un **SPBVI** (por ejemplo Transfiya/ACH, Entrecuentas, Redeban, Credibanco, Visionamos o Servibanca), que se conecta al DICE (directorio de llaves) y al MOL (liquidación). La entidad liquida con recursos propios en su cuenta de depósito del Banco de la República. Si el saldo cae por debajo del mínimo, el MOL deja al participante inactivo para originar pagos, de ahí que la liquidez sea un proceso de negocio crítico. Fuentes: Resolución Externa 6/2023 de la JDBR, CRE DSP-465 y CEOS DSP-471 (MOL).

## WHO — Business Governance (Organisational Structure & the Extended Enterprise)
**Qué va aquí:** Encabezado de la plantilla: «Organisational Structure & the Extended Enterprise». La estructura organizacional y la «empresa extendida» (socios, proveedores, reguladores). El docente pone el acento en los **sponsors**, las personas que apalancan la iniciativa porque necesitan su beneficio.
**En la matriz:**
- Sponsors: Junta Directiva, Presidencia y VP Comercial y de Pagos, que patrocinan el proyecto porque mueve el objetivo de crecimiento.
- Dueño del proyecto: {area}.
- Seguridad transversal: La oficina del CISO reporta a Presidencia y no a Tecnología, para acompañar a todas las áreas sin conflicto de intereses.
- Áreas de negocio: Comercial y Mercadeo, Operaciones, Contabilidad, Finanzas y Tesorería, y Servicio al cliente.
- Áreas de soporte: Tecnología, Prevención de fraude, Jurídico y Talento humano (perfiles de cargo y formación).
- Segunda línea de defensa: Riesgos (SIAR), Cumplimiento (SARLAFT) y Oficial de Protección de Datos.
- Empresa extendida: Banco de la República (DICE y MOL), el sistema de pago al que se conecta, el proveedor de nube, la validación de identidad y los operadores móviles.
- Clientes y entes de control: Personas y comercios; SFC y SIC.
**Detalle y justificación:** El docente lo dijo explícitamente: cuando seguridad depende del director de tecnología «no funciona muy bien», porque tecnología termina limitando a seguridad; la seguridad es transversal y toca todas las áreas. La SFC también pide que la unidad de ciberseguridad reporte a la junta y a la alta dirección al menos cada semestre, con presupuesto separado del de TI (CBJ, P.I, T.IV, Cap. V).

## WHERE — Business Geography (Inventory of Buildings, Sites, Territories, Jurisdictions)
**Qué va aquí:** Encabezado de la plantilla: «Inventory of Buildings, Sites, Territories, Jurisdictions, etc». Sedes, sitios, territorios y jurisdicciones, sin entrar en detalle técnico. En el ejemplo del docente: «oficina en Bogotá, centro de datos en Siberia, alterno en Cali».
**En la matriz:**
- Sede principal: Bogotá, donde están el equipo del proyecto, la operación y la atención al cliente.
- Centros de datos: Uno principal y uno alterno del proveedor tecnológico, para no depender de un solo sitio.
- Banco de la República: Donde se registran las llaves y se liquidan los pagos.
- Canales: App móvil para personas y QR para comercios en todo el país.
- Jurisdicción: Colombia, bajo la SFC, el Banco de la República y la SIC; si los datos se alojan fuera del país, aplican las reglas de transferencia internacional de datos.
- Trabajo remoto: Parte del equipo trabaja desde casa, lo cual extiende el perímetro de la empresa.
**Detalle y justificación:** La transferencia internacional de datos (Ley 1581, art. 26, y la lista de países adecuados de la SIC) importa porque los centros de datos de la nube suelen estar fuera de Colombia.

## WHEN — Business Time Dependence (Time dependencies of business objectives)
**Qué va aquí:** Encabezado de la plantilla: «Time dependencies of Business objectives». Cuándo necesita el negocio cada objetivo de la columna WHAT. En la primera clase el docente mostró tiempos de proyecto (entrega de canales, desarrollo, marcha blanca); en el ejercicio corrigió que aquí manda la fecha que exige el dueño para cada objetivo.
**En la matriz:**
- Lanzamiento de Bre-B: La Junta lo necesita en el mercado en el cuarto trimestre de 2027, antes de la temporada decembrina.
- Crecimiento: Duplicar los clientes activos a diciembre de 2027, con la captación medida mes a mes desde el lanzamiento.
- Servicio siempre disponible: 24/7 desde el primer día, y cada pago en menos de 20 segundos (el Banco de la República lo exige en el 99,5 % de las operaciones).
- Fraude controlado: Por debajo de 5 pb desde el lanzamiento, revisado cada mes por la Junta.
- Confianza del cliente: Devolución por fraude en máximo 10 días de investigación y 2 días hábiles para devolver.
- Cumplimiento: Reportes a la SFC y al Banco de la República en los plazos que fija cada norma.
- Reputación: Ser reconocidos como la billetera más segura a 2030, como lo plantea la visión.
**Detalle y justificación:** Corrección del profesor en clase: esta celda es la **dependencia de tiempo de los objetivos del negocio**, no el cronograma de implementación. «Tú no le dices al dueño cuándo lo vamos a implementar; el dueño dice ‹la necesito para tal mes›», y «lo que definas en objetivos son los tiempos que me vas a definir acá». Por eso cada bullet corresponde a un objetivo de la columna WHAT, con la fecha o meta que exige el negocio. Las fases del proyecto (vinculación, desarrollo, certificación, marcha blanca) quedan como plan de trabajo en el diagrama de alineación del deck y como fechas límite de cada servicio en `3-logical.md` (WHEN). La DSP-465 (versión del 31-mar-2026) exige completar el pago en máximo 20 s en el 99,5 % de las operaciones, medido cada semana, y fija el procedimiento de devolución por fraude. El resto de las fechas y metas son supuestos del caso.

## Trazabilidad
- **Hacia abajo:**
  - Confianza: Pasa a los atributos «resistente al fraude», «confidencial» y «autenticado» (Conceptual), y de ahí a los servicios de autenticación y antifraude (Logical).
  - 24/7 y 20 s: Pasan a los atributos «disponible» y «oportuno» (Conceptual), al servicio de continuidad (Logical) y al RTO/RPO (Physical).
- **Hacia arriba:** Cada fila de esta capa responde a la misión, la visión y el objetivo estratégico de `../caso.yaml`.

## Fuentes
- Banco de la República: [presentación de Bre-B por el primer año (6-oct-2026)](https://banrep.gov.co/sites/default/files/publicaciones/archivos/presentacion-bre-b-un-anio.pdf), [Boletín 10/2026 (DSP-465)](https://banrep.gov.co/es/normatividad/junta-directiva/boletin-10-2026-bre-b), [PR-DSP-008](https://www.banrep.gov.co/sites/default/files/reglamentacion/archivos/proyecto-regulacion-pr-dsp-008.pdf), [Resolución Externa 6/2023](https://www.banrep.gov.co/es/noticias/regulacion-interoperabilidad-sistemas-pagos-bajo-valor), [Compendio DSP-471 (MOL)](https://www.banrep.gov.co/es/normatividad/compendios/dsp-471).
- [Portafolio, infraestructura de Bre-B (nodos certificados)](https://www.portafolio.co/mis-finanzas/ahorro/la-infraestructura-tecnologica-que-hizo-posible-el-despegue-de-bre-b-en-colombia-495704).
- [Brigard Urrutia sobre el Decreto 1069 de 2025](https://www.bu.com.co/es/insights/noticias/pagos-inmediatos-entra-en-vigor-el-decreto-1069-de-2025).
