# Particularidades de redacción

Notas de cómo escribimos los talleres, sacadas de las correcciones al Laboratorio 6 (`latex/workshops/ws-06`, noviembre de 2026). La regla general es que **prima la lectura sobre la correctitud**: si la norma pide una coma pero la coma corta la idea, la coma se va.

Cada caso trae el antes, el después y qué cambió. Los marcados como *interpretación* no los dijiste tal cual, los deduje de tus ejemplos, así que corrígelos si no aplican.

## 1. Comas

La coma marca que **se terminó de explicar una idea**. Dentro de una idea que sigue no va coma, lo que une es el conector.

| Caso | Antes | Después | Qué cambió |
|---|---|---|---|
| Frase corta con "pero" | La nube divide el trabajo, pero no la responsabilidad | La nube divide el trabajo pero no la responsabilidad | Es una sola idea corta, la coma la partía en dos |
| Antes de "y" | ...las llaves y el código, y por ende los controles... | ...las llaves y el código y por ende los controles... | La "y" ya funciona como coma implícita |
| Antes de una consecuencia | ...ya existían, así que solo agregamos... | ...ya existían así que solo agregamos... | Causa y consecuencia son la misma idea |
| Antes de una causa | ...no hay mucho que discutir, porque en la pestaña... | ...no hay mucho que discutir porque en la pestaña... | Igual que el anterior (porque, ya que, puesto que) |
| Aclaración pegada con participio | Lo ubicamos en el servicio de desarrollo seguro, apoyado en el de gestión de vulnerabilidades | Lo ubicamos en el servicio de desarrollo seguro que se apoya en el de gestión de vulnerabilidades | Se quitó la coma y se cambió el participio por "que + verbo conjugado" (ver sección 2) |
| Listas | La estrategia, el servicio y el diccionario de datos | (igual) | La coma para enumerar sí se queda, sin coma antes de la "y" final |
| Entre dos ideas completas | ...para el modelo IaaS, y además tiene todo el sentido... | ...para el modelo IaaS, además tiene todo el sentido... | Aquí la coma sí va porque cierra una idea y abre otra |

Sobre la coma después de un conector al inicio de la oración (*interpretación*):

- **Conectores cortos, sin coma:** Por ende, además, por eso, aun así, sin embargo, finalmente, en cambio. Ejemplo: "Por ende el proveedor solo responde por...".
- **Fórmulas de arranque, con coma:** Ahora bien, dicho esto, en ese orden de ideas, eso sí, en conclusión. Ejemplo: "Ahora bien, para hacer esa revisión...".

Los incisos cortos van mejor entre paréntesis que entre comas: "cada dueño de proceso (en su rol de administrador de la información) quien clasifica...".

## 2. Verbo conjugado en vez de infinitivo o participio

| Antes | Después |
|---|---|
| nadie es de confianza solo **por estar** adentro | nadie es de confianza solo **porque está** adentro |
| **al ser** un módulo validado bajo FIPS 140 | **como es** un módulo validado bajo FIPS 140 |
| el servicio de desarrollo seguro, **apoyado** en el de gestión... | el servicio de desarrollo seguro **que se apoya** en el de gestión... |
| por exigencia de la SFC | porque se lo exige la SFC |

Qué cambió sintácticamente: "por + infinitivo" es una oración causal **no finita**, el verbo no tiene persona ni tiempo y el sujeto queda implícito. "porque + verbo conjugado" es una oración causal **finita**, con la conjunción "porque" y un verbo en indicativo que concuerda con su sujeto. El sentido es el mismo pero la forma finita es la que se usa al hablar, la otra suena a texto escrito o traducido. Lo mismo pasa con "al + infinitivo", con los participios sueltos y con los sustantivos que esconden un verbo (exigencia → exige).

## 3. Condicional para lo que se propone

| Antes | Después |
|---|---|
| Para los clientes **se usan** passkeys | Para los clientes **se usarían** passkeys |
| NovaPay **debe** adoptar la estrategia | NovaPay **tendría que** adoptar la estrategia |
| esto **se traduce** en cifrado envolvente | esto **se traduciría** en cifrado envolvente |

El presente afirma que algo ya existe. Como la arquitectura es una propuesta y todavía no está implementada va en condicional. Lo que sí hicimos nosotros va en pasado (escogimos, ubicamos, nos quedamos con) y lo que ya es un hecho va en presente (el proveedor registra lo que pasa en su plataforma).

## 4. Mayúscula después de dos puntos

Siempre, también en mitad de un párrafo y dentro de las celdas de una tabla.

- "...la misma lectura que usamos en el proyecto: **L**a capa conceptual define..."
- "Objetivo de control: **L**a información sensible se protege..."

## 5. Voz y conectores

- **Primera persona del plural, pero solo para nosotros:** Hicimos, pensamos, nos quedamos con, nos dimos cuenta de que. El nosotros es el equipo que escribe y no la empresa del caso. En la matriz somos el equipo de seguridad, así que la compañía va en tercera persona: "si los conectamos pueden captar a quienes hoy usan efectivo" y no "si nos conectamos podemos captar".
- **Sin abusar:** Si toda una lista arranca con "Queremos…" o "Vamos a…" es mejor decirlo derecho con sustantivo o infinitivo (captar, operar, cumplir), que es como lo escriben Michael y Sergio.
- **Muchos conectores lógicos:** Ahora bien, por ende, en ese orden de ideas, dicho esto, eso sí, así que, porque, además, en cambio.
- **Juicios binarios dichos de frente:** "sí le toca al cliente", "consideramos que era mejor reutilizar que inventar", "no es opcional".

## 6. Palabras

| No | Sí |
|---|---|
| apaisada | rotada |
| guardia 24/7 | equipo de turno 24/7 |
| reparto | distribución |
| lista de verificación | lista de chequeo |
| le corresponde | le toca |
| «comillas angulares» | "comillas normales" (en LaTeX: ` ``así'' `) |

## 7. Listas agrupadas

Si varios puntos de una lista arrancan con la misma palabra, esa palabra se pone una sola vez como rótulo y debajo va el listado.

| Antes | Después |
|---|---|
| - Oportunidad, crecimiento: ...<br>- Oportunidad, comercios: ...<br>- Amenaza, fraude: ...<br>- Amenaza, caídas: ... | Oportunidades:<br>- Crecimiento: ...<br>- Comercios: ...<br><br>Amenazas:<br>- Fraude: ...<br>- Caídas: ... |
| - Política de autenticación: ...<br>- Política de límites: ... | Políticas:<br>- Autenticación: ...<br>- Límites: ... |

## 8. Números

Los decimales van con punto y no con coma: 99.5 %, 95.8 %, 10.4 millones.

## 9. Tablas

- Celdas cortas tipo mapa mental, sin narrar.
- Sin aclaraciones que se sobreentienden: las filas dicen `CONCEPTUAL ARCHITECTURE` y no `CONCEPTUAL ARCHITECTURE (Security management, Major security strategy)`.

## 10. Muletillas que delatan texto generado

Sale de la recomendación que le hicieron a otro grupo ("hay muchos textos generados por la IA, recomiendo validarlos y ajustarlos"). Estas palabras no son incorrectas, el problema es que juntas hacen sonar el texto a plantilla. Se reemplazan por lo que diríamos al hablar o se quitan.

| Muletilla | Antes | Después |
|---|---|---|
| Representa una oportunidad | La implementación de Bre-B representa para NovaPay una oportunidad estratégica | Bre-B es una oportunidad que ya está probada |
| Asimismo / De forma complementaria | Asimismo, será fundamental establecer procedimientos de seguimiento | Además hacen falta procedimientos de seguimiento |
| Fundamental / clave | La protección de estos activos es fundamental para preservar la reputación | Si falla uno de los tres la reputación se cae con él |
| Por ello / En este sentido | Por ello, NovaPay considera fundamental gestionar estas amenazas | Cualquiera de ellas se traduciría en pérdidas y en daño a la marca |
| Garantizar | garantizar la continuidad del negocio | que el servicio siga funcionando |
| Sin embargo, … también supone nuevos desafíos | Sin embargo, este crecimiento también supone nuevos desafíos | Ese mismo crecimiento trae amenazas |
| Incrementa la importancia de | La inmediatez incrementa la importancia de prevenir el fraude | Como el pago es inmediato la plata no se puede reversar |
| Ágil, confiable y transparente (tríos de adjetivos) | de manera ágil, confiable y transparente | Se dice el dato: en menos de 20 segundos |
| No solo… sino también | no solo depende de la gestión interna sino también de la coordinación | depende tanto de lo que se haga adentro como de la coordinación |

Además de cambiar las palabras hay dos chequeos de fondo:

- **Cada idea con un dato o un hecho:** Si una frase sirve igual para cualquier empresa ("busca consolidar una propuesta de valor basada en la agilidad") le falta el dato que la vuelve nuestra.
- **Cada cifra con su fuente:** Las cifras se revisan contra la fuente oficial y la fuente queda en el detalle de la celda o en el guion. Si no se encuentra fuente se dice que es un supuesto del caso.
