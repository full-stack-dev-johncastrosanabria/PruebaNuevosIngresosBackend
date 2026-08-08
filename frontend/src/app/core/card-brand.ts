/** Marcas que el backend sabe reconocer. Mantener alineado con CardBrandResolver. */
export type CardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DESCONOCIDA';

/**
 * Misma deduccion que aplica el backend, replicada aqui para poder confirmar la marca
 * mientras se escribe. El valor mostrado es indicativo: el que se persiste lo resuelve
 * el servidor a partir del numero descifrado.
 */
export function resolverMarca(pan: string): CardBrand {
  const digitos = pan.replace(/\D/g, '');
  if (digitos.length < 2) return 'DESCONOCIDA';

  if (digitos.startsWith('4')) return 'VISA';
  if (digitos.startsWith('34') || digitos.startsWith('37')) return 'AMEX';
  if (esMastercard(digitos)) return 'MASTERCARD';

  return 'DESCONOCIDA';
}

function esMastercard(digitos: string): boolean {
  const dosPrimeros = Number(digitos.slice(0, 2));
  if (dosPrimeros >= 51 && dosPrimeros <= 55) return true;
  if (digitos.length < 4) return false;

  const cuatroPrimeros = Number(digitos.slice(0, 4));
  return cuatroPrimeros >= 2221 && cuatroPrimeros <= 2720;
}

/** Agrupa el numero para que sea legible al teclearlo. Amex usa el patron 4-6-5. */
export function agruparPan(pan: string): string {
  const digitos = pan.replace(/\D/g, '').slice(0, 19);
  const grupos = resolverMarca(digitos) === 'AMEX' ? [4, 6, 5] : [4, 4, 4, 4, 3];

  const partes: string[] = [];
  let indice = 0;
  for (const tamano of grupos) {
    if (indice >= digitos.length) break;
    partes.push(digitos.slice(indice, indice + tamano));
    indice += tamano;
  }
  return partes.join(' ');
}
