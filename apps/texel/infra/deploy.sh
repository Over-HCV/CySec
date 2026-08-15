#!/usr/bin/env bash
# Despliegue del servicio de compilación en Cloud Run.
#
#   ./infra/deploy.sh
#
# Requiere: gcloud autenticado, APIs run/artifactregistry/secretmanager activas,
# y los secretos ya creados (ver "Secretos" abajo).
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project)}"
REGION="${REGION:-us-central1}"          # tier gratis de Cloud Run
SERVICE="${SERVICE:-texel-compiler}"
REPO="${REPO:-texel}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/compiler"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▸ Proyecto: ${PROJECT_ID} · región: ${REGION}"

# 1. Repositorio de imágenes (idempotente)
gcloud artifacts repositories describe "${REPO}" --location="${REGION}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${REPO}" \
    --repository-format=docker --location="${REGION}" \
    --description="Imágenes de Texel"

# 2. Build. Cloud Build evita subir 2 GB de imagen desde casa.
gcloud builds submit "${ROOT}/compiler" --tag "${IMAGE}:latest"

# 3. Despliegue
#    --min-instances=0 mantiene el coste en cero cuando nadie compila; el precio
#    es un arranque en frío de ~10 s en la primera compilación tras un rato.
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}:latest" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --cpu 1 --memory 2Gi \
  --concurrency 4 \
  --timeout 120 \
  --min-instances 0 --max-instances 3 \
  --set-env-vars "ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-*},COMPILE_TIMEOUT=60" \
  --set-secrets "SUPABASE_URL=texel-supabase-url:latest,SUPABASE_ANON_KEY=texel-supabase-anon:latest,SUPABASE_SERVICE_ROLE_KEY=texel-supabase-service:latest"

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo "▸ Listo: ${URL}"
echo "  Pon NUXT_PUBLIC_COMPILER_URL=${URL} en el .env del frontend."

# ── Secretos (una sola vez) ──────────────────────────────────────────────────
#   printf '%s' 'https://<ref>.supabase.co' | gcloud secrets create texel-supabase-url     --data-file=-
#   printf '%s' '<anon key>'                | gcloud secrets create texel-supabase-anon    --data-file=-
#   printf '%s' '<service role key>'        | gcloud secrets create texel-supabase-service --data-file=-
#
# Y dar acceso a la cuenta de servicio de Cloud Run:
#   gcloud secrets add-iam-policy-binding texel-supabase-service \
#     --member="serviceAccount:$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
#     --role=roles/secretmanager.secretAccessor
#
# `--allow-unauthenticated` es a nivel de Cloud Run: el servicio valida el JWT de
# Supabase en cada petición y comprueba la pertenencia al proyecto. Sin token no
# se compila nada.
