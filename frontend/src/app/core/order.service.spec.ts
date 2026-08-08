import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { OrderService } from './order.service';
import { problemDetailInterceptor } from './interceptors/problem-detail.interceptor';
import { environment } from '../../environments/environment';
import type { ApiError, Order } from './models/order.model';

const PEDIDO: Order = {
  id: '11111111-1111-1111-1111-111111111111',
  customerName: 'Ana Torres',
  customerEmail: 'ana@ejemplo.com',
  productSku: 'SKU-1',
  productName: 'Teclado',
  quantity: 2,
  unitPrice: 49.95,
  totalAmount: 99.9,
  currency: 'USD',
  status: 'PENDIENTE',
  cardBrand: 'VISA',
  cardLastFour: '4242',
  paymentReference: null,
  failureReason: null,
  createdAt: '2026-08-04T10:00:00Z',
  updatedAt: '2026-08-04T10:00:00Z',
};

describe('OrderService', () => {
  let servicio: OrderService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrderService,
        provideHttpClient(withInterceptors([problemDetailInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    servicio = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia el pedido y devuelve la respuesta creada', async () => {
    const promesa = firstValueFrom(
      servicio.create({
        customerName: 'Ana Torres',
        customerEmail: 'ana@ejemplo.com',
        productSku: 'SKU-1',
        productName: 'Teclado',
        quantity: 2,
        unitPrice: 49.95,
        currency: 'USD',
        encryptedCard: 'Y2lmcmFkbw==',
      }),
    );

    const peticion = http.expectOne(`${environment.apiBaseUrl}/orders`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body.encryptedCard).toBe('Y2lmcmFkbw==');
    peticion.flush(PEDIDO, { status: 201, statusText: 'Created' });

    expect((await promesa).id).toBe(PEDIDO.id);
  });

  it('consulta un pedido por identificador', async () => {
    const promesa = firstValueFrom(servicio.byId(PEDIDO.id));

    http.expectOne(`${environment.apiBaseUrl}/orders/${PEDIDO.id}`).flush(PEDIDO);

    expect((await promesa).status).toBe('PENDIENTE');
  });

  it('incluye el filtro de estado en el listado cuando se indica', async () => {
    const promesa = firstValueFrom(servicio.list({ status: 'PAGADO', page: 1, size: 10 }));

    const peticion = http.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/orders` && r.params.get('status') === 'PAGADO',
    );
    expect(peticion.request.params.get('page')).toBe('1');
    peticion.flush({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, last: true });

    expect((await promesa).totalElements).toBe(0);
  });

  it('normaliza el ProblemDetail del backend en un ApiError', async () => {
    const promesa = firstValueFrom(servicio.byId(PEDIDO.id));

    http.expectOne(`${environment.apiBaseUrl}/orders/${PEDIDO.id}`).flush(
      { title: 'Pedido no encontrado', detail: 'No existe', status: 404 },
      { status: 404, statusText: 'Not Found' },
    );

    await promesa.then(
      () => { throw new Error('deberia rechazar'); },
      (error: ApiError) => {
        expect(error.title).toBe('Pedido no encontrado');
        expect(error.status).toBe(404);
      },
    );
  });
});
