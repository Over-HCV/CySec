---
capa: logical
vista: Designer's View (diseñador)
rol: CISO y Arquitecto de Seguridad
responsable: >-
  La responsabilidad de esta capa es del CISO con el Arquitecto de Seguridad. El arquitecto convierte las políticas y estrategias de la capa conceptual en servicios de seguridad, flujos, dominios y perfiles y el CISO aprueba que cada servicio cubra un objetivo de control. Con la Dirección de Plataforma acuerdan qué servicios se construyen primero según el cronograma del proyecto.
con_quien_se_habla: El CISO y el arquitecto de seguridad. La información ya es técnica, pero se expresa como servicios de seguridad, no como productos.
voz: Hablamos con el CISO y el Arquitecto de Seguridad (ver 0-organigrama.md)
---
# Capa Logical — servicios de seguridad

> En esta capa el negocio se modela como un sistema mediante **servicios de seguridad** lógicos, reutilizables e independientes de la tecnología: autenticación, confidencialidad, integridad, no repudio (white paper SABSA, p. 12). El docente insistió en la diferencia: "**autenticación** es el servicio; usuario y contraseña, OTP, doble factor y reconocimiento facial son **controles** de ese servicio". Su recomendación: "saquen un listado de servicios y comiencen a identificar qué servicios van a necesitar para su proyecto; eso les permite definir los controles". Los controles concretos van en la capa Physical.

## WHAT — Information Assets (Inventory of Information Assets)
**Qué va aquí:** Encabezado de la plantilla: "Inventory of Information Assets". El inventario de activos de información, es decir, los componentes de la solución que manejan información. En el ejemplo del docente: software de datos de mercado, OMS, interfaz de usuario, canales dedicados y bases de datos.
**En la matriz:**

La información que hay que proteger es de tres tipos. La transaccional son los pagos enviados y recibidos con su monto, su destinatario y su puntaje de fraude. La de clientes es clasificada y reúne la identidad, la biometría como plantilla, las llaves y los saldos. La tercera son las llaves criptográficas, los secretos y los registros de auditoría porque con las llaves alguien podría suplantar a {empresa} ante el sistema de pago y los registros son la evidencia de cada operación.

Esa información vive en los componentes del sistema. Las bases de datos guardan lo de clientes y lo transaccional. La app móvil, las APIs y su código fuente son por donde entra el cliente así que si el código se altera o se filtra se compromete el producto. El motor de pagos, el servicio de llaves y el motor antifraude deciden si la plata sale y a qué cuenta va. La conexión con el sistema de pago es el canal por donde salen los pagos y todo corre sobre la red y la plataforma en la nube.

**Para la presentación:**
- Información:
  - Transaccional: Los pagos enviados y recibidos con sus montos, destinatarios y puntaje de fraude.
  - De clientes (clasificada): La identidad, la biometría como plantilla, las llaves y los saldos.
  - Llaves criptográficas, secretos y registros de auditoría: Con las llaves se podría suplantar a {empresa} ante el sistema de pago y los registros son la evidencia de cada operación.
- Componentes del sistema:
  - Bases de datos: Donde se guarda la información de clientes y la transaccional.
  - App móvil, APIs y su código fuente: Es por donde entra el cliente, si el código se altera o se filtra se compromete todo el producto.
  - Motor de pagos, servicio de llaves y motor antifraude: Los servicios que deciden si la plata sale y a qué cuenta va.
  - Conexión con el sistema de pago: El canal por donde salen los pagos y se liquidan en el Banco de la República.
  - Red y plataforma en la nube: Los servidores y las redes donde corre todo lo anterior.
**Detalle y justificación:** Asesoría del docente (nov-2026): En esta celda se describen también los componentes del sistema, por eso se agregaron las bases de datos y la red y plataforma en la nube. Corrección del profesor en clase: el inventario de activos de **información** incluye "una base de datos, el código de la aplicación, información transaccional, información clasificada". Ya no es una capa de negocio: aquí se baja al inventario de la información que compone la aplicación. Esta celda se encadena hacia abajo con el **diccionario de datos** (`4-physical.md`, WHAT) y luego con los **repositorios** (`5-component.md`, WHAT). El orden sigue el impacto si el activo se compromete.

## WHY — Risk Management Policies (Domain Policies)
**Qué va aquí:** Encabezado de la plantilla: "Domain Policies". Las políticas de cada dominio, es decir, los lineamientos de la alta dirección aplicados al proyecto. El docente: "acá me definen las políticas, política, política, política; no el texto, las ideas y lo que van a necesitar" (como un mapa mental).
**En la matriz:**

Cada objetivo de control de la capa de arriba se vuelve una política de dominio. La de autenticación pide doble factor fuerte para entrar, para pagar y para todo trámite con llaves. La de límites fija topes por perfil de riesgo, un límite nocturno y un tope bajo para equipos nuevos. La de gestión de llaves obliga a probar la titularidad antes de inscribir o trasladar una llave y a avisarle al canal anterior y la antifraude define el bloqueo de llaves por fraude y la devolución según las reglas de Bre-B.

La política criptográfica exige que todo canal vaya cifrado (también la integración con el sistema de pago) y que los datos sensibles se cifren en reposo con las llaves bajo custodia dedicada. La de acceso privilegiado pide mínimo privilegio, acceso temporal y aprobado y sesiones grabadas y la de respaldo pide copias protegidas contra borrado con pruebas periódicas de recuperación. Las de soporte cubren privacidad y retención, desarrollo seguro, terceros y uso de IA.

**Para la presentación:**
- Políticas:
  - Autenticación: Doble factor fuerte para entrar, para pagar y para todo trámite con llaves.
  - Límites transaccionales: Topes por perfil de riesgo, un límite nocturno y un tope bajo para equipos nuevos.
  - Gestión de llaves: Probar la titularidad antes de inscribir o trasladar una llave y avisarle al canal anterior.
  - Antifraude: Bloqueo de llaves por fraude y devolución según las reglas de Bre-B.
  - Criptográfica: Todo canal cifrado y los datos sensibles cifrados en reposo con las llaves bajo custodia dedicada.
  - Acceso privilegiado: Mínimo privilegio, acceso temporal y aprobado y sesiones grabadas.
  - Respaldo y recuperación: Copias protegidas contra borrado y pruebas periódicas de recuperación.
  - De soporte: Privacidad y retención de datos, desarrollo seguro, terceros y uso de IA.
**Detalle y justificación:** Cada política responde a un objetivo de control de Conceptual WHY. Los límites se inspiran en Pix (límite nocturno de R$1000 entre las 20:00 y las 6:00, y tope para equipo no registrado de R$200 por transacción, Res. BCB 403/2024). La DSP-465 permite que el participante fije topes inferiores a los 1000 UVB según su política de riesgo.

## HOW — Process Maps & Services (Information Flows; Functional Transformations; Service Oriented Architecture)
**Qué va aquí:** Encabezado de la plantilla: "Information Flows; Functional Transformations; Service Oriented Architecture". Los **flujos de información más relevantes** y los **servicios de seguridad** que los protegen. El docente: "acá no vamos a montar los 200 flujos; necesitamos los más relevantes y qué controles de seguridad llevan".
**En la matriz:**

Lo que arriba era vincular a {empresa} con Bre-B aquí es una aplicación en la nube que consume la API del sistema de pago por un canal dedicado y con mensajes firmados. En un pago por llave el flujo pasa por autenticación fuerte, resolución de la llave con privacidad, antifraude, firma y no repudio, mensajería interbancaria segura y notificación. Al recibir plata pasa por el antifraude de recepción que busca cuentas mula, al inscribir o trasladar una llave por autenticación fuerte y verificación de titularidad y en un pago QR por la verificación de integridad del código antes del antifraude.

El acceso administrativo pasa siempre por la gestión de accesos privilegiados con registro de la sesión. Por debajo de todos los flujos corren los servicios transversales de monitoreo y respuesta a incidentes, protección de datos, desarrollo seguro, continuidad, gestión de vulnerabilidades y seguridad de terceros. La integración solo se habilita cuando la certificación con el sistema de pago y las pruebas de seguridad salen bien.

**Para la presentación:**
- Integración con el sistema de pago: La aplicación en la nube consume la API del sistema de pago por un canal dedicado y con mensajes firmados.
- Flujos:
  - Pago por llave: Autenticación fuerte → resolución de la llave con privacidad → antifraude → firma y no repudio → mensajería interbancaria segura → notificación.
  - Recepción de fondos: Antifraude de recepción (detección de cuentas mula) → notificación al cliente.
  - Inscripción o traslado de llave: Autenticación fuerte → verificación de titularidad → aviso al canal anterior.
  - Pago QR a comercio: Verificación de integridad del QR → antifraude → notificación.
  - Acceso administrativo: Gestión de accesos privilegiados → registro y monitoreo de la sesión.
- Servicios transversales: Monitoreo y respuesta a incidentes, protección de datos, desarrollo seguro, continuidad, gestión de vulnerabilidades y seguridad de terceros.
**Detalle y justificación:** Asesoría del docente (nov-2026): El primer bullet baja un nivel lo que en Contextual es "vincularnos a Bre-B", aquí ya es una aplicación que consume una API.
**Detalle y justificación — catálogo de servicios → controles:**

| # | Servicio de seguridad | Controles que lo componen (van a Physical) | Prioridad |
|---|---|---|---|
| 1 | Antifraude transaccional | Scoring ML en línea (< 300 ms), motor de reglas, huella de dispositivo, biometría conductual, desafío adicional por riesgo | Crítica |
| 2 | Autenticación fuerte de clientes | Passkeys (FIDO2), biometría con prueba de vida, vinculación del dispositivo, desafío ligado al monto y al beneficiario, sesiones cortas | Crítica |
| 3 | Límites transaccionales dinámicos | Límite nocturno, tope para equipo nuevo, espera para subir límites, límites por perfil, tope para beneficiario nuevo | Crítica |
| 4 | Gestión segura de llaves | OTP de titularidad, revisión de cambio de SIM, bloqueo de consultas masivas (anti-scraping), nombre enmascarado | Crítica |
| 5 | Criptografía y gestión de claves | HSM/KMS, mTLS hacia el SPBVI, firma de mensajes ISO 20022, TLS 1.3, rotación y custodia dual | Crítica |
| 6 | Seguridad de servicios web (APIs) | Gateway con OAuth2 y mTLS, validación de esquemas, autorización por objeto, idempotencia y anti-replay, cuotas | Crítica |
| 7 | Gestión de accesos privilegiados | Acceso temporal (JIT), bóveda de credenciales, grabación de sesiones, cuenta de emergencia con doble aprobación | Crítica |
| 8 | Continuidad y recuperación | Activo-activo en varias zonas, réplica a otra región, copias inmutables, cuenta de recuperación aislada, simulacros | Crítica |
| 9 | Monitoreo de seguridad (SOC) | SIEM, detección de amenazas en la nube, analítica de comportamiento (UEBA), inteligencia de amenazas, SOAR | Crítica |
| 10 | Confirmación del beneficiario | Nombre enmascarado obligatorio, aviso de beneficiario nuevo, mensajes de fricción por riesgo | Alta |
| 11 | Gestión de cuentas mula | Scoring de recepción, congelamiento preventivo, análisis de grafos, bloqueo de llaves, devolución | Alta |
| 12 | Protección de la app móvil | RASP, ofuscación, detección de root/jailbreak, atestación del dispositivo, anti-superposición, certificate pinning | Alta |
| 13 | Respuesta a incidentes | CSIRT, playbooks, análisis forense, reporte a la SFC (TUIC/TLP), comunicación a clientes | Alta |
| 14 | Registro, auditoría y no repudio | Logs inmutables, sincronización de relojes, ID de correlación, firma de eventos, retención | Alta |
| 15 | Protección de datos | Clasificación, cifrado en reposo, tokenización, DLP, enmascaramiento fuera de producción | Alta |
| 16 | Desarrollo seguro (DevSecOps) | Modelado de amenazas, SAST, DAST, SCA, escaneo de infraestructura como código, firma de artefactos | Alta |
| 17 | Identidad de empleados | SSO con llave FIDO2, RBAC/ABAC, alta y baja ligadas a RR. HH., recertificación trimestral, segregación de funciones | Alta |
| 18 | Protección perimetral | Anti-DDoS, WAF, IPS, gestión de bots, CDN | Alta |
| 19 | Seguridad de terceros | Debida diligencia, cláusulas de seguridad y auditoría, informes SOC 2, plan de salida | Alta |
| 20 | Gestión de vulnerabilidades | Escaneo continuo, plazos de parcheo por severidad, pentest semestral, hardening CIS | Alta |
| 21 | Protección de redes | Segmentación por VPC y subred, microsegmentación, enlaces privados, NDR | Alta |
| 22 | Gobierno de IA | Inventario de modelos, validación independiente, monitoreo de deriva, control de shadow AI (DLP e IA corporativa) | Media |
| 23 | Protección de endpoint | EDR/XDR en equipos de empleados, protección en tiempo de ejecución de contenedores | Media |
| 24 | Concienciación | Campañas a clientes contra estafas con Bre-B, phishing simulado, formación del personal | Media |

Los servicios 1, 3, 4, 10 y 11 son específicos de pagos inmediatos y no aparecen en el ejemplo del docente (plataforma de trading). Por eso esta matriz es distinta a la suya, como él mismo pidió.

**Los 10 riesgos principales y el servicio que los trata:**

| # | Riesgo | Prob. / impacto | Servicios |
|---|---|---|---|
| 1 | Fraude por engaño (SMS falsos de Bre-B, falso asesor) | Alta / Alta | 1, 3, 10, 24 |
| 2 | Robo de cuentas (phishing, cambio de SIM, malware móvil) | Alta / Alta | 2, 4, 12 |
| 3 | Cuentas mula que reciben y dispersan dinero robado | Alta / Alta | 11, 1 |
| 4 | Compromiso de credenciales privilegiadas o abuso interno | Media / Muy alta | 7, 17, 9 |
| 5 | Indisponibilidad (falla de región, DDoS, ransomware, inactivación en el MOL por saldo) | Media / Muy alta | 8, 18, 13 |
| 6 | Enumeración de llaves y fuga de datos personales | Media / Alta | 4, 6, 15 |
| 7 | Vulnerabilidades en servicios web (BOLA, inyección, replay) | Media / Alta | 6, 16, 20 |
| 8 | Robo de claves o certificados de conexión | Baja / Muy alta | 5, 7 |
| 9 | Falla de terceros o de la cadena de suministro | Media / Alta | 19, 16 |
| 10 | Falla o evasión del modelo antifraude; fuga de datos por shadow AI | Media / Media-Alta | 22, 14 |

## WHO — Entity & Trust Framework (Entity Schema; Trust Models; Privilege Profiles)
**Qué va aquí:** Encabezado de la plantilla: "Entity Schema; Trust Models; Privilege Profiles". Los perfiles, sus privilegios y el modelo de confianza. El docente: "cuáles van a ser los perfiles de la aplicación y los privilegios; ¿será que ustedes pueden modificar sus notas? Sería terrible".
**En la matriz:**

Los perfiles salen de los roles de la capa de arriba y cada uno tiene solo lo que necesita. El cliente envía, recibe y administra sus propias llaves y el comercio recibe pagos QR y consulta sus ventas. El analista de fraude retiene, libera y marca transacciones pero no administra sistemas y el agente de servicio ve datos enmascarados y puede bloquear pero no mover plata.

Del lado técnico el ingeniero de plataforma tiene acceso temporal a la infraestructura sin ver datos de clientes en claro, el desarrollador solo entra a desarrollo y pruebas y nunca a producción y el auditor solo lee registros y evidencias. Los sistemas también tienen identidad: El conector con el sistema de pago se autentica con certificado en cada mensaje. El modelo de confianza es el de Zero Trust así que no se confía por defecto en nadie y cada usuario, equipo y servicio se identifica en cada solicitud.

**Para la presentación:**
- Perfiles:
  - Cliente: Envía, recibe y administra solo sus propias llaves.
  - Comercio: Recibe pagos QR y consulta sus ventas.
  - Analista de fraude: Retiene, libera y marca transacciones pero no administra sistemas.
  - Agente de servicio: Ve los datos enmascarados y puede bloquear pero no puede mover plata.
  - Ingeniero de plataforma: Tiene acceso temporal a la infraestructura sin ver datos de clientes en claro.
  - Desarrollador: Solo entra a los ambientes de desarrollo y pruebas, nunca a producción.
  - Auditor: Solo lee registros y evidencias.
- Modelo de confianza: No se confía por defecto en nadie, cada usuario, equipo y servicio se identifica en cada solicitud.
**Detalle y justificación:** La segregación entre analista de fraude, agente e ingeniero implementa la segregación de funciones que exige la CBJ (P.I, T.II, Cap. I). Que el desarrollador no tenga producción responde a la exigencia de tres ambientes separados (num. 2.3.5).

## WHERE — Domain Maps (Domain Definitions; Inter-domain associations & interactions) → zoom de normas
**Qué va aquí:** Encabezado de la plantilla: "Domain Definitions; Inter-domain associations & interactions". El white paper pide definir los dominios y cómo interactúan (p. 12). El docente pide además hacer "**zoom**" a las normas de la capa Conceptual: "no me digan que van a implementar la 27001; entren y definan cuáles son los dominios que van a implementar, porque no todos aplican".
**En la matriz:**

La arquitectura se divide en seis dominios y cada uno toma el pedazo de norma que le toca. El dominio cliente (app y dispositivo) sigue OWASP MASVS y el doble factor de la Circular Básica Jurídica. El de exposición es la única entrada desde internet y sigue OWASP API Top 10. El core de pagos aplica la DSP-465 (nombre enmascarado, 20 segundos, bloqueo de llaves y devolución) y el de información sensible solo admite cuentas de servicio con ISO 27001 8.24 (criptografía), 8.12 (fuga de datos) y la Ley 1581.

El dominio interbancario (conector, directorio de llaves y sistema de liquidación) se basa en confianza mutua por certificados según la DSP-465 y la DSP-470 y el de gestión tiene acceso temporal y vigilado con ISO 27001 8.2 y 8.15 a 8.16. Ningún dominio salta a otro sin pasar por su frontera. Con el proveedor de nube la relación es de responsabilidad compartida (ISO 27001 5.19 a 5.23 y los dominios de la CSA CCM) y con el sistema de pago la define su reglamento.

**Para la presentación:**
- Dominios:
  - Cliente (app y dispositivo del cliente): Política de canal móvil con zoom en OWASP MASVS (almacenamiento, criptografía, autenticación, resiliencia) y el doble factor de la CBJ.
  - Exposición (gateway y borde): Única entrada desde internet con zoom en OWASP API Top 10 (autorización por objeto, consumo de recursos) y la CBJ de canales.
  - Core de pagos (motor de pagos, llaves, antifraude): Política de pagos inmediatos con zoom en la DSP-465 (nombre enmascarado, 20 s, bloqueo de llaves, devolución).
  - Información sensible (bases de datos, llaves criptográficas, secretos): Solo cuentas de servicio con zoom en ISO 27001 8.24 (criptografía), 8.12 (fuga de datos) y la Ley 1581.
  - Interbancario (conector al sistema de pago, DICE y MOL): Confianza mutua por certificados con zoom en la DSP-465 y la DSP-470 (mensajería, marcas de tiempo, contingencia).
  - Gestión (SOC, administración, herramientas): Acceso temporal y vigilado con zoom en ISO 27001 8.2 (accesos privilegiados) y 8.15–8.16 (registro y monitoreo).
- Asociaciones:
  - Internas: Cliente → Exposición → Core → Información sensible y Core ↔ Interbancario, ningún dominio salta a otro sin pasar por su frontera.
  - Externas: Con el proveedor de nube por responsabilidad compartida (ISO 27001 5.19–5.23 y CSA CCM) y con el sistema de pago por su reglamento.
**Detalle y justificación — controles del Anexo A de ISO/IEC 27001:2022 que aplican:**
- **Organizacionales (5.x):** 5.1 políticas, 5.7 inteligencia de amenazas, 5.15–5.18 control de acceso e identidades, 5.19–5.23 proveedores y servicios en la nube, 5.24–5.28 gestión de incidentes, 5.29–5.30 continuidad, 5.34 privacidad.
- **Personas (6.x):** 6.3 concienciación y formación, 6.7 trabajo remoto.
- **Físicos (7.x):** Delegados en el proveedor de nube (modelo de responsabilidad compartida); se revisan sus certificaciones.
- **Tecnológicos (8.x):** 8.2 accesos privilegiados, 8.5 autenticación segura, 8.7 malware, 8.8 vulnerabilidades, 8.12 prevención de fuga de datos, 8.13 respaldo, 8.15–8.16 registro y monitoreo, 8.20–8.22 seguridad de redes, 8.24 criptografía, 8.25–8.29 desarrollo seguro.

*La numeración del Anexo A es la de la edición 2022 (93 controles); conviene confirmarla contra el texto de la norma antes de la entrega.*

## WHEN — Calendar & Timetable (Start Times, Lifetimes & Deadlines)
**Qué va aquí:** Encabezado de la plantilla: "Start Times, Lifetimes & Deadlines". Las fechas límite de implementación y las vigencias (de sesiones, credenciales, certificados). El docente: "aquí comienzas a definir las fechas límite: el desarrollo en tal trimestre, las pruebas en tal, el paso a producción en tal".
**En la matriz:**

Para que la seguridad no se quede por fuera del cronograma los contratos y las licencias de seguridad tendrían que estar firmados antes de 2027. En el primer semestre de 2027 arrancarían la autenticación fuerte, la criptografía y los accesos privilegiados y después el antifraude, las llaves y la mensajería certificados con el sistema de pago junto con el pentest. En el segundo semestre el SOC 24/7 y los playbooks operarían en la marcha blanca y la prueba completa de recuperación se haría antes del lanzamiento del cuarto trimestre.

En operación cada elemento tiene su vigencia. Los certificados de la conexión con el sistema de pago valen 90 días y los tokens de acceso 10 minutos. La sesión del cliente expira a los 5 minutos de inactividad y cada pago pide una nueva confirmación. Un bloqueo de llave dura hasta 30 días hábiles prorrogables una vez. La llave se resuelve en máximo 5 segundos y el pago en máximo 20 (ambos en al menos el 99.5 % de los casos) y el fraude se investiga en máximo 10 días calendario.

**Para la presentación:**
- Cronograma (2027):
  - Antes del Q1: Contratos firmados y licencias de seguridad compradas para que no se queden por fuera del cronograma.
  - Q1 y Q2: Arrancan autenticación fuerte, criptografía y accesos privilegiados, después antifraude, llaves y mensajería certificados con el sistema de pago más el pentest.
  - Q3 y Q4: El SOC 24/7 y los playbooks operan en la marcha blanca y la prueba completa de recuperación se hace antes del lanzamiento.
- Vigencias:
  - Registro: El dispositivo y la passkey se vinculan cuando el cliente se enrola, si bloquea su llave el bloqueo dura hasta 30 días hábiles prorrogables una vez por 30 más y luego la llave se cancela.
  - Certificación: Los certificados de la conexión con el sistema de pago valen 90 días y los tokens de acceso 10 minutos.
  - Login y sesión: La sesión del cliente expira a los 5 minutos de inactividad y cada pago pide una nueva confirmación (step-up).
- Plazos:
  - De la operación: La llave se resuelve en máximo 5 s y el pago sale en máximo 20 s, ambos en al menos el 99.5 % de los casos.
  - De reclamación: El fraude se investiga en máximo 10 días calendario y el cliente tiene 5 días hábiles para pedir una reversión.
**Detalle y justificación:** Asesoría del docente (nov-2026): El hito de compras y contratación está porque la matriz es el paso previo al proyecto y sirve para que la seguridad no se quede por fuera del cronograma. Su fecha es un supuesto del caso. Los plazos siguen los hitos de Contextual WHEN. La regla es que ningún servicio crítico llegue a la marcha blanca sin haber pasado pentest, y ninguno llegue al lanzamiento sin una prueba de recuperación.

## Trazabilidad
- **Hacia arriba:** Cada servicio responde a un objetivo de control (Conceptual WHY), y cada "zoom" de controles responde a una norma (Conceptual WHERE).
- **Hacia abajo:** Cada servicio del catálogo se materializa en los controles de `4-physical.md`, organizados por capas de defensa en profundidad.

## Fuentes
- White paper SABSA, p. 12.
- [IN BCB 331/2022 (límite nocturno de Pix)](https://www.lex.com.br/instrucao-normativa-bacen-no-331-de-1-de-dezembro-de-2022/), [Res. BCB 403/2024 (equipo nuevo), resumen de Mattos Filho](https://www.mattosfilho.com.br/unico/bcb-novas-normas-pix/), [MED 2.0](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/MED/MED_2-0_Circuito_Pix-Dia_1.pdf).
- [PSR, Confirmation of Payee (SD10)](https://www.psr.org.uk/media/gp2juzmq/psr-specific-direction-10-confirmation-of-payee-february-2020.pdf), [Verification of Payee (UE 2024/886)](https://www.ecb.europa.eu/paym/retail/instant_payments/html/instant_payments_regulation.en.html).
- [OWASP MASVS](https://mas.owasp.org/MASVS/), [OWASP API Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [ISO/IEC 27001](https://www.iso.org/standard/27001).
- [Banco de la República, recomendaciones de seguridad Bre-B](https://banrep.gov.co/es/noticia/siete-recomendaciones-seguridad-bre-b).
