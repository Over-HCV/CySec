# Conectar Texel con GitHub

Esto se hace **una vez**, y lo hace quien despliega Texel. Quien luego use la
aplicación no toca nada de aquí: abre su proyecto, pulsa **GitHub → Conectar con
GitHub** y elige repositorio.

## 1. Crear la GitHub App

En GitHub: *Settings → Developer settings → GitHub Apps → New GitHub App*.

| campo | valor |
|---|---|
| **GitHub App name** | `Texel` (o lo que quede libre; el nombre corto de la URL es el `slug`) |
| **Homepage URL** | `https://<tu-dominio>` |
| **Callback URL** | `https://<tu-dominio>/api/github/oauth/callback` |
| **Setup URL** | `https://<tu-dominio>/api/github/callback`, con *Redirect on update* marcado |
| **Webhook** | desmarcar *Active* |
| **Repository permissions** | *Contents*: **Read and write** · *Metadata*: **Read-only** |
| **Where can this GitHub App be installed?** | *Any account* |

Los dos primeros URL no son intercambiables, y confundirlos es el fallo típico:

- El **Callback URL** es la vuelta de «iniciar sesión con GitHub», que es como
  Texel sabe **de quién** es cada instalación.
- El **Setup URL** es la vuelta de **instalar** la App, y es el único que recibe
  `installation_id`. Si se deja vacío, quien instale la App se quedará en GitHub
  y Texel nunca se enterará: la App parecerá rota estando bien.

Al guardar, en la misma página:

- *Generate a private key* → descarga un `.pem`.
- *Client secrets → Generate a new client secret* → cópialo, no se vuelve a ver.
- Apunta el **App ID** (arriba) y el **slug** (el de `github.com/apps/<slug>`).

## 2. Poner los valores en el servidor

Son variables de entorno del servidor, no de cada usuario.

**En local** — `web/.env` (ya está en `.gitignore`):

```sh
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=texel
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxx
# La clave entera en una línea, con los saltos escapados como \n
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE…\n-----END RSA PRIVATE KEY-----\n"
```

Convertir el `.pem` a esa línea:

```sh
awk 'BEGIN{ORS="\\n"} {print}' clave.pem
```

**En producción** (Vercel):

```sh
vercel env add GITHUB_APP_ID production
vercel env add GITHUB_APP_SLUG production
vercel env add GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production
vercel env add GITHUB_APP_PRIVATE_KEY production < clave.pem   # aquí sí, con saltos de verdad
```

Hace falta además `SUPABASE_SERVICE_KEY`, que ya usaba el resto del servidor.
Después, un redespliegue: las variables se leen al arrancar.

## 3. Aplicar las migraciones

```sh
supabase db push          # 005_github_sync.sql y 006_github_identity.sql
```

## 4. Comprobar

Abre un proyecto → **GitHub**. Deberías ver **Conectar con GitHub**; si sigue
diciendo que falta configurarla, es que el servidor no ve las variables.

## Qué se guarda y qué no

Texel **no guarda tu token de GitHub**. El de «iniciar sesión con GitHub» se usa
dentro de la ruta de vuelta para dos preguntas —quién eres y a qué instalaciones
llegas— y se tira; lo que queda apuntado es esa correspondencia. Todo lo demás
—leer el árbol, bajar un archivo, hacer el commit— lo firma la App con su clave
privada, con un token que caduca en una hora y que se acuña en cada petición.

Por eso aquí no hace falta Supabase Vault. Cuando llegue la sincronización
automática (webhooks, o un cron que actúe por alguien que no está delante) hará
falta guardar un *refresh token* por persona, y **ese** sí debe ir a
`vault.secrets`, leído por `vault.decrypted_secrets` con la clave de servicio:
son muchos secretos, uno por usuario, viviendo en la base. Las credenciales de
la App no: son una por despliegue y su sitio es el entorno.

## Si algo falla

| síntoma | causa habitual |
|---|---|
| «Quien administra este Texel todavía no ha conectado GitHub» | faltan `GITHUB_APP_ID`, `GITHUB_APP_SLUG` o `GITHUB_APP_PRIVATE_KEY` |
| Sale *Instalar* pero no *Conectar con GitHub* | faltan `GITHUB_CLIENT_ID` o `GITHUB_CLIENT_SECRET` |
| Instalas la App y Texel no se entera | el **Setup URL** está vacío o apunta a otro sitio |
| «la vuelta de GitHub no cuadra con la ida» | tardaste más de diez minutos, o volviste en otro navegador |
| La lista de repositorios sale vacía | la App está instalada, pero sin acceso a ese repositorio (*Configure → Repository access*) |
