---
capa: physical
vista: Builder's View (constructor)
rol: Director de Plataforma e Infraestructura
responsable: >-
  La responsabilidad de esta capa es de la Dirección de Plataforma e Infraestructura. Define de qué se compone la aplicación y le asigna a cada componente su control junto con los administradores de nube, de accesos y de bases de datos. La Dirección de Desarrollo responde por los controles que van dentro de la app y del pipeline.
con_quien_se_habla: El director de infraestructura y los equipos que construyen. Aquí aparecen los controles concretos.
voz: Hablamos con la Dirección de Plataforma e Infraestructura (ver 0-organigrama.md)
---
# Capa Physical — mecanismos de seguridad (controles)

> Los servicios lógicos se expresan como **mecanismos** y servidores concretos: cifrado, control de acceso, firma digital, antivirus (white paper SABSA, p. 13). El docente: "acá ya tienen que aparecer los controles". Pidió **separar los controles en capas**, como en el modelo de defensa en profundidad: "hay una protección a nivel de sistema operativo, a nivel de red, a nivel perimetral; si te vulneran una capa, hay otra capa que la contiene", igual que los anillos de seguridad de un edificio (vigilantes, recepción, cámaras).

## WHAT — Data Assets (Data Dictionary & Data Inventory)
**Qué va aquí:** Encabezado de la plantilla: "Data Dictionary & Data Inventory". El diccionario de datos: qué datos maneja la solución y cómo se clasifican. En el ejemplo del docente: datos de mercado, código fuente, usuarios, contraseñas.
**En la matriz:**

Cada dato tiene dueño, clasificación, ubicación y tiempo de retención en un catálogo de datos. Lo restringido son las credenciales y la biometría (que se guardan como plantillas cifradas y nunca como imágenes), las llaves criptográficas que solo viven dentro del HSM, la identificación y el número de cuenta que se tokenizan y el código fuente que está en un repositorio privado con revisión obligatoria y commits firmados.

Lo confidencial es la relación entre llave y cuenta, las transacciones y los registros de auditoría. La relación entre llave y cuenta va cifrada y al resolverse solo muestra el nombre enmascarado. Las transacciones guardan monto, origen, destino, hora, dispositivo y puntaje de fraude. Los registros de auditoría son inmutables y llevan sello de tiempo confiable para que sirvan como evidencia.

**Para la presentación:**
- Restringido:
  - Credenciales y biometría: Se guardan como plantillas cifradas y nunca como imágenes.
  - Llaves criptográficas: Solo viven dentro del HSM.
  - Identificación y número de cuenta: Se tokenizan fuera del dominio de datos sensibles.
  - Código fuente: En un repositorio privado con revisión obligatoria entre pares y commits firmados.
- Confidencial:
  - Relación llave-cuenta: Va cifrada y al resolver una llave solo se muestra el nombre enmascarado.
  - Transacciones: Monto, origen, destino, hora, dispositivo y puntaje de fraude.
  - Registros de auditoría: Son inmutables y llevan sello de tiempo confiable.
- Catálogo de datos: Cada tabla tiene dueño, clasificación, ubicación y tiempo de retención.

## WHY — Risk Management Practices (Risk Management Rules & Procedures)
**Qué va aquí:** Encabezado de la plantilla: "Risk Management Rules & Procedures". Las reglas y procedimientos que guían las decisiones del sistema y de la operación.
**En la matriz:**

Las políticas se vuelven reglas que la plataforma aplica sola. Un pago se retiene o se bloquea si hay llave nueva, equipo nuevo con monto alto, velocidad anómala o destinatario marcado. Hay límite nocturno, un tope bajo durante 24 horas para equipos nuevos y una espera para subir los límites. Ante un fraude la llave se bloquea de inmediato, el caso se investiga en máximo 10 días calendario y la plata se devuelve en los 2 días hábiles siguientes. Si el antifraude no responde el pago sigue con límites reducidos en vez de bloquear todo.

Los procedimientos cubren lo demás. Hay un playbook por escenario (robo de cuentas, fraude masivo, DDoS, ransomware y caída del sistema de pago) y todos terminan en el reporte a la SFC. Las vulnerabilidades críticas se corrigen en 7 días y las altas en 30. Todo cambio pasa por revisión entre pares y pipeline seguro con doble aprobación para producción y una alerta temprana avisa si el saldo en el Banco de la República se acerca al mínimo.

**Para la presentación:**
- Reglas:
  - De fraude: Se retiene o se bloquea si hay llave nueva, equipo nuevo con monto alto, velocidad anómala o destinatario marcado.
  - De límites: Límite nocturno, tope bajo durante 24 h para equipos nuevos y una espera para subir los límites.
  - De bloqueo y devolución: Bloqueo inmediato ante un fraude, investigación en máximo 10 días calendario y devolución en los 2 días hábiles siguientes.
  - De fallo del antifraude: Si el scoring no responde el pago sigue con límites reducidos en vez de bloquear todo.
- Procedimientos:
  - Playbooks de incidentes: Uno para robo de cuentas, fraude masivo, DDoS, ransomware y caída del sistema de pago, todos con reporte a la SFC (taxonomía TUIC).
  - Vulnerabilidades: Las críticas se corrigen en 7 días y las altas en 30.
  - Cambios: Todo cambio pasa por revisión entre pares, pipeline seguro y doble aprobación para producción.
  - Liquidez: Alerta temprana del saldo en el MOL para que {empresa} no quede inactiva.
**Detalle y justificación:** La última regla es un ejemplo de decisión de arquitectura. Bloquear todo protege contra el fraude, pero rompe la disponibilidad. Dejar pasar todo protege la disponibilidad, pero abre el fraude. La opción intermedia (degradar con límites) equilibra los dos atributos de la capa Conceptual.

## HOW — Process Mechanisms (Applications; Middleware; Systems; Security Mechanisms)
**Qué va aquí:** Encabezado de la plantilla: "Applications; Middleware; Systems; Security Mechanisms". Las aplicaciones, sistemas y **mecanismos de seguridad** que materializan cada servicio lógico.
**En la matriz:**

La aplicación se compone de la app móvil, un gateway de APIs, contenedores con los servicios de pago, una base de datos y un conector hacia el sistema de pago y a cada parte le ponemos su control. A los clientes les pedimos doble factor con passkeys y biometría con prueba de vida atadas al dispositivo vinculado. La app la protegemos con autoprotección en tiempo de ejecución, anti-tampering y atestación del dispositivo. Delante del gateway ponemos WAF, anti-DDoS y gestión de bots y el gateway valida el token en cada llamada.

Los contenedores usan imágenes mínimas, firmadas y endurecidas y las redes van microsegmentadas. A la base de datos le ponemos firewall de base de datos, cifrado con llaves en HSM y tokenización de los datos sensibles. El conector sale por un canal dedicado y cifrado con mTLS y cada mensaje ISO 20022 va firmado así que el pago no se puede alterar en el camino. El motor antifraude evalúa cada pago en línea, los registros van a un SIEM con logs inmutables y los equipos de los empleados llevan DLP y EDR.

**Para la presentación:**
- Usuarios (clientes): Entran con passkeys (FIDO2) y biometría con prueba de vida atadas al dispositivo vinculado, o sea doble factor (servicio de autenticación).
- App móvil: La protegemos con RASP, anti-tampering y atestación del dispositivo (servicio de protección de la app).
- Entrada desde internet: Ponemos WAF, anti-DDoS y gestión de bots delante del gateway de APIs que valida el token en cada llamada (servicios de protección perimetral y de APIs).
- Servidores y contenedores: Usamos imágenes mínimas, firmadas y con hardening CIS y separamos las redes con microsegmentación (servicio de protección de redes).
- Motor antifraude: Evalúa cada pago en línea con reglas, machine learning y biometría conductual (servicio antifraude).
- Base de datos: Le ponemos un firewall de base de datos, cifrado envolvente con llaves en HSM/KMS y tokenización de los datos sensibles (servicios de criptografía y protección de datos).
- Conexión con el sistema de pago: Sale por un canal dedicado y cifrado con mTLS y cada mensaje ISO 20022 va firmado (servicio de mensajería interbancaria).
- Registros y equipos de empleados: Mandamos todo a un SIEM con correlación y logs inmutables y en los equipos ponemos DLP y EDR (servicios de monitoreo y de endpoint).
**Detalle y justificación:** Asesoría del docente (nov-2026): La celda quedó ordenada por componente y su control porque es lo que él va a preguntar (a la base de datos un firewall de base de datos, la conexión por un canal dedicado y cifrado, los usuarios con doble factor). El firewall de base de datos es un control nuevo que salió de esa asesoría. Entre paréntesis va el servicio de `3-logical.md` que cada control materializa.

## WHO — Human Interface (User Interface to ICT Systems; Access Control Systems)
**Qué va aquí:** Encabezado de la plantilla: "User Interface to ICT Systems; Access Control Systems". Las interfaces con las que las personas interactúan con los sistemas y el sistema de control de acceso (RBAC o ABAC).
**En la matriz:**

El cliente entra a la app con biometría, antes de confirmar un pago ve el nombre enmascarado del destinatario y después recibe una alerta de cada movimiento. La app además le aclara que en Bre-B nunca hay que aceptar una transferencia para recibir plata porque ese es uno de los engaños más comunes. La sesión se bloquea tras varios intentos fallidos, se cierra por inactividad y le muestra al cliente su último ingreso.

Los empleados entran a la consola interna con inicio de sesión único y llave física FIDO2. El acceso se controla por rol y además por atributos como el monto, el horario y la ubicación. Los accesos privilegiados son temporales, los aprueba un segundo funcionario y la sesión queda grabada.

**Para la presentación:**
- Clientes:
  - App: El cliente entra con biometría, ve el nombre enmascarado antes de confirmar y recibe una alerta push de cada movimiento.
  - Aviso antiestafa: La app le aclara que en Bre-B no hay que "aceptar" transferencias para recibir plata.
- Empleados:
  - Consola interna: Todos entran con inicio de sesión único y llave FIDO2.
  - Control de acceso: RBAC por perfil más reglas por atributo (ABAC) según monto, horario y ubicación.
  - Accesos privilegiados: El acceso es temporal, lo aprueba un segundo funcionario y la sesión queda grabada.
- Protección de sesión: Bloqueo tras intentos fallidos, cierre por inactividad y aviso del último ingreso.
**Detalle y justificación:** El aviso antiestafa responde al vector de fraude local más común (SMS con un enlace para "aceptar" una transferencia de Bre-B). El último ingreso visible y el bloqueo por intentos son exigencias de la CBJ para internet y banca móvil (P.I, T.II, Cap. I).

## WHERE — ICT Infrastructure (Host Platforms, Layout & Networks) → controles por capa de defensa en profundidad
**Qué va aquí:** Encabezado de la plantilla: "Host Platforms, Layout & Networks". Las plataformas, la disposición y las redes. Siguiendo al docente, los controles se separan por capa: perimetral, red, sistema operativo y contenedores, aplicación, datos, identidad y procedimental.
**En la matriz:**

Cada dominio de la capa lógica tiene su lugar en la infraestructura. La app corre en el celular del cliente y el QR está impreso o es dinámico en el comercio. La red de entrega de contenido y el WAF están en el borde del proveedor y el gateway en una subred pública que es la única con entrada desde internet. El core de pagos corre en contenedores en subredes privadas repartidas en 3 zonas y sin salida directa a internet y la base de datos, el HSM y la bóveda de secretos están en subredes aisladas.

El conector interbancario tiene su propia subred con 2 enlaces privados de proveedores distintos hasta el punto de conexión en Bogotá. La gestión vive en una cuenta separada a la que solo se entra por bastión. Hay una cuenta por ambiente, una red por dominio y un nodo central que inspecciona el tráfico entre redes. Todo corre en una región principal con 3 zonas, una región alterna en caliente y una cuenta aislada con copias inmutables para recuperarse de un ataque.

**Para la presentación:**
- Dónde corre cada dominio:
  - Cliente: La app corre en iOS y Android en el celular del cliente y el QR está impreso o es dinámico en el comercio.
  - Exposición: La CDN y el WAF están en el borde del proveedor y el gateway de APIs en una subred pública que es la única con entrada desde internet.
  - Core de pagos: Contenedores en subredes privadas repartidas en 3 zonas de disponibilidad y sin salida directa a internet.
  - Información sensible: La base de datos, el HSM y la bóveda de secretos están en subredes aisladas sin ruta a internet.
  - Interbancario: El conector está en una subred dedicada con 2 enlaces privados de proveedores distintos hasta el punto de Bogotá y de ahí al sistema de pago.
  - Gestión: Una cuenta separada con el SIEM y las herramientas de administración a la que solo se entra por bastión o sesión gestionada.
- Disposición: Una cuenta por ambiente (desarrollo, pruebas y producción), una red virtual por dominio y un nodo central de tránsito que inspecciona el tráfico entre redes.
- Sitios: Una región principal con 3 zonas, una región alterna en caliente y una cuenta de ciberrecuperación aislada con copias inmutables.
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
**Qué va aquí:** Encabezado de la plantilla: "Timing & Sequencing of Processes and Sessions". Tiempos y secuencias: disponibilidad, recuperación, sesiones. El docente explicó dos conceptos:
- **RTO:** Tiempo de recuperación objetivo, es decir, cuánto puede estar caído el servicio.
- **RPO:** Punto de recuperación objetivo, es decir, cuánta información del pasado se puede perder.

Tiempos cortos significan inversión alta ("las entidades financieras invierten mucha plata en recuperar en segundos").
**En la matriz:**

Un pago sigue esta secuencia: Autenticación, resolución de la llave, confirmación del nombre enmascarado, antifraude, débito, envío al sistema de pago, liquidación en el Banco de la República y abono con notificación. Los 20 segundos se miden con las marcas de tiempo del Banco de la República y al antifraude le damos menos de 300 milisegundos. Cada pago lleva una llave de idempotencia para que un reintento no duplique el débito y se rechaza cualquier mensaje con más de 30 segundos de antigüedad.

Para recuperarse los pagos, el antifraude y la conexión tienen RTO de menos de 1 minuto si cae una zona y de hasta 2 horas si cae la región, con RPO cero. Las llaves, las notificaciones y el QR tienen RTO de 1 hora y RPO de 5 minutos y el backoffice de 24 horas. El paso a la región alterna lo decide el comité de crisis. La sesión administrativa dura máximo 1 hora y tras un cambio de equipo o de SIM hay 24 horas sin envíos.

**Para la presentación:**
- El pago:
  - Secuencia: Autenticación y step-up → resolución de llave → el cliente confirma el nombre enmascarado → antifraude → débito → sistema de pago → liquidación en el MOL → abono y notificación.
  - Presupuesto de tiempo: Los 20 s se miden entre las marcas T110 y T140 del Banco de la República, al antifraude le damos menos de 300 ms y la resolución de llave se corta a los 10 s.
  - Marcas de tiempo: Cada mensaje del flujo conserva las marcas del anterior y agrega las suyas para poder medir cada tramo.
  - Reintentos: Cada pago lleva una llave de idempotencia para que un reintento no duplique el débito y se rechaza cualquier mensaje con más de 30 s de antigüedad (anti-replay).
- La recuperación (RTO y RPO):
  - Nivel 0 (pagos, antifraude, conexión): RTO menor a 1 minuto si cae una zona y de hasta 2 horas si cae la región, RPO 0.
  - Niveles 1 y 2: Llaves, notificaciones y QR con RTO de 1 hora y RPO de 5 minutos, backoffice y analítica con RTO y RPO de 24 horas.
  - Secuencia: La caída de una zona se resuelve sola, el paso a la región alterna lo decide el comité de crisis y se completa en máximo 2 horas igual que la restauración desde copias inmutables.
- Sesiones y bloqueo: La sesión administrativa dura máximo 1 hora y tras un cambio de equipo o de SIM hay 24 horas sin envíos.
**Detalle y justificación:** Los principios para infraestructuras del mercado financiero (PFMI, Principio 17, CPMI-IOSCO) piden que los sistemas críticos puedan reanudar operaciones en máximo 2 horas. El RPO 0 del nivel 0 exige replicación síncrona entre zonas; el costo se justifica porque perder una transacción confirmada significa perder dinero de un cliente. Los niveles 1 y 2 son propuestas de diseño, no cifras regulatorias.

## Trazabilidad
- **Hacia arriba:** Cada mecanismo materializa un servicio de `3-logical.md` (la correspondencia va entre paréntesis en la columna HOW).
- **Hacia abajo:** Cada mecanismo tiene un producto en `5-component.md`.

## Fuentes
- White paper SABSA, p. 13.
- [PFMI, CPMI-IOSCO](https://www.bis.org/cpmi/publ/d101a.pdf), [CPMI-IOSCO, ciberresiliencia (d212)](https://www.bis.org/cpmi/publ/d212.htm).
- [AWS, sistemas de pago críticos multirregión](https://aws.amazon.com/blogs/industries/architecting-critical-payment-systems-for-multi-region-resiliency).
- [Texto compilado de la CBJ (CE 006/2025)](https://normativa.colpensiones.gov.co/colpens/compilacion/docs/circular_superfinanciera_0006_2025.htm).
