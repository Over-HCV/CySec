---
capa: operacional
vista: Service Manager's View (gestión del servicio)
responsable: CISO con el SOC y la operación de TI
con_quien_se_habla: Quien opera la seguridad en el día a día (SOC, mesa de servicio, operación de TI).
---
# Capa de Service Management (operación) — la 6.ª capa de SABSA

> SABSA tiene seis capas. La sexta, **Service Management**, no es una fila más sino una franja vertical que atraviesa las otras cinco, porque «los temas de gestión del servicio de seguridad aparecen en todas las demás capas» (white paper, p. 8, Fig. 1). Se alinea con ITIL v3 y su desarrollo arranca desde el inicio del proyecto (pp. 13–14 y 18). El docente la mencionó («la capa de servicio de operación») pero la plantilla del entregable tiene 5 filas, así que **esta capa no entra al Excel**. Queda documentada para la sustentación: es «lo que sigue» después de diseñar.

## WHAT — Service Delivery Management
**Qué va aquí:** Asegurar la continuidad y la excelencia operativa del servicio y proteger los datos operativos (white paper, Tabla 3, p. 16).
**En la matriz:**
- Continuidad del servicio de pagos: ≥ 99,95 % mensual y ≥ 99,5 % de pagos en < 20 s, medidos cada semana.
- Catálogo de servicios de seguridad: Los 24 servicios de `3-logical.md`, cada uno con dueño y SLA.
- Gestión de la capacidad: Preparación para los picos de quincena, primas y diciembre.
- Datos operativos protegidos: Logs, evidencias e indicadores con integridad garantizada.
- Contingencia con el Banco de la República: Uso de los manuales de contingencia del DICE y del MOL.

## WHY — Operational Risk Management
**Qué va aquí:** Evaluación de riesgo, monitoreo y reporte, y tratamiento del riesgo.
**En la matriz:**
- Semáforo de indicadores: Cada KPI es también un KRI, con un umbral primario y uno de alerta temprana.
- Fraude: Verde < 3 pb, amarillo 3–5 pb, rojo > 5 pb del valor transado.
- Disponibilidad: Verde ≥ 99,95 %, amarillo 99,9–99,95 %, rojo < 99,9 %.
- Registro de riesgos: Se actualiza cada trimestre en la herramienta GRC y se presenta al comité.
- Reporte a la Junta: Informe semestral de la unidad de ciberseguridad, como lo pide la SFC.
**Detalle y justificación:** SABSA dice que no cumplir una meta de desempeño es un evento de riesgo, por lo que cada KPI es también un KRI. Se fija un umbral primario, que expresa el apetito de riesgo, y uno secundario de alerta temprana (white paper, p. 18). Los valores de los umbrales son supuestos del caso.

## HOW — Process Delivery Management
**Qué va aquí:** Gestión y soporte de sistemas y servicios: administración de seguridad, respaldos, monitoreo y respuesta a emergencias.
**En la matriz:**
- SOC 24/7: Monitoreo, detección y primera respuesta.
- Gestión de incidentes: Clasificación TUIC, reporte a la SFC y a ColCERT, y aviso a los clientes afectados.
- Gestión de fraude en vivo: Revisión de alertas, retención, bloqueo de llaves y devoluciones.
- Gestión de cambios y de vulnerabilidades: Con los plazos de parcheo de la capa Physical.
- Respaldos y recuperación: Verificación diaria de copias y restauraciones de prueba.

## WHO — Personnel Management
**Qué va aquí:** Aprovisionamiento de cuentas y soporte a usuarios, operadores y administradores.
**En la matriz:**
- Alta, cambio y baja de accesos ligados a RR. HH., el mismo día del cambio.
- Recertificación trimestral de accesos por los dueños de proceso.
- Concienciación: Formación anual del personal y phishing simulado trimestral.
- Educación al cliente: Campañas contra las estafas con Bre-B.
- Roles de guardia: Turnos del SOC y de la mesa de fraude con escalamiento definido.

## WHERE — Management of Environment
**Qué va aquí:** Gestión de sedes, plataformas y redes.
**En la matriz:**
- Plataforma en la nube: Revisión de la postura de seguridad y de las certificaciones del proveedor.
- Proveedores críticos: Seguimiento del sistema de pago, la nube, la validación de identidad y el antifraude.
- Sedes y trabajo remoto: Controles para equipos fuera de la oficina.
- Ambientes: Desarrollo, pruebas y producción separados y vigilados.

## WHEN — Time & Performance Management
**Qué va aquí:** Gestión del calendario y del cronograma de seguridad.
**En la matriz:**
- Diario: Verificación de respaldos, conciliación con el MOL y revisión de alertas críticas.
- Semanal: Medición del 99,5 % de pagos en < 20 s y escaneo de vulnerabilidades.
- Trimestral: Revisión de riesgos, recertificación de accesos y phishing simulado.
- Semestral: Pentest, prueba de DRP e informe a la Junta.
- Anual: Ejercicio de mesa de ransomware, revisión de políticas y auditoría del SGSI.

## Fuentes
- White paper SABSA: pp. 8, 13–14, 16–18 (Tabla 4, desglose de Service Management por capa, alineado con ITIL v3).
- [Texto compilado de la CBJ (CE 006/2025)](https://normativa.colpensiones.gov.co/colpens/compilacion/docs/circular_superfinanciera_0006_2025.htm), con el informe semestral de la unidad de ciberseguridad y el reporte TUIC/TLP.
