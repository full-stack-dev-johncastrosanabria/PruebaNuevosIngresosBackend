import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type {
  CreateOrderRequest,
  Order,
  OrderStatus,
  PagedResponse,
} from './models/order.model';

export interface ListOptions {
  readonly status?: OrderStatus | null;
  readonly page?: number;
  readonly size?: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  readonly #http = inject(HttpClient);
  readonly #base = `${environment.apiBaseUrl}/orders`;

  create(peticion: CreateOrderRequest): Observable<Order> {
    return this.#http.post<Order>(this.#base, peticion);
  }

  byId(id: string): Observable<Order> {
    return this.#http.get<Order>(`${this.#base}/${id}`);
  }

  list(opciones: ListOptions = {}): Observable<PagedResponse<Order>> {
    let parametros = new HttpParams()
      .set('page', String(opciones.page ?? 0))
      .set('size', String(opciones.size ?? 20));

    if (opciones.status) {
      parametros = parametros.set('status', opciones.status);
    }
    return this.#http.get<PagedResponse<Order>>(this.#base, { params: parametros });
  }
}
