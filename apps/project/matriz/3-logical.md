---
capa: logical
vista: Designer's View (diseñador)
responsable: CISO y Arquitecto de Seguridad
con_quien_se_habla: El CISO y el arquitecto de seguridad. La información ya es técnica, pero se expresa como servicios de seguridad, no como productos.
---
# Capa Logical — servicios de seguridad

> En esta capa el negocio se modela como un sistema mediante **servicios de seguridad** lógicos, reutilizables e independientes de la tecnología: autenticación, confidencialidad, integridad, no repudio (white paper SABSA, p. 12). El docente insistió en la diferencia: «**autenticación** es el servicio; usuario y contraseña, OTP, doble factor y reconocimiento facial son **controles** de ese servicio». Su recomendación: «saquen un listado de servicios y comiencen a identificar qué servicios van a necesitar para su proyecto; eso les permite definir los controles». Los controles concretos van en la capa Physical.

## WHAT — Information Assets (Inventory of Information Assets)
**Qué va aquí:** Encabezado de la plantilla: «Inventory of Information Assets». El inventario de activos de información, es decir, los componentes de la solución que manejan información. En el ejemplo del docente: software de datos de mercado, OMS, interfaz de usuario, canales dedicados y bases de datos.
**En la matriz:**
- Información transaccional: Pagos enviados y recibidos, montos, destinatarios y puntaje de fraude.
- Información de clientes (clasificada): Identidad, biometría como plantilla, llaves y saldos.
- Código fuente de la app y de los servicios: Si se altera o se filtra, se compromete todo el producto.
- Motor de pagos y motor antifraude con su modelo de IA: Deciden si el dinero sale.
- Servicio de llaves: Inscribe, traslada, bloquea y consulta llaves contra el DICE.
- Conexión con el sistema de pago y el MOL: Canal por donde salen los pagos y se liquidan.
- Llaves criptográficas, certificados y secretos: Su robo permitiría suplantar a {empresa} ante el sistema de pago.
- Registros de auditoría y seguridad: Evidencia de cada operación y de cada acceso.
**Detalle y justificación:** Corrección del profesor en clase: el inventario de activos de **información** incluye «una base de datos, el código de la aplicación, información transaccional, información clasificada». Ya no es una capa de negocio: aquí se baja al inventario de la información que compone la aplicación. Esta celda se encadena hacia abajo con el **diccionario de datos** (`4-physical.md`, WHAT) y luego con los **repositorios** (`5-component.md`, WHAT). El orden sigue el impacto si el activo se compromete.

## WHY — Risk Management Policies (Domain Policies)
**Qué va aquí:** Encabezado de la plantilla: «Domain Policies». Las políticas de cada dominio, es decir, los lineamientos de la alta dirección aplicados al proyecto. El docente: «acá me definen las políticas, política, política, política; no el texto, las ideas y lo que van a necesitar» (como un mapa mental).
**En la matriz:**
- Política de autenticación: Doble factor fuerte para entrar, para pagar y para todo trámite con llaves.
- Política de límites transaccionales: Topes por perfil de riesgo, límite nocturno y tope bajo para equipos nuevos.
- Política de gestión de llaves: Probar la titularidad antes de inscribir o trasladar, y avisar al canal anterior.
- Política antifraude: Bloqueo de llaves por fraude y devolución según las reglas de Bre-B.
- Política criptográfica: Todo canal cifrado y los datos sensibles cifrados en reposo, con llaves bajo custodia dedicada.
- Política de acceso privilegiado: Mínimo privilegio, acceso temporal aprobado y sesiones grabadas.
- Política de respaldo y recuperación: Copias protegidas contra borrado y pruebas periódicas de recuperación.
- Políticas de soporte: Privacidad y retención de datos, desarrollo seguro, terceros y uso de IA.
**Detalle y justificación:** Cada política responde a un objetivo de control de Conceptual WHY. Los límites se inspiran en Pix (límite nocturno de R$1.000 entre las 20:00 y las 6:00, y tope para equipo no registrado de R$200 por transacción, Res. BCB 403/2024). La DSP-465 permite que el participante fije topes inferiores a los 1.000 UVB según su política de riesgo.

## HOW — Process Maps & Services (Information Flows; Functional Transformations; Service Oriented Architecture)
**Qué va aquí:** Encabezado de la plantilla: «Information Flows; Functional Transformations; Service Oriented Architecture». Los **flujos de información más relevantes** y los **servicios de seguridad** que los protegen. El docente: «acá no vamos a montar los 200 flujos; necesitamos los más relevantes y qué controles de seguridad llevan».
**En la matriz:**
- Flujo de pago por llave: Autenticación fuerte → resolución de la llave con privacidad → antifraude → firma y no repudio → mensajería interbancaria segura → notificación.
- Flujo de recepción de fondos: Antifraude de recepción (detección de cuentas mula) → notificación al cliente.
- Flujo de inscripción o traslado de llave: Autenticación fuerte → verificación de titularidad → aviso al canal anterior.
- Flujo de pago QR a comercio: Verificación de integridad del QR → antifraude → notificación.
- Flujo de acceso administrativo: Gestión de accesos privilegiados → registro y monitoreo de la sesión.
- Servicios transversales: Monitoreo y respuesta a incidentes, protección de datos, desarrollo seguro, continuidad, gestión de vulnerabilidades y seguridad de terceros.
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
**Qué va aquí:** Encabezado de la plantilla: «Entity Schema; Trust Models; Privilege Profiles». Los perfiles, sus privilegios y el modelo de confianza. El docente: «cuáles van a ser los perfiles de la aplicación y los privilegios; ¿será que ustedes pueden modificar sus notas? Sería terrible».
**En la matriz:**
- Cliente: Envía, recibe y administra solo sus propias llaves.
- Comercio: Recibe pagos QR y consulta sus ventas.
- Analista de fraude: Retiene, libera y marca transacciones; no administra sistemas.
- Agente de servicio: Ve datos enmascarados y puede bloquear; no puede mover dinero.
- Ingeniero de plataforma: Acceso temporal a la infraestructura, sin ver datos de clientes en claro.
- Desarrollador: Solo ambientes de desarrollo y pruebas; nunca producción.
- Auditor: Solo lectura de registros y evidencias.
- Modelo de confianza: Nadie confía por defecto; cada usuario, equipo y servicio se identifica en cada solicitud.
**Detalle y justificación:** La segregación entre analista de fraude, agente e ingeniero implementa la segregación de funciones que exige la CBJ (P.I, T.II, Cap. I). Que el desarrollador no tenga producción responde a la exigencia de tres ambientes separados (num. 2.3.5).

## WHERE — Domain Maps (Domain Definitions; Inter-domain associations & interactions) → zoom de normas
**Qué va aquí:** Encabezado de la plantilla: «Domain Definitions; Inter-domain associations & interactions». El white paper pide definir los dominios y cómo interactúan (p. 12). El docente pide además hacer «**zoom**» a las normas de la capa Conceptual: «no me digan que van a implementar la 27001; entren y definan cuáles son los dominios que van a implementar, porque no todos aplican».
**En la matriz:**
- ISO 27001:2022, controles tecnológicos: Autenticación segura, criptografía, registro y monitoreo, desarrollo seguro, protección contra fuga de datos.
- ISO 27001:2022, controles organizacionales: Políticas, relación con proveedores y servicios en la nube, gestión de incidentes, continuidad.
- ISO 27001:2022, controles de personas y físicos: Concienciación, trabajo remoto y seguridad física delegada en el proveedor de nube.
- CBJ, canales: Autenticación fuerte, perfil transaccional, pentest semestral, doble factor en móvil y gestión de riesgos del QR.
- DSP-465: Nombre enmascarado, 20 segundos, bloqueo de llaves por fraude y devolución.
- OWASP MASVS (app móvil): Almacenamiento, criptografía, autenticación, red, resiliencia y privacidad.
- OWASP Top 10 de APIs: Autorización por objeto, autenticación, consumo de recursos y flujos de negocio sensibles.
- Dominios de interacción: Cliente ↔ exposición ↔ core de pagos ↔ información sensible, y core ↔ interbancario; gestión entra solo por un punto controlado.
**Detalle y justificación — controles del Anexo A de ISO/IEC 27001:2022 que aplican:**
- **Organizacionales (5.x):** 5.1 políticas, 5.7 inteligencia de amenazas, 5.15–5.18 control de acceso e identidades, 5.19–5.23 proveedores y servicios en la nube, 5.24–5.28 gestión de incidentes, 5.29–5.30 continuidad, 5.34 privacidad.
- **Personas (6.x):** 6.3 concienciación y formación, 6.7 trabajo remoto.
- **Físicos (7.x):** Delegados en el proveedor de nube (modelo de responsabilidad compartida); se revisan sus certificaciones.
- **Tecnológicos (8.x):** 8.2 accesos privilegiados, 8.5 autenticación segura, 8.7 malware, 8.8 vulnerabilidades, 8.12 prevención de fuga de datos, 8.13 respaldo, 8.15–8.16 registro y monitoreo, 8.20–8.22 seguridad de redes, 8.24 criptografía, 8.25–8.29 desarrollo seguro.

*La numeración del Anexo A es la de la edición 2022 (93 controles); conviene confirmarla contra el texto de la norma antes de la entrega.*

## WHEN — Calendar & Timetable (Start Times, Lifetimes & Deadlines)
**Qué va aquí:** Encabezado de la plantilla: «Start Times, Lifetimes & Deadlines». Las fechas límite de implementación y las vigencias (de sesiones, credenciales, certificados). El docente: «aquí comienzas a definir las fechas límite: el desarrollo en tal trimestre, las pruebas en tal, el paso a producción en tal».
**En la matriz:**
- Q1 2027: Autenticación fuerte, criptografía y gestión de accesos privilegiados listos, porque son la base de todo lo demás.
- Q2 2027: Antifraude, gestión de llaves y mensajería interbancaria probados en la certificación con el sistema de pago.
- Q2 2027: Pentest y análisis de vulnerabilidades antes de la marcha blanca.
- Q3 2027: Monitoreo 24/7 (SOC) y playbooks de incidentes operando durante la marcha blanca.
- Q4 2027: Prueba completa de recuperación antes del lanzamiento al público.
- Vigencias de sesión: La sesión del cliente expira a los 5 minutos de inactividad y la credencial de acceso dura 10 minutos.
- Tiempos de servicio: Resolución de llave ≤ 5 s, antifraude < 300 ms y pago completo < 20 s.
**Detalle y justificación:** Los plazos siguen los hitos de Contextual WHEN. La regla es que ningún servicio crítico llegue a la marcha blanca sin haber pasado pentest, y ninguno llegue al lanzamiento sin una prueba de recuperación.

## Trazabilidad
- **Hacia arriba:** Cada servicio responde a un objetivo de control (Conceptual WHY), y cada «zoom» de controles responde a una norma (Conceptual WHERE).
- **Hacia abajo:** Cada servicio del catálogo se materializa en los controles de `4-physical.md`, organizados por capas de defensa en profundidad.

## Fuentes
- White paper SABSA, p. 12.
- [IN BCB 331/2022 (límite nocturno de Pix)](https://www.lex.com.br/instrucao-normativa-bacen-no-331-de-1-de-dezembro-de-2022/), [Res. BCB 403/2024 (equipo nuevo), resumen de Mattos Filho](https://www.mattosfilho.com.br/unico/bcb-novas-normas-pix/), [MED 2.0](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/MED/MED_2-0_Circuito_Pix-Dia_1.pdf).
- [PSR, Confirmation of Payee (SD10)](https://www.psr.org.uk/media/gp2juzmq/psr-specific-direction-10-confirmation-of-payee-february-2020.pdf), [Verification of Payee (UE 2024/886)](https://www.ecb.europa.eu/paym/retail/instant_payments/html/instant_payments_regulation.en.html).
- [OWASP MASVS](https://mas.owasp.org/MASVS/), [OWASP API Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/), [ISO/IEC 27001](https://www.iso.org/standard/27001).
- [Banco de la República, recomendaciones de seguridad Bre-B](https://banrep.gov.co/es/noticia/siete-recomendaciones-seguridad-bre-b).
