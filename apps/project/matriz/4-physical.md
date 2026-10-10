---
capa: physical
vista: Builder's View (constructor)
responsable: Director de Plataforma e Infraestructura
con_quien_se_habla: El director de infraestructura y los equipos que construyen. Aquí aparecen los controles concretos.
---
# Capa Physical — mecanismos de seguridad (controles)

> Los servicios lógicos se expresan como **mecanismos** y servidores concretos: cifrado, control de acceso, firma digital, antivirus (white paper SABSA, p. 13). El docente: «acá ya tienen que aparecer los controles». Pidió **separar los controles en capas**, como en el modelo de defensa en profundidad: «hay una protección a nivel de sistema operativo, a nivel de red, a nivel perimetral; si te vulneran una capa, hay otra capa que la contiene», igual que los anillos de seguridad de un edificio (vigilantes, recepción, cámaras).

## WHAT — Data Assets (Data Dictionary & Data Inventory)
**Qué va aquí:** Encabezado de la plantilla: «Data Dictionary & Data Inventory». El diccionario de datos: qué datos maneja la solución y cómo se clasifican. En el ejemplo del docente: datos de mercado, código fuente, usuarios, contraseñas.
**En la matriz:**
- Credenciales y biometría (restringido): Se guardan como plantillas cifradas, nunca como imágenes.
- Llaves criptográficas (restringido): Solo viven dentro del HSM.
- Identificación y número de cuenta (restringido): Se tokenizan fuera del dominio de datos sensibles.
- Relación llave-cuenta (confidencial): Se cifra; al resolver una llave solo se muestra el nombre enmascarado.
- Transacciones (confidencial): Monto, origen, destino, hora, dispositivo y puntaje de fraude.
- Registros de auditoría (confidencial): Inmutables y con sello de tiempo confiable.
- Código fuente (restringido): Repositorio privado, revisión obligatoria entre pares y commits firmados.
- Catálogo de datos: Cada tabla con dueño, clasificación, ubicación y tiempo de retención.

## WHY — Risk Management Practices (Risk Management Rules & Procedures)
**Qué va aquí:** Encabezado de la plantilla: «Risk Management Rules & Procedures». Las reglas y procedimientos que guían las decisiones del sistema y de la operación.
**En la matriz:**
- Reglas de fraude: Retener o bloquear si hay llave nueva, equipo nuevo con monto alto, velocidad anómala o destinatario marcado.
- Reglas de límites: Límite nocturno, tope bajo durante 24 h para equipos nuevos y espera para subir los límites.
- Bloqueo de llaves y devolución: Bloqueo inmediato ante fraude, investigación en ≤ 10 días y devolución en 2 días hábiles.
- Playbooks de incidentes: Robo de cuentas, fraude masivo, DDoS, ransomware y caída del sistema de pago, con reporte a la SFC (taxonomía TUIC).
- Gestión de vulnerabilidades: Las críticas se corrigen en 7 días y las altas en 30.
- Gestión de cambios: Revisión entre pares, pipeline seguro y doble aprobación para producción.
- Monitoreo de liquidez: Alerta temprana del saldo en el MOL para no quedar inactivo.
- Fallo controlado del antifraude: Si el scoring no responde, el pago sigue con límites reducidos en vez de bloquearse todo.
**Detalle y justificación:** La última regla es un ejemplo de decisión de arquitectura. Bloquear todo protege contra el fraude, pero rompe la disponibilidad. Dejar pasar todo protege la disponibilidad, pero abre el fraude. La opción intermedia (degradar con límites) equilibra los dos atributos de la capa Conceptual.

## HOW — Process Mechanisms (Applications; Middleware; Systems; Security Mechanisms)
**Qué va aquí:** Encabezado de la plantilla: «Applications; Middleware; Systems; Security Mechanisms». Las aplicaciones, sistemas y **mecanismos de seguridad** que materializan cada servicio lógico.
**En la matriz:**
- Passkeys (FIDO2) y biometría con prueba de vida: Atadas al dispositivo vinculado (servicio de autenticación).
- Motor antifraude en línea: Reglas + machine learning + biometría conductual (servicio antifraude).
- HSM/KMS, cifrado envolvente y tokenización: Servicio de criptografía y protección de datos.
- mTLS y firma de mensajes ISO 20022: Conexión con el sistema de pago (servicio de mensajería interbancaria).
- WAF, anti-DDoS y gestión de bots: Servicio de protección perimetral.
- Protección de la app: RASP, anti-tampering, detección de root/jailbreak y atestación del dispositivo.
- SIEM con correlación y logs inmutables: Servicio de monitoreo, auditoría y no repudio.
- DLP y EDR en los equipos de los empleados: Protección de endpoint y control de shadow AI.

## WHO — Human Interface (User Interface to ICT Systems; Access Control Systems)
**Qué va aquí:** Encabezado de la plantilla: «User Interface to ICT Systems; Access Control Systems». Las interfaces con las que las personas interactúan con los sistemas y el sistema de control de acceso (RBAC o ABAC).
**En la matriz:**
- App del cliente: Login biométrico, nombre enmascarado antes de confirmar y alerta push de cada movimiento.
- Aviso antiestafa: La app aclara que en Bre-B no hay que «aceptar» transferencias para recibir dinero.
- Consola interna: Inicio de sesión único con llave FIDO2 para todos los empleados.
- Control de acceso: RBAC por perfil más reglas por atributo (ABAC) según monto, horario y ubicación.
- Accesos privilegiados: Acceso temporal aprobado por un segundo funcionario, con la sesión grabada.
- Protección de sesión: Bloqueo tras intentos fallidos, cierre por inactividad y aviso del último ingreso.
**Detalle y justificación:** El aviso antiestafa responde al vector de fraude local más común (SMS con un enlace para «aceptar» una transferencia de Bre-B). El último ingreso visible y el bloqueo por intentos son exigencias de la CBJ para internet y banca móvil (P.I, T.II, Cap. I).

## WHERE — ICT Infrastructure (Host Platforms, Layout & Networks) → controles por capa de defensa en profundidad
**Qué va aquí:** Encabezado de la plantilla: «Host Platforms, Layout & Networks». Las plataformas, la disposición y las redes. Siguiendo al docente, los controles se separan por capa: perimetral, red, sistema operativo y contenedores, aplicación, datos, identidad y procedimental.
**En la matriz:**
- Perímetro: WAF, anti-DDoS, CDN, lista blanca de IP y mTLS hacia el sistema de pago.
- Red: Una VPC por ambiente y por dominio, subredes privadas sin salida directa a internet y microsegmentación.
- Sistema operativo y contenedores: Imágenes mínimas firmadas, hardening CIS y seguridad en tiempo de ejecución.
- Aplicación: Gateway con OAuth2, validación de esquemas, anti-replay e idempotencia.
- Datos: Cifrado con llaves por dominio, tokenización y enmascaramiento fuera de producción.
- Identidad: Passkeys para clientes, llave FIDO2 para empleados y gestión de accesos privilegiados.
- Procedimental: Segregación de funciones, doble aprobación en producción y simulacros.
- Sitios: Tres zonas de disponibilidad más una región alterna, y dos enlaces al sistema de pago.
**Detalle y justificación — dominios de red (lo que antes estaba en la capa Conceptual):**

| Dominio | Qué contiene | Frontera |
|---|---|---|
| Cliente | App y dispositivo del cliente | Solo HTTPS hacia el gateway |
| Exposición (DMZ) | Gateway, WAF, anti-DDoS | Única entrada desde internet |
| Core de pagos | Motor de pagos, servicio de llaves, antifraude | Solo llamadas autenticadas desde la DMZ |
| Información sensible | Bases de datos, HSM/KMS, bóveda de secretos | Solo cuentas de servicio; ningún humano entra directo |
| Interbancario | Conector al SPBVI y al MOL | Enlace dedicado con mTLS |
| Gestión | SOC, bastión, herramientas administrativas | Solo por bastión y acceso temporal |

## WHEN — Processing Schedule (Timing & Sequencing of Processes and Sessions) → RTO y RPO
**Qué va aquí:** Encabezado de la plantilla: «Timing & Sequencing of Processes and Sessions». Tiempos y secuencias: disponibilidad, recuperación, sesiones. El docente explicó dos conceptos:
- **RTO:** Tiempo de recuperación objetivo, es decir, cuánto puede estar caído el servicio.
- **RPO:** Punto de recuperación objetivo, es decir, cuánta información del pasado se puede perder.

Tiempos cortos significan inversión alta («las entidades financieras invierten mucha plata en recuperar en segundos»).
**En la matriz:**
- Nivel 0 (pagos, antifraude, conexión): RTO menor a 1 minuto si cae una zona y de hasta 2 horas si cae la región; RPO 0.
- Nivel 1 (llaves, notificaciones, QR): RTO de 1 hora; RPO de 5 minutos.
- Nivel 2 (backoffice, analítica): RTO y RPO de 24 horas.
- Ciberrecuperación: Copias inmutables aisladas, restaurando el último punto limpio en hasta 2 horas.
- Latencias: Resolución de llave ≤ 5 s, antifraude < 300 ms y pago completo < 20 s.
- Sesiones: El cliente se desconecta tras 5 minutos de inactividad y la sesión administrativa dura máximo 1 hora.
- Bloqueo preventivo: 24 horas sin envíos tras un cambio de equipo o de SIM.
**Detalle y justificación:** Los principios para infraestructuras del mercado financiero (PFMI, Principio 17, CPMI-IOSCO) piden que los sistemas críticos puedan reanudar operaciones en máximo 2 horas. El RPO 0 del nivel 0 exige replicación síncrona entre zonas; el costo se justifica porque perder una transacción confirmada significa perder dinero de un cliente. Los niveles 1 y 2 son propuestas de diseño, no cifras regulatorias.

## Trazabilidad
- **Hacia arriba:** Cada mecanismo materializa un servicio de `3-logical.md` (la correspondencia va entre paréntesis en la columna HOW).
- **Hacia abajo:** Cada mecanismo tiene un producto en `5-component.md`.

## Fuentes
- White paper SABSA, p. 13.
- [PFMI, CPMI-IOSCO](https://www.bis.org/cpmi/publ/d101a.pdf), [CPMI-IOSCO, ciberresiliencia (d212)](https://www.bis.org/cpmi/publ/d212.htm).
- [AWS, sistemas de pago críticos multirregión](https://aws.amazon.com/blogs/industries/architecting-critical-payment-systems-for-multi-region-resiliency).
- [Texto compilado de la CBJ (CE 006/2025)](https://normativa.colpensiones.gov.co/colpens/compilacion/docs/circular_superfinanciera_0006_2025.htm).
