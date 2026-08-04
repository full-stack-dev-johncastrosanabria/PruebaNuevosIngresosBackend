#!/usr/bin/env bash
# Cifra unos datos de tarjeta con la llave publica que expone OrderMS y emite el
# base64 listo para el campo encryptedCard del POST /api/v1/orders.
#
#   ./scripts/encrypt-card.sh 4242424242424242 123 12 2030 "ANA TORRES"
set -euo pipefail

PAN="${1:-4242424242424242}"
CVV="${2:-123}"
MES="${3:-12}"
ANIO="${4:-2030}"
TITULAR="${5:-ANA TORRES}"
URL_BASE="${ORDER_MS_URL:-http://localhost:8080}"

TEMPORAL="$(mktemp -d)"
trap 'rm -rf "${TEMPORAL}"' EXIT

# Se toma la llave del propio servicio para garantizar que corresponde a la privada en uso,
# incluso cuando OrderMS arranco con un par efimero.
LLAVE_BASE64="$(curl -fsS "${URL_BASE}/api/v1/crypto/public-key" \
  | sed -n 's/.*"publicKey":"\([^"]*\)".*/\1/p')"

if [[ -z "${LLAVE_BASE64}" ]]; then
  echo "No fue posible obtener la llave publica desde ${URL_BASE}" >&2
  exit 1
fi

{
  echo "-----BEGIN PUBLIC KEY-----"
  echo "${LLAVE_BASE64}" | fold -w 64
  echo "-----END PUBLIC KEY-----"
} > "${TEMPORAL}/public_key.pem"

# rsa_mgf1_md:sha256 es obligatorio: sin el, openssl usa SHA-1 en MGF1 y el criptograma no sera descifrable por Java
printf '{"pan":"%s","cvv":"%s","expiryMonth":%s,"expiryYear":%s,"holder":"%s"}' \
  "${PAN}" "${CVV}" "${MES}" "${ANIO}" "${TITULAR}" \
  | openssl pkeyutl -encrypt -pubin -inkey "${TEMPORAL}/public_key.pem" \
      -pkeyopt rsa_padding_mode:oaep \
      -pkeyopt rsa_oaep_md:sha256 \
      -pkeyopt rsa_mgf1_md:sha256 \
  | base64 | tr -d '\n'
echo
