import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Misma verificacion que aplica el backend, para dar respuesta inmediata al usuario. */
export function luhnValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '').replace(/\s/g, '');
    if (!valor) return null;
    if (!/^\d{13,19}$/.test(valor)) return { luhn: true };

    let suma = 0;
    let duplicar = false;
    for (let i = valor.length - 1; i >= 0; i--) {
      let digito = valor.codePointAt(i) - 48;
      if (duplicar) {
        digito *= 2;
        if (digito > 9) digito -= 9;
      }
      suma += digito;
      duplicar = !duplicar;
    }
    return suma % 10 === 0 ? null : { luhn: true };
  };
}

/** Verifica que el mes y el anio del grupo no correspondan a una tarjeta vencida. */
export function expiryValidator(): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const mes = Number(grupo.get('expiryMonth')?.value);
    const anio = Number(grupo.get('expiryYear')?.value);
    if (!mes || !anio) return null;

    const ahora = new Date();
    const ultimoDiaDelMes = new Date(anio, mes, 0, 23, 59, 59);
    return ultimoDiaDelMes < ahora ? { expired: true } : null;
  };
}
