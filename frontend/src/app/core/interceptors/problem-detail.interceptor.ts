import type { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import type { ApiError } from '../models/order.model';

// Traduce ProblemDetail (RFC 7807) a ApiError para que los componentes no manejen HTTP crudo
export const problemDetailInterceptor: HttpInterceptorFn = (peticion, siguiente) =>
  siguiente(peticion).pipe(
    catchError((error: unknown) => throwError(() => normalizar(error))),
  );

function normalizar(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      title: 'Error inesperado',
      detail: 'Ocurrio un error desconocido',
      status: 0,
      fieldErrors: {},
    };
  }

  if (error.status === 0) {
    return {
      title: 'Sin conexion',
      detail: 'No fue posible contactar el servidor. Verifique que el sistema este levantado.',
      status: 0,
      fieldErrors: {},
    };
  }

  const cuerpo = (error.error ?? {}) as Record<string, unknown>;
  return {
    title: typeof cuerpo['title'] === 'string' ? cuerpo['title'] : 'Error en la solicitud',
    detail:
      typeof cuerpo['detail'] === 'string'
        ? cuerpo['detail']
        : `El servidor respondio con codigo ${error.status}`,
    status: error.status,
    fieldErrors: (cuerpo['errors'] ?? {}) as Record<string, string>,
  };
}
