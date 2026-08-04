#!/usr/bin/env bash
# Genera el par de llaves RSA que OrderMS usa para descifrar los datos de tarjeta.
# Las llaves quedan en keys/ y estan excluidas del control de versiones.
set -euo pipefail

DIRECTORIO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/keys"
PRIVADA="${DIRECTORIO}/private_key.pem"
PUBLICA="${DIRECTORIO}/public_key.pem"

mkdir -p "${DIRECTORIO}"

if [[ -f "${PRIVADA}" && "${1:-}" != "--force" ]]; then
  echo "Ya existe un par de llaves en ${DIRECTORIO}."
  echo "Use --force para reemplazarlo. Cuidado: los pedidos existentes dejarian de ser descifrables."
  exit 0
fi

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "${PRIVADA}" 2>/dev/null
openssl rsa -in "${PRIVADA}" -pubout -out "${PUBLICA}" 2>/dev/null

chmod 600 "${PRIVADA}"
chmod 644 "${PUBLICA}"

echo "Llaves generadas:"
echo "  privada: ${PRIVADA}"
echo "  publica: ${PUBLICA}"
