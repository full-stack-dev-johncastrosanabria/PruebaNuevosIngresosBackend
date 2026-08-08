export type OrderStatus = 'PENDIENTE' | 'PAGADO' | 'FALLO_PAGO';

export interface Order {
  readonly id: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly productSku: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: OrderStatus;
  readonly cardBrand: string;
  readonly cardLastFour: string;
  readonly paymentReference: string | null;
  readonly failureReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PagedResponse<T> {
  readonly content: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly last: boolean;
}

export interface CreateOrderRequest {
  readonly customerName: string;
  readonly customerEmail: string;
  readonly productSku: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly currency: string;
  readonly encryptedCard: string;
}

/** Forma normalizada de error derivada del ProblemDetail que devuelve el backend. */
export interface ApiError {
  readonly title: string;
  readonly detail: string;
  readonly status: number;
  readonly fieldErrors: Readonly<Record<string, string>>;
}
