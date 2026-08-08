import type { HttpInterceptorFn } from '@angular/common/http';

const CABECERA = 'X-Correlation-Id';

// Propaga el identificador de correlacion que el backend incluye en los logs de ambos servicios
export const correlationIdInterceptor: HttpInterceptorFn = (peticion, siguiente) =>
  siguiente(peticion.clone({ setHeaders: { [CABECERA]: crypto.randomUUID() } }));
