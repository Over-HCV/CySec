---
capa: contextual
vista: Business View (negocio)
rol: Junta Directiva - Presidencia - VP Comercial y de Pagos (sponsors)
responsable: >-
  La responsabilidad de esta capa es de la Junta Directiva, la Presidencia y la VP Comercial y de Pagos. Ellos fijan la orientación del proyecto, aprueban la inversión y definen la meta de crecimiento y cuánto riesgo está dispuesta a aceptar la compañía. La {area} alinea la vinculación a Bre-B con esas decisiones para que el proyecto responda a lo que esperan los clientes y los accionistas.
con_quien_se_habla: Alta dirección. Se pregunta para qué es el proyecto, a quién sirve, qué gana y qué arriesga el negocio.
voz: Le hablamos a la Junta, a la Presidencia y a la VP Comercial y de Pagos en términos de negocio (ver 0-organigrama.md)
---
# Capa Contextual — requisitos de negocio

> Esta capa describe el negocio en el que vive el proyecto, sin nada técnico (white paper SABSA, pp. 10–11). El docente la plantea como si el dueño del negocio estuviera sentado enfrente: qué se busca, por qué, con qué procesos y áreas, quién patrocina, dónde y en qué tiempos. Es la capa "más sencilla", pero ninguna arquitectura que se la salte sale bien.

## WHAT — Business Decisions (Taxonomy of Business Assets, including Goals & Objectives)
**Qué va aquí:** Encabezado de la plantilla: "Taxonomy of Business Assets, including Goals & Objectives". Los activos del negocio y los objetivos del proyecto, en lenguaje de alta dirección (marca, confianza, continuidad, cumplimiento). Según el docente: "¿será que es técnico? No; es muy alto negocio".
**En la matriz:**

Con Bre-B {empresa} quiere que sus clientes le paguen a cualquier banco o billetera desde la app, al instante, a cualquier hora y sin costo. Con eso busca atraer a las personas y los comercios que hoy usan efectivo y crecer 25 % en clientes activos a diciembre de 2028 sin que el fraude pase de 5 puntos básicos del valor transado y sin salirse de las reglas del Banco de la República y de la SFC.

Para lograrlo tiene que cuidar lo que sostiene el negocio. El activo principal es la confianza de los clientes porque la gente solo mueve su plata donde sabe que está segura. Detrás de esa confianza están los fondos y las cuentas de los clientes, su información personal y transaccional y la plataforma que procesa los pagos. Todo eso tiene que mantenerse confidencial, íntegro y disponible porque si falla uno de los tres la reputación y el crecimiento se caen con él.

**Para la presentación:**
- Activos del negocio:
  - Confianza y reputación de los clientes: Es el activo principal porque la gente solo mueve su plata donde sabe que está segura.
  - Fondos, cuentas e información: Los fondos, las cuentas digitales, las llaves y la información financiera de los clientes. Todo eso debe mantenerse confidencial, íntegro y disponible.
  - Plataforma de pagos inmediatos: La plataforma tecnológica y la capacidad operativa para registrar llaves y procesar pagos por Bre-B.
- Objetivos:
  - Lanzamiento de Bre-B: Que los clientes le paguen a cualquier banco o billetera desde la app, al instante y sin costo.
  - Crecimiento: Captar a quienes hoy usan efectivo y crecer 25 % en clientes activos a diciembre de 2028.
  - Servicio siempre disponible: Operar 24/7 con 99.9 % de disponibilidad al mes y pagos que llegan en menos de 20 segundos.
  - Fraude controlado: Crecer con el fraude por debajo de 5 puntos básicos del valor transado.
  - Cumplimiento: Operar dentro de las reglas del Banco de la República y de la SFC porque sin eso no hay permiso para operar.
**Detalle y justificación:** Asesoría del docente (nov-2026): Cada objetivo dice qué se gana y la seguridad se nombra con los tres pilares (confidencialidad, integridad y disponibilidad), que es el concepto que entiende la alta dirección. El grupo de activos del negocio sale de la propuesta de Sergio (confianza y reputación, fondos e información, cuentas y llaves, plataforma y capacidad operativa) y responde a la primera mitad del encabezado ("Taxonomy of Business Assets"). De su lista se ajustaron dos cosas: "gestionar llaves ante el DICE" quedó sin la sigla porque en esta capa no va nada técnico y "liquidaciones inferiores a 20 segundos" quedó como pagos en menos de 20 segundos porque los 20 s miden el pago completo y no solo la liquidación. El orden responde a la visión ("reconocida por la seguridad de sus pagos") y al objetivo estratégico ("crecer 25 % en clientes activos **sin pasar el tope de fraude**"). Por eso la confianza va antes que el crecimiento: el crecimiento sin confianza no se sostiene en pagos inmediatos, donde el dinero no se puede reversar. El tope de 5 pb es un supuesto del caso.

## WHY — Business Risk (Opportunities & Threats Inventory)
**Qué va aquí:** Encabezado de la plantilla: "Opportunities & Threats Inventory". Las oportunidades y amenazas del negocio, es decir, la motivación del proyecto. SABSA trata el riesgo como oportunidad y amenaza a la vez (white paper, p. 22). El docente insiste en que aquí van sobre todo **motivadores externos** (mercado, regulación).
**En la matriz:**

Bre-B es una oportunidad que ya está probada. En su primer año llegó a 110 millones de llaves y 245 entidades conectadas y el efectivo pasó de ser el medio principal de pago del 90 % de la población en 2019 al 66 % en 2026. Si {empresa} se conecta podría captar a esa tercera parte que todavía paga en efectivo, llegar con pagos QR a los comercios pequeños y competir como la opción segura en un mercado donde las estafas con Bre-B son noticia. Además el cliente transfiere sin costo y la compañía maneja menos efectivo.

Ese mismo crecimiento trae amenazas. Como el pago es inmediato la plata no se puede reversar y el engaño o el robo de cuentas le pegan directo al cliente. Las caídas se notan de una vez y en el primer semestre de 2026 los principales participantes estuvieron entre 95.8 % y 99.0 % de disponibilidad. A eso se suman las sanciones por incumplir al Banco de la República o a la SFC, la filtración de datos personales y la falla de un proveedor. Cualquiera de ellas se traduciría en pérdidas y en daño a la marca.

**Para la presentación:**
- Oportunidades:
  - Crecimiento: Bre-B ya tiene más de 110 millones de llaves y 245 participantes, si los conectamos pueden captar a quienes hoy usan efectivo.
  - Inclusión financiera y comercios: Con los pagos QR llegan a los comercios pequeños que hoy solo reciben efectivo.
  - Competitividad y marca: Pueden ser la opción segura en un mercado donde las estafas con Bre-B son noticia.
  - Eficiencia: Manejan menos efectivo y el cliente transfiere a otras entidades sin costo.
- Amenazas:
  - Fraude: A los clientes los pueden engañar o robarles la cuenta y como el pago es inmediato la plata no se puede reversar.
  - Caídas: Una caída se nota de inmediato, los principales participantes estuvieron entre 95.8 % y 99.0 % de disponibilidad en el primer semestre de 2026.
  - Regulación: Si incumplen las reglas del Banco de la República o de la SFC los sancionan y les pueden frenar la operación.
  - Datos y terceros: Se pueden filtrar datos personales de los clientes (Ley 1581) o puede fallar un proveedor.
**Detalle y justificación:**
- Aporte de Sergio: De su lista de motivaciones entraron la inclusión financiera y la competitividad. Se mantuvo la separación entre oportunidades y amenazas porque el docente pidió las dos explícitas y en su lista las amenazas quedaban implícitas (prevenir el fraude, garantizar la continuidad).
- Cifras de Bre-B: 110 M de llaves, 245 participantes (8 de ellos compañías de financiamiento), récord de 10.4 M de transacciones en un día y disponibilidad de los principales participantes entre 95.76 % y 98.95 % (ene–jun 2026). El efectivo como principal instrumento de pago bajó del 90 % de la población en 2019 al 66 % en 2026. El tiempo máximo de Bre-B es 20 s (Pix 10 s, SPEI 30 s). Fuente: presentación oficial del Banco de la República por el primer año de Bre-B (6-oct-2026).
- El vector de fraude local más común es un SMS con un enlace para "aceptar" una transferencia de Bre-B; Bre-B no requiere aceptar nada para recibir (alertas del Banco de la República y de los bancos).
- El Decreto 1069 de 2025 obliga a las entidades con más de 1.5 M de depósitos a ofrecer transferencias inmediatas (*según resúmenes de firmas de abogados; texto oficial por verificar*).
- No se incluyen amenazas técnicas (DDoS, ransomware, vulnerabilidades) con su nombre técnico. Aquí se expresan como "caídas del servicio" o "filtración", que es como las entiende la alta dirección. El nombre técnico aparece desde la capa Conceptual.

## HOW — Business Processes (Inventory of Operational Processes)
**Qué va aquí:** Encabezado de la plantilla: "Inventory of Operational Processes". Los procesos del negocio y las áreas que el proyecto necesita para funcionar. El ejemplo del docente: desarrollo, proveedores de infraestructura, front office comercial, contabilidad ("cada transacción tiene que contabilizarse") y seguridad de la información como proceso.
**En la matriz:**

Para llegar al lanzamiento {empresa} pasaría por cuatro procesos de proyecto. Primero la vinculación, que integra sus sistemas con el ecosistema Bre-B a través de un sistema de pago autorizado y de su cuenta en el Banco de la República. Luego vienen el desarrollo de las transferencias por llaves y los pagos QR en la app, las pruebas con empleados y con un grupo cerrado de clientes y la aceptación de los sponsors antes de salir al público. En cada uno la seguridad entra desde el diseño y no al final.

Ya en operación los procesos del negocio son el registro de llaves, el envío y la recepción de pagos las 24 horas, la prevención y atención del fraude, el cuadre diario y la liquidez, la vinculación de comercios, la atención de reclamos y los reportes a las autoridades. En todos ellos la integración con Bre-B tendría que ser segura: Confidencial para que nadie vea lo que no le toca, íntegra para que ningún pago cambie en el camino y disponible todo el tiempo, con registro de cada transacción para poder auditarla.

**Para la presentación:**
- Procesos del proyecto:
  - Vinculación: Integrar los sistemas de la entidad con el ecosistema Bre-B a través de un sistema de pago autorizado y de la cuenta en el Banco de la República.
  - Desarrollo: Construir en la app las transferencias por llaves y los pagos QR con la seguridad desde el principio.
  - Pruebas y aceptación: Probar con empleados y con un grupo cerrado de clientes, solo se sale al público cuando los sponsors aprueban.
- Procesos de la operación:
  - Llaves y pagos: Registro de llaves, consulta de beneficiarios y envío, recepción y confirmación de pagos las 24 horas.
  - Fraude: Detectar el engaño, frenar el pago y devolverle la plata al cliente cuando corresponde.
  - Contabilidad y liquidez: Cuadre diario de lo que se movió y plata suficiente en la cuenta del Banco de la República.
  - Comercial, servicio y cumplimiento: Vincular comercios, atender reclamos y reportarles a las autoridades.
- Seguridad y auditoría: En todos estos procesos se cuida la confidencialidad, la integridad y la disponibilidad y queda registro de cada transacción para poder auditarla.
**Detalle y justificación:** Asesoría del docente (nov-2026): Esta celda se le confundió entre lo técnico y lo de negocio, por eso salieron de aquí las siglas SPBVI, DICE y MOL (siguen explicadas en este detalle) y se agregó el bullet de seguridad y auditoría en términos de los tres pilares. De la propuesta de Michael salen la vinculación dicha como integración de los sistemas de la entidad con el ecosistema Bre-B y los procesos de la operación (registro de llaves, consulta de beneficiarios, envío, recepción y confirmación de pagos). Se dejaron además los procesos del proyecto (desarrollo, pruebas y aceptación) porque el docente los había pedido en el ejercicio de clase. Ninguna entidad se conecta "directo" al núcleo de Bre-B. Los participantes se vinculan a un **SPBVI** (por ejemplo Transfiya/ACH, Entrecuentas, Redeban, Credibanco, Visionamos o Servibanca), que se conecta al DICE (directorio de llaves) y al MOL (liquidación). La entidad liquida con recursos propios en su cuenta de depósito del Banco de la República. Si el saldo cae por debajo del mínimo, el MOL deja al participante inactivo para originar pagos, de ahí que la liquidez sea un proceso de negocio crítico. Fuentes: Resolución Externa 6/2023 de la JDBR, CRE DSP-465 y CEOS DSP-471 (MOL).

## WHO — Business Governance (Organisational Structure & the Extended Enterprise)
**Qué va aquí:** Encabezado de la plantilla: "Organisational Structure & the Extended Enterprise". La estructura organizacional y la "empresa extendida" (socios, proveedores, reguladores). El docente pone el acento en los **sponsors**, las personas que apalancan la iniciativa porque necesitan su beneficio.
**En la matriz:**

Los accionistas esperan que la compañía crezca sin perder plata por un fraude o una sanción y la Junta Directiva, la Presidencia y la VP Comercial y de Pagos patrocinan el proyecto porque mueve esa meta. La {area} es la dueña y responde por sacarlo adelante con Tecnología, Operaciones, Finanzas, Seguridad de la Información y Servicio al cliente mientras Riesgos, Cumplimiento y Jurídico cuidan las obligaciones regulatorias.

Por fuera de la compañía el proyecto les importa a los clientes (personas y comercios que pagan y cobran con {empresa}), a las demás entidades del ecosistema y a los proveedores que lo hacen posible: El sistema de pago que conecta a {empresa} con Bre-B, el proveedor de nube y el de validación de identidad. También les importa al Banco de la República (que administra Bre-B) y a la SFC y la SIC (que vigilan a la compañía). La seguridad de los pagos depende tanto de lo que se haga adentro como de la coordinación con todos ellos.

**Para la presentación:**
- Sponsors y dueños:
  - Accionistas: Son los dueños y esperan que la compañía crezca sin perder plata por un fraude o una sanción.
  - Sponsors: La Junta Directiva, la Presidencia y la VP Comercial y de Pagos patrocinan el proyecto porque mueve la meta de crecimiento.
  - Dueño del proyecto: La {area} responde por sacarlo adelante.
- Áreas interesadas:
  - De negocio: Comercial y Mercadeo, Operaciones, Finanzas y Tesorería, Contabilidad y Servicio al cliente.
  - De apoyo y control: Tecnología, Ciberseguridad (el CISO le reporta a Presidencia y no a Tecnología), Prevención de fraude, Jurídico, Talento humano, Riesgos y Cumplimiento.
- Empresa extendida:
  - Clientes: Personas naturales y empresas o comercios que pagan y cobran con la entidad.
  - Autoridades: El Banco de la República, la SFC y la SIC.
  - Proveedores y aliados: El sistema de pago que los conecta, el proveedor de nube, el de validación de identidad y los operadores móviles.
**Detalle y justificación:** Asesoría del docente (nov-2026): Aquí van los sponsors y los altos niveles (dueños, Junta, accionistas, clientes, proveedores) y las áreas interesadas en general, no los roles del equipo del proyecto. Por eso se agregaron los accionistas. De la propuesta de Michael sale nombrar a los clientes como personas naturales y empresas. Su lista incluía arquitectura como área, que no se dejó aquí porque es un rol del equipo del proyecto y aparece en las capas de abajo. El docente lo dijo explícitamente: cuando seguridad depende del director de tecnología "no funciona muy bien", porque tecnología termina limitando a seguridad; la seguridad es transversal y toca todas las áreas. La SFC también pide que la unidad de ciberseguridad reporte a la junta y a la alta dirección al menos cada semestre, con presupuesto separado del de TI (CBJ, P.I, T.IV, Cap. V).

## WHERE — Business Geography (Inventory of Buildings, Sites, Territories, Jurisdictions)
**Qué va aquí:** Encabezado de la plantilla: "Inventory of Buildings, Sites, Territories, Jurisdictions, etc". Sedes, sitios, territorios y jurisdicciones, sin entrar en detalle técnico. En el ejemplo del docente: "oficina en Bogotá, centro de datos en Siberia, alterno en Cali".
**En la matriz:**

La sede principal de {empresa} está en Bogotá y desde allí se dirigen el proyecto, la operación y la atención al cliente. Parte del equipo trabaja desde la casa así que la empresa se extiende más allá de la oficina. El servicio en cambio es nacional porque personas y comercios de cualquier región pagarían desde la app o con un QR sin depender de una oficina.

La plataforma correría en la nube con un centro de datos principal y uno alterno en Estados Unidos y se conectaría con Bre-B desde un punto en Bogotá. El Banco de la República, también en Bogotá, administra el directorio de llaves y el sistema donde se liquidan los pagos y el sistema de pago tiene sus propios centros de datos. Rige la ley colombiana (SFC, Banco de la República y SIC) y como los datos de los clientes viajarían a Estados Unidos cuenta que la SIC lo reconoce como un país con nivel adecuado de protección.

**Para la presentación:**
- Sede principal: Bogotá, donde trabajan el equipo del proyecto, la operación y la atención al cliente.
- Centros de datos: En la nube y fuera de Colombia (uno principal y uno alterno en EE. UU.) para no depender de un solo sitio.
- Punto de conexión en Bogotá: Un centro de datos de un tercero donde la nube de {empresa} se conecta con el sistema de pago.
- Banco de la República (Bogotá): Allá están el directorio de llaves y el sistema donde se liquidan los pagos.
- Sistema de pago: La entidad que los conecta con Bre-B tiene sus propios centros de datos.
- Canales: La app para personas y el QR en los comercios de todo el país.
- Jurisdicción: Rige Colombia (SFC, Banco de la República y SIC) y como los datos viajan a EE. UU. cuenta que la SIC lo reconoce como país con protección adecuada.
- Trabajo remoto: Parte del equipo trabaja desde la casa y eso extiende la empresa más allá de la oficina.
**Detalle y justificación:** La transferencia internacional de datos (Ley 1581, art. 26, y la lista de países adecuados de la SIC) importa porque los centros de datos de la nube suelen estar fuera de Colombia.

## WHEN — Business Time Dependence (Time dependencies of business objectives)
**Qué va aquí:** Encabezado de la plantilla: "Time dependencies of Business objectives". Cuándo necesita el negocio cada objetivo de la columna WHAT. En la primera clase el docente mostró tiempos de proyecto (entrega de canales, desarrollo, marcha blanca); en el ejercicio corrigió que aquí manda la fecha que exige el dueño para cada objetivo.
**En la matriz:**

La Junta necesita a {empresa} en Bre-B en el cuarto trimestre de 2027 (antes de la temporada decembrina) y la meta de crecimiento se mide a diciembre de 2028 con un 25 % más de clientes activos. Desde el primer día el servicio tendría que estar disponible las 24 horas con una meta interna de 99.9 % al mes y cada pago tendría que llegar en máximo 20 segundos en al menos el 99.5 % de los casos, que es lo que exige el Banco de la República.

Los momentos que más pesan son las quincenas, las primas y diciembre porque es cuando más plata se mueve y cuando más se intenta el fraude. Ante un fraude hay máximo 10 días calendario para investigar y la devolución sale en los 2 días hábiles siguientes. Cada mes la Junta revisaría la disponibilidad, las pérdidas por fraude y el crecimiento, cada semana se le reporta al Banco de la República el indicador de los 20 segundos y la meta de largo plazo es que en 2030 reconozcan a {empresa} como la billetera más segura.

**Para la presentación:**
- Lanzamiento de Bre-B: La Junta lo necesita en el mercado en el cuarto trimestre de 2027 antes de la temporada decembrina.
- Picos del negocio: En quincenas, primas y diciembre es cuando más plata se mueve y cuando más se intenta el fraude.
- Crecimiento: 25 % más clientes activos a diciembre de 2028 con la captación medida mes a mes desde el lanzamiento.
- Servicio siempre disponible: 24/7 desde el primer día con 99.9 % al mes y cada pago en máximo 20 segundos en al menos el 99.5 % de los casos (lo exige el Banco de la República).
- Fraude controlado: Por debajo de 5 puntos básicos desde el lanzamiento y revisado cada mes por la Junta.
- Confianza de los clientes: Ante un fraude hay máximo 10 días calendario para investigar y la devolución sale en los 2 días hábiles siguientes a la confirmación.
- Cumplimiento: Cada semana se le muestra al Banco de la República el indicador de los 20 segundos y a la SFC se le reportan los incidentes.
- Reputación: Ser reconocidos como la billetera más segura a 2030.
**Detalle y justificación:** Corrección del profesor en clase: esta celda es la **dependencia de tiempo de los objetivos del negocio**, no el cronograma de implementación. "Tú no le dices al dueño cuándo lo vamos a implementar; el dueño dice 'la necesito para tal mes'", y "lo que definas en objetivos son los tiempos que me vas a definir acá". Por eso cada bullet corresponde a un objetivo de la columna WHAT, con la fecha o meta que exige el negocio. Las fases del proyecto (vinculación, desarrollo, certificación, marcha blanca) quedan como plan de trabajo en el diagrama de alineación del deck y como fechas límite de cada servicio en `3-logical.md` (WHEN). La DSP-465 (versión del 31-mar-2026) exige completar el pago en máximo 20 s en el 99.5 % de las operaciones, medido cada semana, y fija el procedimiento de devolución por fraude. Las metas propias se escogieron para que sean factibles: 99.9 % de disponibilidad al mes queda por encima del mejor de los principales participantes en el primer semestre de 2026 (98.95 %) y al nivel del directorio de llaves (99.94 %), en un momento en que el Banco de la República todavía tiene pendiente definir los acuerdos de nivel de servicio de los participantes (Banco de la República, "Bre-B: del diseño a la realidad", 6-oct-2026). El 25 % de crecimiento a diciembre de 2028 es conservador frente al 70 % anual de Nu Colombia en 2025 y frente al 34 % de la población que todavía paga principalmente en efectivo. El tope de 5 pb de fraude lo fija la Junta como apetito de riesgo. Las fuentes de cada cifra quedan en el guion.

## Trazabilidad
- **Hacia abajo:**
  - Confianza: Pasa a los atributos "resistente al fraude", "confidencial" y "autenticado" (Conceptual), y de ahí a los servicios de autenticación y antifraude (Logical).
  - 24/7 y 20 s: Pasan a los atributos "disponible" y "oportuno" (Conceptual), al servicio de continuidad (Logical) y al RTO/RPO (Physical).
- **Hacia arriba:** Cada fila de esta capa responde a la misión, la visión y el objetivo estratégico de `../caso.yaml`.

## Fuentes
- Banco de la República: [presentación de Bre-B por el primer año (6-oct-2026)](https://banrep.gov.co/sites/default/files/publicaciones/archivos/presentacion-bre-b-un-anio.pdf), [Boletín 10/2026 (DSP-465)](https://banrep.gov.co/es/normatividad/junta-directiva/boletin-10-2026-bre-b), [PR-DSP-008](https://www.banrep.gov.co/sites/default/files/reglamentacion/archivos/proyecto-regulacion-pr-dsp-008.pdf), [Resolución Externa 6/2023](https://www.banrep.gov.co/es/noticias/regulacion-interoperabilidad-sistemas-pagos-bajo-valor), [Compendio DSP-471 (MOL)](https://www.banrep.gov.co/es/normatividad/compendios/dsp-471).
- [Portafolio, infraestructura de Bre-B (nodos certificados)](https://www.portafolio.co/mis-finanzas/ahorro/la-infraestructura-tecnologica-que-hizo-posible-el-despegue-de-bre-b-en-colombia-495704).
- [Brigard Urrutia sobre el Decreto 1069 de 2025](https://www.bu.com.co/es/insights/noticias/pagos-inmediatos-entra-en-vigor-el-decreto-1069-de-2025).
