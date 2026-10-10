---
capa: component
vista: Tradesman's View (técnico)
responsable: Líder de SecOps / DevSecOps
con_quien_se_habla: Los técnicos e integradores. Es la «lista de compras» de productos, herramientas y estándares.
---
# Capa Component — productos y tecnologías

> Productos, herramientas y estándares concretos de proveedores: la *bill of materials* de la arquitectura (white paper SABSA, pp. 5 y 13). El docente la considera «demasiado técnica» y le da menos peso en la sustentación que a las otras cuatro, pero el entregable pide una slide de esta capa. Los productos son ejemplos razonables para una fintech en AWS, no una recomendación comercial.

## WHAT — ICT Components (ICT Products, including Data Repositories and Processors)
**Qué va aquí:** Encabezado de la plantilla: «ICT Products, including Data Repositories and Processors». Los productos TIC, incluidos los repositorios de datos y los procesadores.
**En la matriz:**
- Repositorio transaccional: Amazon Aurora PostgreSQL cifrado (clientes, llaves y transacciones), con réplica entre regiones.
- Repositorio de registros y evidencias: Amazon S3 con Object Lock en modo compliance (logs inmutables).
- Repositorio de código: GitHub, con ramas protegidas y commits firmados (código de la app y de los servicios).
- Caché de resolución de llaves: Redis (Amazon ElastiCache).
- Procesamiento: Amazon EKS (Kubernetes) en la región principal y en la alterna.
- Procesamiento de eventos: Apache Kafka (Amazon MSK).
- Procesadores criptográficos y de secretos: AWS CloudHSM (raíz de confianza), AWS KMS y HashiCorp Vault.
**Detalle y justificación:** Cierra la cadena vertical de la columna WHAT que señaló el profesor: inventario de activos (Logical) → diccionario de datos (Physical) → **repositorios y procesadores** (Component). Cada repositorio guarda un activo de `3-logical.md`: las bases de datos guardan la información de clientes y transaccional, GitHub guarda el código fuente, S3 guarda los registros y el HSM guarda las llaves criptográficas.

## WHY — Risk Management Tools & Standards (Risk Analysis Tools; Risk Registers; Risk Monitoring and Reporting Tools)
**Qué va aquí:** Encabezado de la plantilla: «Risk Analysis Tools; Risk Registers; Risk Monitoring and Reporting Tools». Las herramientas de análisis, registro, monitoreo y reporte de riesgo.
**En la matriz:**
- Antifraude: Feedzai (o equivalente) con reglas y machine learning, gobernado bajo ISO/IEC 42001.
- SIEM y SOAR: Microsoft Sentinel con playbooks automáticos.
- Postura en la nube: AWS Security Hub y Amazon GuardDuty.
- Vulnerabilidades: Tenable para la infraestructura y Snyk para dependencias y contenedores.
- Fuga de datos y shadow AI: Microsoft Purview DLP en los equipos y en la IA corporativa.
- Registro de riesgos y cumplimiento: Herramienta GRC (p. ej. Archer) con el registro de riesgos y las evidencias.

## HOW — Process Tools & Standards (Tools and Protocols for Process Delivery)
**Qué va aquí:** Encabezado de la plantilla: «Tools and Protocols for Process Delivery». Las herramientas y los protocolos con los que se entregan los procesos.
**En la matriz:**
- Protocolos: TLS 1.3, mTLS (X.509), OAuth 2.1 / OpenID Connect y FIDO2/WebAuthn.
- Mensajes con el sistema de pago: ISO 20022 sobre REST, como lo exige la DSP-465.
- Perímetro: Cloudflare (WAF, anti-DDoS y bots) delante del API Gateway.
- Service mesh: Istio, para mTLS automático entre microservicios.
- Pipeline seguro: GitHub Actions con Semgrep (SAST), Snyk (SCA), Trivy (contenedores) y OWASP ZAP (DAST).
- Protección de la app: SDK de RASP y atestación (Play Integrity / App Attest).
- Endpoint: CrowdStrike Falcon en los equipos de los empleados.

## WHO — Personnel Management Tools & Standards (Identities; Job Descriptions; Roles; Functions; Actions & ACLs)
**Qué va aquí:** Encabezado de la plantilla: «Identities; Job Descriptions; Roles; Functions; Actions & Access Control Lists». Las identidades, los roles, las funciones y las listas de control de acceso.
**En la matriz:**
- Identidad de clientes (CIAM): Auth0 / Okta Customer Identity o Keycloak.
- Identidad de empleados: Microsoft Entra ID con acceso condicional y llaves YubiKey.
- Accesos privilegiados: CyberArk o Teleport para acceso temporal.
- Roles y grupos: Analista de fraude, agente, ingeniero de plataforma, SRE, analista SOC y auditor, cada uno con su grupo y su ACL.
- Ciclo de vida de identidades: Alta, cambio y baja automáticos desde el sistema de RR. HH.
- Recertificación: Revisión trimestral de accesos por cada dueño de proceso.

## WHERE — Locator Tools & Standards (Nodes, Addresses and other Locators)
**Qué va aquí:** Encabezado de la plantilla: «Nodes, Addresses and other Locators». Los nodos, las direcciones y los demás localizadores.
**En la matriz:**
- Nodos: Clústeres EKS de producción en 3 zonas y clúster de DR en la región alterna.
- Direccionamiento: Rangos de IP privados por VPC, sin IP pública en los nodos del core ni de datos.
- Conexión al sistema de pago: AWS Direct Connect con dos enlaces por proveedores distintos.
- Punto público: La API pública solo se expone detrás de Cloudflare.
- DNS: Route 53 privado para lo interno y DNSSEC en el dominio público.

## WHEN — Step Timing & Sequencing Tools (Time Schedules; Clocks, Timers & Interrupts)
**Qué va aquí:** Encabezado de la plantilla: «Time Schedules; Clocks, Timers & Interrupts». Los calendarios, relojes, temporizadores e interrupciones.
**En la matriz:**
- Relojes: Sincronización NTP (Amazon Time Sync) en todos los nodos, para que logs y firmas tengan sellos de tiempo confiables.
- Pentest: Semestral (exigencia de la SFC) y antes de cada cambio mayor de la app.
- Escaneo de vulnerabilidades: Semanal en la infraestructura y en cada build del pipeline.
- Simulacros: Pruebas de DRP semestrales y ejercicio de mesa de ransomware anual.
- Rotación automática: Secretos de Vault a diario y certificados cada 90 días.
- Recertificación de accesos: Trimestral.

## Trazabilidad
- **Hacia arriba:** Cada producto implementa un mecanismo de `4-physical.md`. Por ejemplo, CloudHSM implementa el HSM/KMS, que implementa el servicio de criptografía, que implementa el Objetivo de control 3, que protege el atributo «confidencial», que viene del activo «confianza del cliente».
- Si un producto no se puede rastrear así hacia arriba, sobra (principio de justificación de negocio de SABSA).

## Fuentes
- White paper SABSA, pp. 5 y 13.
- [Texto compilado de la CBJ (CE 006/2025)](https://normativa.colpensiones.gov.co/colpens/compilacion/docs/circular_superfinanciera_0006_2025.htm), donde están el pentest semestral y el análisis de vulnerabilidades dos veces al año.
