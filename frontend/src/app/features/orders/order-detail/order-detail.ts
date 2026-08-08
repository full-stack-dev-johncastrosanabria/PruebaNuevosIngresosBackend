import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { OrderService } from '../../../core/order.service';
import { environment } from '../../../../environments/environment';
import type { ApiError, Order } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail {
  /** Enlazado desde el parametro de ruta por withComponentInputBinding. */
  readonly id = input.required<string>();

  readonly #orders = inject(OrderService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly pedido = signal<Order | null>(null);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly sondeoAgotado = signal(false);

  protected readonly enEspera = computed(() => this.pedido()?.status === 'PENDIENTE');

  #temporizador: ReturnType<typeof setInterval> | null = null;
  #inicioDelSondeo = 0;

  constructor() {
    effect(() => {
      const identificador = this.id();
      this.#detenerSondeo();
      this.sondeoAgotado.set(false);
      this.#inicioDelSondeo = Date.now();
      this.#consultar(identificador);
    });

    // El temporizador vive fuera del ciclo de Angular: hay que apagarlo al destruir.
    this.#destroyRef.onDestroy(() => this.#detenerSondeo());
  }

  #consultar(identificador: string): void {
    this.#orders
      .byId(identificador)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.pedido.set(respuesta);
          this.error.set(null);
          if (respuesta.status === 'PENDIENTE') {
            this.#programarSiguienteConsulta(identificador);
          } else {
            this.#detenerSondeo();
          }
        },
        error: (causa: ApiError) => {
          this.error.set(causa);
          this.#detenerSondeo();
        },
      });
  }

  #programarSiguienteConsulta(identificador: string): void {
    if (this.#temporizador !== null) return;

    this.#temporizador = setInterval(() => {
      // Corte defensivo: si el flujo se atasca, no dejar el navegador consultando para siempre.
      if (Date.now() - this.#inicioDelSondeo > environment.pollingTimeoutMs) {
        this.sondeoAgotado.set(true);
        this.#detenerSondeo();
        return;
      }
      this.#consultar(identificador);
    }, environment.pollingIntervalMs);
  }

  #detenerSondeo(): void {
    if (this.#temporizador !== null) {
      clearInterval(this.#temporizador);
      this.#temporizador = null;
    }
  }

  protected reintentar(): void {
    this.sondeoAgotado.set(false);
    this.#inicioDelSondeo = Date.now();
    this.#consultar(this.id());
  }
}
