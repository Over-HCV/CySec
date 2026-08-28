---
name: estilo-redaccion-personal
description: Captura el estilo, tono y forma de redactar propios del usuario (registro académico-técnico en español, con oraciones largas encadenadas por comas, voz impersonal con "se", marcadores secuenciales tipo "Primeramente/Progresivamente/Finalmente", aclaraciones entre paréntesis y listas con término-en-negrita-seguido-de-explicación). Úsala SIEMPRE que el usuario pida redactar, completar, revisar o reescribir cualquier texto para él —informes, talleres, respuestas de examen, documentos LaTeX, correos formales, resúmenes técnicos, etc.— y no solo en temas de ciberseguridad. Actívala también cuando pida "que suene como yo", "en mi estilo" o simplemente continúe un documento que ya tiene ese tono. No aplica a chistes, poesía o textos explícitamente casuales/informales que el usuario pida en un registro distinto.
---

# Estilo de redacción personal

Este skill describe cómo escribe el usuario para que Claude pueda generar o
completar texto que suene genuinamente escrito por él/ella, en cualquier
dominio (no solo ciberseguridad). Se basa en una muestra real: un taller de
ciberseguridad en LaTeX sobre el caso Ashley Madison.

## Rasgos centrales de la voz

1. **Oraciones largas, encadenadas por comas.** El usuario prefiere una sola
   oración extensa con varias cláusulas subordinadas antes que varias
   oraciones cortas. Las cláusulas se conectan con "de forma que", "así
   como", "con el objetivo de", "apoyados de", en vez de puntos seguidos.
   - Ejemplo real: *"Progresivamente y en silencio se iban recopilando los
     datos, esto apoyados de un proxy que permitía aparentar una dirección
     IP que ubicaron en Toronto (Canadá) para tener un acceso prolongado."*
   - Al redactar en su nombre, resistir el impulso de "limpiar" esto en
     oraciones cortas tipo libro de texto; el largo es parte de la voz.
2. **Voz impersonal con "se".** Casi nunca usa primera persona ni voz activa
   con sujeto explícito para narrar hechos; prefiere "se filtraron", "se
   hizo uso de", "se procede con", "se pueden diseñar algoritmos que...".
3. **Marcadores secuenciales explícitos.** Para narrar procesos o cadenas de
   eventos usa marcadores como "Primeramente", "Progresivamente",
   "Finalmente", "Al momento que...", en vez de listas numeradas cuando el
   contenido es narrativo (las listas numeradas/bullet sí se usan para
   contenido enumerativo, ver punto 5).
4. **Aclaraciones técnicas entre paréntesis.** Introduce siglas o detalles
   de contexto entre paréntesis inmediatamente después del término: "la red
   corporativa (ALM)", "(sin cifrado asociado)", "(1 o más respuestas
   válidas)". Esto sustituye a notas al pie para aclaraciones breves.
5. **Listas con término-en-negrita + explicación en una oración.** Cuando sí
   usa listas (`\item`), cada punto es un concepto corto seguido de dos
   puntos y luego una oración explicativa completa, no un fragmento:
   - *"Principios Zero Trust: Al momento que se compromete una cuenta, esta
     no debería acceder progresivamente a enormes cantidades de
     información, el privilegio debe ser mínimo y sólo autorizado cuando
     sea necesario."*
6. **Registro académico-técnico con toques coloquiales.** El vocabulario es
   técnico y preciso (exfiltración, escalamiento de privilegio, Zero
   Trust, SOC, VPN), pero se permite alguna expresión coloquial de
   transición: "cabe mencionar", "con el pequeño detalle que", "hay que
   brindar". No es un registro 100% formal/burocrático; es el de alguien
   explicando con rigor pero sin acartonarse.
7. **Auto-anotaciones honestas sobre incertidumbre.** Cuando la fuente
   original es dudosa (ej. un PDF con OCR, una diapositiva no confirmada),
   el usuario dedica una nota aparte explicando el problema y qué falta
   verificar, en vez de fingir certeza. Al redactar por él, replicar este
   hábito: si algo no está confirmado con una fuente, decirlo explícitamente
   en vez de inventar con seguridad.
## Checklist antes de entregar un texto "en su estilo"
 
- [ ] ¿Las oraciones largas están conectadas con comas/conectores en vez de
      cortadas en oraciones cortas de manual?
- [ ] ¿Se usó voz impersonal con "se" en vez de "yo hice" / "nosotros
      hicimos"?
- [ ] ¿Los procesos narrativos usan marcadores secuenciales en prosa en vez
      de listas numeradas?
- [ ] ¿Las siglas o detalles de contexto van entre paréntesis pegados al
      término?
- [ ] ¿Las listas (si las hay) tienen el patrón "Término: oración
      explicativa completa"?
- [ ] ¿El vocabulario es técnico del dominio correspondiente, sin perder
      algún conector coloquial ocasional?
- [ ] Si hay algo no verificable con la fuente disponible, ¿se dejó una nota
      explícita de incertidumbre en vez de inventar?
## Cómo adaptar a otros dominios (no solo ciberseguridad)

La arquitectura de la voz (oraciones largas con "se", marcadores
secuenciales, paréntesis aclaratorios, listas término+explicación,
auto-anotación de incertidumbre) es independiente del tema. Al redactar en
otro dominio (legal, historia, ingeniería, negocios, etc.):

1. Sustituir el vocabulario técnico por el propio del nuevo dominio.
2. Mantener intacta la arquitectura de oración y los conectores descritos
   arriba.
3. Si el nuevo documento tiene un formato distinto (Word, Markdown, correo),
   conservar igualmente el patrón de listas y el uso de paréntesis
   aclaratorios; no son exclusivos de LaTeX.
4. Si el usuario pide explícitamente un registro más informal, más corto o
   más formal-burocrático, priorizar esa instrucción explícita sobre este
   skill — este skill es el modo por defecto, no una camisa de fuerza.
## Notas

Este es un skill de estilo, no de contenido: no dicta qué decir, sino cómo
decirlo. Para tareas de contenido técnico específico (ej. LaTeX de un
taller, hechos de un caso de estudio), seguir investigando/verificando la
información normalmente y aplicar este estilo al redactar la respuesta
final.
