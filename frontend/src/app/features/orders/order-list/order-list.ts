import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { OrderService } from '../../../core/order.service';
import type { ApiError, Order, OrderStatus } from '../../../core/models/order.model';

const ESTADOS: readonly OrderStatus[] = ['PENDIENTE', 'PAGADO', 'FALLO_PAGO'];

@Component({
  selector: 'app-order-list',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './order-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderList {
  readonly #orders = inject(OrderService);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly estados = ESTADOS;
  protected readonly filtro = signal<OrderStatus | null>(null);
  protected readonly pagina = signal(0);

  protected readonly pedidos = signal<readonly Order[]>([]);
  protected readonly totalPaginas = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  constructor() {
    // Recarga cuando cambia el filtro o la pagina. Las señales leidas aqui son las
    // dependencias del efecto.
    effect(() => {
      const status = this.filtro();
      const page = this.pagina();
      this.#cargar(status, page);
    });
  }

  protected cambiarFiltro(valor: string): void {
    this.filtro.set(valor === '' ? null : (valor as OrderStatus));
    this.pagina.set(0);
  }

  protected irA(pagina: number): void {
    this.pagina.set(Math.max(0, pagina));
  }

  #cargar(status: OrderStatus | null, page: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.#orders
      .list({ status, page, size: 20 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.pedidos.set(respuesta.content);
          this.totalPaginas.set(respuesta.totalPages);
          this.cargando.set(false);
        },
        error: (causa: ApiError) => {
          this.error.set(causa);
          this.cargando.set(false);
        },
      });
  }
}
