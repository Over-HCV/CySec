# Guion de sustentación — Matriz SABSA, NovaPay S.A. (proyecto Bre-B)

**Duración objetivo:** ~11 min de exposición. Después vienen las preguntas del docente y unas conclusiones entre todos.

**Idea fuerza:** El docente dijo que «la matriz no me interesa, lo que necesito es lo que ustedes entendieron como arquitectar», y que no se lea la matriz sino que se cuente «como una historia, como un mapa mental». Por eso cada slide es una conversación con la persona dueña de esa capa, bajando de lo general a lo particular.

| Integrante | Slides | Tiempo aprox. |
|---|---|---|
| Sergio Andrés Caceres Díaz | 1 portada · 2 misión y visión · 3 objetivo del proyecto | 2:45 |
| Michael Steven Pinilla Mateus | 4 Contextual · 5 Conceptual · 6 Logical | 4:30 |
| Over Haider Castrillón Valencia | 7 Physical · 8 Component · 9 conclusiones · 10 cierre | 3:40 |

**Reglas para contarlo:**
- **No leer la pantalla:** La slide resume y el que habla cuenta. Si un dato no está en la slide pero sí en el guion, se dice y no hace falta mostrarlo.
- **Encadenar las capas:** Cada capa arranca retomando la anterior («lo que en la capa de arriba era un objetivo, aquí se vuelve…»). Esa cadena es la trazabilidad de SABSA, y es lo que el docente quiere ver.
- **Seguir la secuencia que pidió el docente:** Primero la empresa (misión y visión), luego el proyecto, y solo después la matriz, de arriba hacia abajo y de izquierda a derecha.
- **Saber decir «con quién se habla» en cada capa:** Contextual con la Junta, Conceptual con el CISO y los directores, Logical con el CISO y el arquitecto, Physical con infraestructura, Component con los técnicos.

> El detalle de cada capa (encabezado de cada celda, lo que pidió el docente, justificación y fuentes) está en `apps/project/matriz/`. El guion solo resume.
>
> El reparto es una propuesta y se puede cambiar. Si se mueve una slide de dueño, se mueve también su transición (la última línea de cada bloque).

---

## [1] Portada — Sergio · 0:30

**Qué se dice**
Buenas tardes. Se presenta la propuesta de arquitectura de seguridad para un proyecto de NovaPay S.A., una compañía de financiamiento digital (ficticia) vigilada por la Superfinanciera. El proyecto es vincular a NovaPay a Bre-B, el sistema de pagos inmediatos del Banco de la República, y para estructurar su seguridad se usó el marco SABSA, recorriendo sus capas de lo general a lo particular.

**Qué señalar**
- El nombre del proyecto en el subtítulo.
- El equipo.

---

## [2] Misión y visión — Sergio · 1:00

**Qué se dice**
Primeramente, y como lo plantea la arquitectura empresarial, todo parte de entender qué hace la empresa y hacia dónde va, porque sin eso no hay cómo saber qué proteger. La misión de NovaPay es que personas y comercios muevan su dinero de forma inmediata, segura y sin costo desde el celular. La visión es ser en 2030 la billetera preferida de quienes hoy usan efectivo, reconocida por la seguridad de sus pagos. De ahí se desprende un objetivo estratégico concreto para 2027: duplicar los clientes activos sin aumentar el fraude. Cabe mencionar que esa segunda mitad («sin aumentar el fraude») es la que le da a la seguridad un lugar en la mesa desde el inicio, no al final.

**Qué señalar**
- Las palabras en rojo de la misión: inmediata, segura, sin costo, confianza.
- La caja roja del objetivo estratégico.

---

## [3] Objetivo del proyecto — Sergio · 1:15

**Qué se dice**
Una organización no invierte en un proyecto si este no mueve un objetivo, por lo cual el proyecto elegido es la vinculación a Bre-B como participante. En Bre-B ninguna entidad se conecta sola al núcleo: se entra a través de uno de los sistemas de pago certificados y se liquida en el MOL del Banco de la República con cuenta propia. Con eso se lanzan en la app las transferencias por llaves y los pagos QR, disponibles 24/7 y en menos de 20 segundos, con la seguridad incluida desde el diseño.

El diagrama muestra la cadena de alineación que busca la arquitectura empresarial: la misión orienta el objetivo estratégico, el objetivo justifica el proyecto (y su presupuesto), y el proyecto se protege con la arquitectura SABSA. Debajo está el plan del proyecto a lo largo de 2027, desde la vinculación con el Banco de la República hasta el lanzamiento al público en el cuarto trimestre.

**Qué señalar**
- La cadena de izquierda a derecha, deteniéndose en «justifica».
- La línea de tiempo (Q1–Q4) y el hito rojo del lanzamiento.

**Transición:** «Con la empresa y el proyecto definidos, Michael presenta cómo se bajó a la primera capa de SABSA».

---

## [4] Contextual (requisitos de negocio) — Michael · 1:30

**Qué se dice**
La capa contextual es la vista del negocio: la conversación con la Junta Directiva y la Presidencia, que son los sponsors del proyecto. Por eso en esta capa no aparece nada técnico. Se responden las seis preguntas de la matriz:

- **Qué:** Los objetivos del proyecto: lanzar transferencias y QR para captar a quien usa efectivo, con los fondos y los datos de los clientes protegidos.
- **Por qué:** Se separan las oportunidades (lo que se puede ganar) de las amenazas (lo que se puede perder). Del lado de las oportunidades, Bre-B ya tiene más de 110 millones de llaves, abre el negocio de comercios con QR y permite posicionar la marca como la opción segura. Del lado de las amenazas, están el fraude, las caídas del servicio y las sanciones si no se cumple con el Banco de la República y la SFC.
- **Cómo:** Todos los procesos que el proyecto necesita, no solo la operación: vinculación con el Banco de la República, desarrollo, pruebas y certificación, aceptación en marcha blanca, y después fraude, conciliación, comercial y servicio al cliente.
- **Quién:** Los sponsors, la Gerencia de Pagos Inmediatos como dueña y todas las áreas que toca el proyecto (negocio, soporte, jurídico, talento humano y segunda línea de defensa), porque un producto así afecta a toda la organización.
- **Dónde:** La sede en Bogotá, un centro de datos principal y uno alterno, y el Banco de la República como contraparte.
- **Cuándo:** Cuándo necesita el negocio cada objetivo. Esto lo dice el dueño, no el implementador: el lanzamiento en el cuarto trimestre de 2027, duplicar clientes a diciembre de 2027, y 24/7 con pagos en menos de 20 segundos desde el primer día.

Un punto que se quiere resaltar es que el CISO es transversal y reporta a Presidencia, no a Tecnología, porque la seguridad toca a todas las áreas y no debería depender de quien tiene que controlar.

**Para profundizar (preguntas):** `apps/project/matriz/1-contextual.md`

**Qué señalar**
- Las 6 celdas en orden (de izquierda a derecha y de arriba hacia abajo).
- Los «+» y el «−» de la celda WHY.
- El «CISO transversal» en rojo.
- El lanzamiento en rojo en la celda WHEN.

---

## [5] Conceptual (estrategias de seguridad) — Michael · 1:30

**Qué se dice**
Progresivamente se baja un nivel. La capa conceptual es la vista del arquitecto, trabajada por el CISO junto con los directores de área. En ella se habla de seguridad a alto nivel (estrategias, políticas y normas), todavía sin nombrar ningún producto.

Arriba está el perfil de atributos, que son las características que deben cumplir los objetivos de la capa anterior. Por ejemplo, el objetivo de fraude controlado se vuelve el atributo «resistente al fraude», y el de servicio siempre disponible se vuelve «disponible» y «oportuno». Aquí aparecen los pilares de confidencialidad, integridad y disponibilidad.

Luego se definen los dominios de seguridad (cliente, exposición, core de pagos, información sensible, el dominio interbancario con el Banco de la República y el de gestión), todos bajo una estrategia de Zero Trust y defensa en profundidad. Es decir, nadie es de confianza por estar «adentro», y si una capa falla, la siguiente contiene el ataque.

Abajo quedan los dueños de cada riesgo y las normas que gobiernan todo:
- **Sistema de gestión:** ISO 27001.
- **IA del modelo antifraude:** ISO 42001.
- **Ciclo de controles:** NIST CSF.
- **Datos personales:** La Ley 1581.
- **Reglas del sector:** La regulación del Banco de la República y de la SFC.

Para gestionar el riesgo a lo largo del tiempo, se toma ISO 31000 como proceso general e ISO/IEC 27005 para los riesgos de seguridad de la información, alineados con el SIAR de la SFC (el sistema integral de riesgos que reemplazó al SARO).

**Para profundizar (preguntas):** `apps/project/matriz/2-conceptual.md`

**Qué señalar**
- La fila de atributos.
- El marco punteado de Zero Trust.
- El canal rojo hacia el dominio interbancario.
- La fila de normas.

---

## [6] Logical (servicios de seguridad) — Michael · 1:30

**Qué se dice**
La capa lógica es la conversación con el CISO y el arquitecto de seguridad, y aquí la seguridad se expresa como **servicios**, no como controles. La diferencia que marcó el docente es esta: «autenticación» es el servicio, mientras que la contraseña, el OTP, el doble factor o la biometría son controles de ese servicio. Un servicio se consume y debe estar disponible, aunque por detrás sea la suma de varios componentes, igual que el servicio de internet de la casa.

Siguiendo su recomendación, primero se sacó el listado de servicios que necesita este proyecto (son 24 en el catálogo) y de ahí salieron los controles. Cinco de esos servicios son propios de los pagos inmediatos y no aparecen en el ejemplo de clase: antifraude en línea, límites dinámicos, gestión de llaves, confirmación del beneficiario y detección de cuentas mula.

Para hacerlo concreto, se siguió el recorrido de un pago Bre-B en seis pasos:

1. Se autentica al cliente.
2. Se resuelve la llave del destinatario mostrando solo su nombre parcial (por privacidad).
3. Se evalúa el riesgo de fraude en menos de 300 milisegundos.
4. El cliente confirma y firma, lo cual da el no repudio.
5. Se envía y se liquida con el Banco de la República por un canal seguro.
6. Se notifica a ambas partes, dejando auditoría.

Todo eso debe ocurrir en menos de 20 segundos. Abajo se ven los perfiles de privilegio (por ejemplo, el agente de servicio ve datos enmascarados y no puede mover dinero) y las políticas clave, como el bloqueo de 24 horas tras un cambio de SIM, que responde directamente al robo de cuentas.

**Para profundizar (preguntas):** `apps/project/matriz/3-logical.md` (ahí está el catálogo completo de servicio → controles y los 10 riesgos principales).

**Qué señalar**
- Recorrer los pasos [1]→[6] con el puntero, leyendo solo el servicio de cada paso.
- Los textos rojos: «< 300 ms», «no repudio» y la llave de los 20 s.
- La política en rojo.

**Transición:** «Hasta aquí se definió qué servicios necesita el proyecto; Over presenta con qué controles se construyen».

---

## [7] Physical (mecanismos de seguridad) — Over · 1:30

**Qué se dice**
La capa física es la vista del constructor, a cargo del Director de Infraestructura. Aquí cada servicio lógico se vuelve un **control** concreto. Como lo pidió el docente, los controles no van todos en una sola bolsa, sino separados por capas, siguiendo el modelo de defensa en profundidad.

Funciona como un edificio. Antes de llegar a lo que se protege hay vigilantes en la entrada, luego una recepción, luego cámaras y puertas con tarjeta, y si alguien supera un anillo, el siguiente lo detiene. En el diagrama el ataque entra desde afuera y se encuentra, uno tras otro, con estos anillos:

1. **Proveedor de nube:** Sus certificaciones y la región alterna.
2. **Perímetro:** WAF, protección contra denegación de servicio y control de bots.
3. **Red:** Segmentación por dominio.
4. **Servidores y contenedores:** Imágenes firmadas y endurecidas.
5. **Aplicación:** Validación de cada solicitud y el antifraude en línea.

Al centro, en rojo, están los datos: cifrados, tokenizados y con las llaves guardadas en un HSM.

A la derecha van los controles transversales, los que atraviesan todos los anillos: la identidad (passkeys para clientes, llave física para empleados y accesos privilegiados temporales), el monitoreo 24/7 y los controles procedimentales, como la segregación de funciones y la doble aprobación.

Por último están los tiempos de recuperación, con dos conceptos. El **RTO** es cuánto tiempo puede estar caído el servicio. El **RPO** es cuánta información del pasado se puede perder. Como explicó el docente, tiempos más cortos exigen más inversión, por eso no todo tiene el mismo nivel:
- **Núcleo de pagos:** No se puede perder ni una transacción confirmada (RPO 0), una caída de zona se recupera en menos de un minuto y la de una región completa en máximo dos horas, que es lo que piden los principios internacionales para infraestructuras de pago (PFMI).
- **Gestión de llaves y QR:** Se acepta una hora de caída.
- **Backoffice:** Se acepta un día.

**Para profundizar (preguntas):** `apps/project/matriz/4-physical.md`

**Qué señalar**
- La flecha roja de «ataque» y los anillos de afuera hacia adentro.
- Los datos en rojo al centro.
- La columna de transversales.
- La caja RTO/RPO, empezando por el «RPO 0» en rojo.

---

## [8] Component (productos y tecnologías) — Over · 0:45

**Qué se dice**
Finalmente, la capa de componentes es la vista del técnico, a cargo del líder de SecOps. Aquí sí aparecen productos con nombre propio. El docente la considera la más técnica, por eso se presenta rápido.

Los productos se organizaron como una pila que va desde internet hacia adentro:
- **Perímetro:** Cloudflare.
- **Identidad:** Para clientes y empleados, con un gestor de accesos privilegiados.
- **Plataforma:** Kubernetes sobre tres zonas.
- **Criptografía:** CloudHSM (en rojo, porque es la raíz de confianza) y Vault.
- **Detección:** El motor antifraude, el SIEM y el DLP.
- **Pipeline:** Desarrollo seguro con análisis automáticos.

A la derecha está la agenda, que define cada cuánto se prueba que todo esto funciona: pentest semestral (lo exige la SFC), escaneos semanales, simulacros de recuperación y rotación de secretos.

**Para profundizar (preguntas):** `apps/project/matriz/5-component.md`

**Qué señalar**
- Recorrer las bandas de arriba hacia abajo.
- El CloudHSM en rojo.
- La caja de agenda.

---

## [9] Conclusiones — Over · 1:15

**Qué se dice**
Como conclusión, más que la matriz en sí, lo que se entendió sobre arquitectar se puede resumir en cuatro ideas:

- **El negocio manda:** El proyecto existe porque mueve un objetivo estratégico. La arquitectura alinea ese objetivo con la tecnología y justifica cada peso invertido.
- **De lo general a lo particular:** Se bajó desde lo que pide el dueño del negocio hasta los productos, leyendo la matriz de arriba hacia abajo y de izquierda a derecha, de forma que cada producto se puede rastrear hasta un requisito. Por ejemplo, el HSM existe porque protege los datos, que existen porque el objetivo es la confianza del cliente.
- **La seguridad es transversal:** No es un área de Tecnología sino un componente que toca a todas, y por eso el CISO reporta a Presidencia.
- **Lo que sigue:** La sexta capa de SABSA, la de operación, toma esta arquitectura y la opera y la mide en el día a día.

**Para profundizar (preguntas):** `apps/project/matriz/6-operacional.md`

**Qué señalar**
- La franja negra final: «Arquitectar = llevar el objetivo de negocio hasta los controles».

---

## [10] Cierre — Over (con todos) · 0:10

**Qué se dice**
Muchas gracias, quedamos atentos a sus preguntas.

---

## Preguntas probables del docente

**Sobre el caso**
- **¿Por qué Bre-B y no otro proyecto?:** Es un caso real y actual (Bre-B entró en operación en octubre de 2025) que toca negocio, regulación y tecnología al mismo tiempo, y en pagos inmediatos el dinero no se puede reversar, así que la seguridad pesa desde el diseño.
- **¿Por qué una empresa ficticia?:** El docente permitió trabajar con una empresa real o con una supuesta. Se eligió una ficticia con datos verosímiles y con la regulación colombiana real, y la estructura queda lista para reemplazar los datos por los de una empresa real.
- **¿Cómo se justifica la inversión?:** Con el objetivo estratégico. El proyecto permite duplicar los clientes activos, y la seguridad permite hacerlo «sin aumentar el fraude». Además, la regulación (Banco de la República y SFC) lo exige.

**Sobre la matriz**
- **¿Cuál es la diferencia entre la capa conceptual y la lógica?:** La conceptual define qué estrategias, políticas y normas aplican, sin productos (vista del arquitecto con los directores). La lógica traduce eso en servicios de seguridad concretos que el proyecto consume (vista del CISO).
- **¿Cuál es la diferencia entre servicio y control?:** El servicio es lo general, lo que se consume; el control es el detalle técnico. Por ejemplo, el servicio de protección perimetral se compone de los controles firewall, IDS e IPS. Los servicios van en la capa lógica y los controles en la física.
- **¿Y la diferencia entre la lógica y la física?:** La lógica dice qué servicio se necesita (p. ej. autenticación fuerte). La física dice con qué control se logra (p. ej. passkeys FIDO2 con el dispositivo vinculado).
- **¿Por qué en Contextual los tiempos no son las fases del proyecto?:** Porque esa capa es la vista del dueño del negocio, y el dueño no dice cuándo implementar sino para cuándo necesita cada objetivo. Las fechas de implementación de cada servicio están en la capa lógica.
- **¿Dónde está la capa de operación?:** SABSA tiene seis capas, pero el entregable pide cinco. La de operación es la que sigue: monitoreo, gestión de incidentes, indicadores de riesgo y la agenda de pruebas que se mostró en Component.

**Sobre seguridad**
- **¿Qué es defensa en profundidad?:** Poner varios anillos de controles alrededor de lo que se protege, de forma que si un atacante supera uno, el siguiente lo contiene. En el proyecto son proveedor, perímetro, red, servidores, aplicación y, al centro, los datos.
- **¿Qué son el RTO y el RPO, y por qué esos valores?:** El RTO es el tiempo máximo que el servicio puede estar caído y el RPO cuánta información del pasado se puede perder. Para los pagos, el RPO es cero porque perder una transacción confirmada es perder plata de un cliente. Eso exige replicación en tiempo real, que es costosa, y por eso los servicios menos críticos tienen tiempos más largos.
- **¿Qué framework de gestión de riesgos usaron?:** ISO 31000 como proceso general (contexto, identificación, análisis, evaluación y tratamiento) e ISO/IEC 27005 para los riesgos de seguridad de la información, alineados con el SIAR que exige la SFC. NIST CSF 2.0 se usa como ciclo para organizar los controles.
- **¿Por qué el CISO no depende de Tecnología?:** La seguridad debe ser transversal. Si el CISO depende de quien tiene que controlar, se crea un conflicto de intereses y Tecnología termina limitando a la seguridad.
- **¿Qué pasa con la IA?:** Hay dos frentes. El modelo antifraude usa machine learning y se gobierna bajo ISO/IEC 42001 (dueño, validación y monitoreo). Contra el shadow AI se permite una sola IA corporativa y se aplica DLP en los equipos, para que la información no termine en herramientas no autorizadas.

**Sobre el trabajo**
- **¿Qué fue lo más difícil?:** Mantener cada capa en su nivel, sobre todo no meter tecnología en la contextual ni productos en la conceptual, y respetar el encabezado de cada celda. Como técnicos, lo natural es saltar a los controles, y el ejercicio obliga a pensar primero como el dueño del negocio.

> **Nota de honestidad:** Las metas (99,95 %, 5 pb de fraude, los niveles de RTO/RPO y las fechas de 2027) son supuestos del caso ficticio. La normativa citada sí es real: BanRep CRE DSP-465 en su versión del 31-mar-2026, SFC CE 007/2018 integrada en la CBJ con la CE 006/2025, y Ley 1581/2012.
