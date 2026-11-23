---
capa: component
vista: Tradesman's View (técnico)
rol: Líder de SecOps / DevSecOps
responsable: >-
  La responsabilidad de esta capa es del Líder de SecOps / DevSecOps con los especialistas de seguridad. Ellos escogen el producto y el estándar que materializa cada control de la capa física y lo integran al pipeline y a la operación. Los productos que se nombran son una propuesta y se pueden cambiar por equivalentes siempre que cumplan el mismo control.
con_quien_se_habla: Los técnicos e integradores. Es la "lista de compras" de productos, herramientas y estándares.
voz: Hablamos con el Líder de SecOps / DevSecOps y los especialistas (ver 0-organigrama.md)
---
# Capa Component — productos y tecnologías

> Productos, herramientas y estándares concretos de proveedores: la *bill of materials* de la arquitectura (white paper SABSA, pp. 5 y 13). El docente la considera "demasiado técnica" y le da menos peso en la sustentación que a las otras cuatro, pero el entregable pide una slide de esta capa. Los productos son ejemplos razonables para una fintech en AWS, no una recomendación comercial.

## WHAT — ICT Components (ICT Products, including Data Repositories and Processors)
**Qué va aquí:** Encabezado de la plantilla: "ICT Products, including Data Repositories and Processors". Los productos TIC, incluidos los repositorios de datos y los procesadores.
**En la matriz:**

Los datos de clientes, llaves y transacciones quedarían en Amazon Aurora PostgreSQL cifrado con réplica entre regiones. Los registros y las evidencias irían en Amazon S3 con Object Lock para que sean inmutables y el código en GitHub con ramas protegidas y commits firmados. Para resolver llaves rápido se usaría una caché en Amazon ElastiCache (Redis).

El cómputo correría en Amazon EKS en la región principal y en la alterna y los eventos de pago viajarían por Apache Kafka sobre Amazon MSK. La raíz de confianza criptográfica sería AWS CloudHSM con AWS KMS para el cifrado envolvente y HashiCorp Vault para los secretos.

**Para la presentación:**
- Repositorios:
  - Transaccional: Amazon Aurora PostgreSQL cifrado (clientes, llaves y transacciones) con réplica entre regiones.
  - De registros y evidencias: Amazon S3 con Object Lock en modo compliance para los logs inmutables.
  - De código: GitHub con ramas protegidas y commits firmados.
  - Caché de resolución de llaves: Redis (Amazon ElastiCache).
- Procesadores:
  - De cómputo: Amazon EKS (Kubernetes) en la región principal y en la alterna.
  - De eventos: Apache Kafka (Amazon MSK).
  - Criptográficos y de secretos: AWS CloudHSM como raíz de confianza con AWS KMS y HashiCorp Vault.
**Detalle y justificación:** Cierra la cadena vertical de la columna WHAT que señaló el profesor: inventario de activos (Logical) → diccionario de datos (Physical) → **repositorios y procesadores** (Component). Cada repositorio guarda un activo de `3-logical.md`: las bases de datos guardan la información de clientes y transaccional, GitHub guarda el código fuente, S3 guarda los registros y el HSM guarda las llaves criptográficas.

## WHY — Risk Management Tools & Standards (Risk Analysis Tools; Risk Registers; Risk Monitoring and Reporting Tools)
**Qué va aquí:** Encabezado de la plantilla: "Risk Analysis Tools; Risk Registers; Risk Monitoring and Reporting Tools". Las herramientas de análisis, registro, monitoreo y reporte de riesgo.
**En la matriz:**

El antifraude sería Feedzai o una plataforma equivalente con reglas y machine learning, gobernada bajo ISO/IEC 42001 porque decide con IA. Microsoft Sentinel funcionaría como SIEM y SOAR con playbooks automáticos y la postura de la nube se vigilaría con AWS Security Hub y Amazon GuardDuty alimentados por AWS CloudTrail.

Para vulnerabilidades se usarían Tenable en la infraestructura y Snyk en dependencias y contenedores. Microsoft Purview DLP cubriría la fuga de datos en los equipos y en la IA corporativa y Amazon Macie descubriría datos sensibles en S3 para apoyar la clasificación. El registro de riesgos y las evidencias de cumplimiento vivirían en una herramienta GRC como Archer.

**Para la presentación:**
- Antifraude: Feedzai (o equivalente) con reglas y machine learning, gobernado bajo ISO/IEC 42001.
- SIEM y SOAR: Microsoft Sentinel con playbooks automáticos.
- Postura en la nube: AWS Security Hub y Amazon GuardDuty con AWS CloudTrail como fuente de los eventos de la cuenta.
- Vulnerabilidades: Tenable para la infraestructura y Snyk para dependencias y contenedores.
- Fuga de datos y shadow AI: Microsoft Purview DLP en los equipos y en la IA corporativa.
- Descubrimiento de datos sensibles: Amazon Macie sobre los repositorios en S3 para apoyar la clasificación.
- Registro de riesgos y cumplimiento: Herramienta GRC (p. ej. Archer) con el registro de riesgos y las evidencias.

## HOW — Process Tools & Standards (Tools and Protocols for Process Delivery)
**Qué va aquí:** Encabezado de la plantilla: "Tools and Protocols for Process Delivery". Las herramientas y los protocolos con los que se entregan los procesos.
**En la matriz:**

Cada control de la capa física tiene su producto o estándar. Los canales usan TLS 1.3 y mTLS con certificados X.509, la identidad usa OAuth 2.1 y OpenID Connect y los clientes se autentican con FIDO2/WebAuthn. Los mensajes con el sistema de pago van en ISO 20022 sobre REST como lo pide la DSP-465. Cloudflare pone el WAF, el anti-DDoS y la gestión de bots delante del API Gateway.

El firewall de la base de datos se arma con grupos de seguridad y Database Activity Streams de Aurora vigila quién la consulta. Istio da mTLS automático entre microservicios. El pipeline corre en GitHub Actions con Semgrep, Snyk, Trivy y OWASP ZAP, la app lleva un SDK de RASP con atestación de Play Integrity y App Attest y los equipos de los empleados llevan CrowdStrike Falcon.

**Para la presentación:**
- Protocolos: TLS 1.3, mTLS (X.509), OAuth 2.1 / OpenID Connect y FIDO2/WebAuthn.
- Mensajes con el sistema de pago: ISO 20022 sobre REST como lo exige la DSP-465.
- Perímetro: Cloudflare (WAF, anti-DDoS y bots) delante del API Gateway.
- Base de datos: Grupos de seguridad como firewall de la base y Database Activity Streams de Aurora para vigilar quién la consulta.
- Service mesh: Istio para tener mTLS automático entre microservicios.
- Pipeline seguro: GitHub Actions con Semgrep (SAST), Snyk (SCA), Trivy (contenedores) y OWASP ZAP (DAST).
- Protección de la app: SDK de RASP y atestación con Play Integrity / App Attest.
- Endpoint: CrowdStrike Falcon en los equipos de los empleados.
**Detalle y justificación:** El bullet de base de datos responde al firewall de base de datos de `4-physical.md`: los grupos de seguridad de la VPC limitan quién llega a la base y Database Activity Streams de Aurora registra la actividad.

## WHO — Personnel Management Tools & Standards (Identities; Job Descriptions; Roles; Functions; Actions & ACLs)
**Qué va aquí:** Encabezado de la plantilla: "Identities; Job Descriptions; Roles; Functions; Actions & Access Control Lists". Las identidades, los roles, las funciones y las listas de control de acceso.
**En la matriz:**

Las identidades de los clientes las manejaría un CIAM como Auth0, Okta Customer Identity o Keycloak. Los empleados estarían en Microsoft Entra ID con acceso condicional y llaves YubiKey y los accesos privilegiados pasarían por CyberArk o Teleport para que sean temporales.

Cada perfil de la capa lógica (analista de fraude, agente, ingeniero de plataforma, SRE, analista SOC y auditor) tiene su grupo y su ACL. El alta, el cambio y la baja salen automáticos desde el sistema de recursos humanos y cada dueño de proceso recertifica los accesos cada trimestre.

**Para la presentación:**
- Identidades:
  - De clientes (CIAM): Auth0 / Okta Customer Identity o Keycloak.
  - De empleados: Microsoft Entra ID con acceso condicional y llaves YubiKey.
  - Privilegiadas: CyberArk o Teleport para el acceso temporal.
- Roles y grupos: Analista de fraude, agente, ingeniero de plataforma, SRE, analista SOC y auditor tienen cada uno su grupo y su ACL.
- Ciclo de vida: El alta, el cambio y la baja salen automáticos desde el sistema de RR. HH.
- Recertificación: Cada dueño de proceso revisa los accesos cada trimestre.

## WHERE — Locator Tools & Standards (Nodes, Addresses and other Locators)
**Qué va aquí:** Encabezado de la plantilla: "Nodes, Addresses and other Locators". Los nodos, las direcciones y los demás localizadores.
**En la matriz:**

Del lado del negocio los localizadores son las llaves de Bre-B (celular, cédula, correo, alfanumérica y código de comercio) que el directorio del Banco de la República resuelve a una cuenta y los QR que llevan los datos del comercio para pagar sin escribir la llave.

Del lado técnico los nodos son clústeres EKS de producción en 3 zonas y uno de recuperación en la región alterna. Cada VPC tiene su rango privado sin solaparse y ni el core ni los datos tienen IP pública. Los servicios de AWS se alcanzan por VPC endpoints sin pasar por internet. La conexión al sistema de pago sale por AWS Direct Connect desde Equinix BG1 en Bogotá con dos enlaces de proveedores distintos. La API pública solo se expone detrás de Cloudflare, lo interno usa Route 53 privado y el dominio público tiene DNSSEC.

**Para la presentación:**
- Localizadores del negocio:
  - Llaves Bre-B: Celular, cédula, correo, alfanumérica y código de comercio, el directorio (DICE) las resuelve a una cuenta.
  - QR: Localizador del comercio que lleva los datos para pagar sin escribir la llave.
- Localizadores técnicos:
  - Nodos: Clústeres EKS de producción en 3 zonas y un clúster de DR en la región alterna.
  - Direccionamiento: Un rango de IP privado por VPC sin solaparse y sin IP pública en los nodos del core ni de datos.
  - Endpoints privados: Los servicios de AWS (KMS, S3, ECR) se alcanzan por VPC endpoints sin pasar por internet.
  - Conexión al sistema de pago: AWS Direct Connect en Equinix BG1 (Bogotá) con dos enlaces de proveedores distintos.
  - Punto público y DNS: La API pública solo se expone detrás de Cloudflare, Route 53 privado para lo interno y DNSSEC en el dominio público.
**Detalle y justificación:** Asesoría del docente (nov-2026): El rango de ejemplo del core de producción (10.10.0.0/16) salió de la celda porque es configuración y no arquitectura.

## WHEN — Step Timing & Sequencing Tools (Time Schedules; Clocks, Timers & Interrupts)
**Qué va aquí:** Encabezado de la plantilla: "Time Schedules; Clocks, Timers & Interrupts". Los calendarios, relojes, temporizadores e interrupciones.
**En la matriz:**

Todos los nodos se sincronizan con la Hora Legal de Colombia del INM mediante chrony y Amazon Time Sync queda de respaldo. Con eso cada mensaje de llaves y pagos lleva su marca ISO 8601 con milésimas y se alerta si un nodo se desfasa.

Los temporizadores son el corte de 10 segundos en la resolución de llave, un límite en cada salto del pago, la sesión del cliente de 5 minutos, los tokens de 10 minutos, los secretos de Vault rotados a diario y los certificados cada 90 días. Las interrupciones las manejan un circuit breaker hacia el sistema de pago, un kill switch del antifraude que pasa a límites reducidos y un break-glass que caduca solo. El escaneo de vulnerabilidades corre cada semana y en cada build y el pentest y la prueba de DRP cada semestre.

**Para la presentación:**
- Relojes: Todos los nodos se sincronizan con la Hora Legal del INM mediante chrony y Amazon Time Sync queda solo como respaldo.
- Marcas de tiempo: ISO 8601, hora local y con milésimas en cada mensaje de llaves y pagos, con alerta si un nodo se desfasa.
- Temporizadores:
  - De la operación: Time-out de 10 s en la resolución de llave, time-outs en cada salto del pago y sesión del cliente de 5 minutos.
  - De identidad: Tokens de acceso de 10 minutos, secretos de Vault rotados a diario y certificados cada 90 días.
- Interrupciones: Circuit breaker hacia el sistema de pago, kill switch del antifraude (pasa a límites reducidos), alerta de turno al SOC y break-glass que caduca solo.
- Calendario técnico: Escaneo de vulnerabilidades cada semana y en cada build, pentest y DRP cada semestre (el pentest lo exige la SFC) y recertificación de accesos cada trimestre.

## Trazabilidad
- **Hacia arriba:** Cada producto implementa un mecanismo de `4-physical.md`. Por ejemplo, CloudHSM implementa el HSM/KMS, que implementa el servicio de criptografía, que implementa el Objetivo de control 3, que protege el atributo "confidencial", que viene del activo "confianza del cliente".
- Si un producto no se puede rastrear así hacia arriba, sobra (principio de justificación de negocio de SABSA).

## Fuentes
- White paper SABSA, pp. 5 y 13.
- [Texto compilado de la CBJ (CE 006/2025)](https://normativa.colpensiones.gov.co/colpens/compilacion/docs/circular_superfinanciera_0006_2025.htm), donde están el pentest semestral y el análisis de vulnerabilidades dos veces al año.
