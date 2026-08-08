import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  Validators,
  type AbstractControl,
} from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { CryptoService } from '../../../core/crypto.service';
import { OrderService } from '../../../core/order.service';
import { expiryValidator, luhnValidator } from '../../../core/validators/card.validators';
import { agruparPan, resolverMarca } from '../../../core/card-brand';
import type { ApiError } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-create',
  imports: [ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './order-create.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCreate {
  readonly #fb = inject(NonNullableFormBuilder);
  readonly #crypto = inject(CryptoService);
  readonly #orders = inject(OrderService);
  readonly #router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  protected readonly formulario = this.#fb.group({
    customerName: ['', [Validators.required, Validators.maxLength(120)]],
    customerEmail: ['', [Validators.required, Validators.email]],
    productSku: ['', [Validators.required, Validators.maxLength(60)]],
    productName: ['', [Validators.required, Validators.maxLength(160)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['USD', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    card: this.#fb.group(
      {
        pan: ['', [Validators.required, luhnValidator()]],
        cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
        expiryMonth: [12, [Validators.required, Validators.min(1), Validators.max(12)]],
        expiryYear: [
          new Date().getFullYear() + 1,
          [Validators.required, Validators.min(new Date().getFullYear())],
        ],
        holder: ['', [Validators.required, Validators.maxLength(120)]],
      },
      { validators: expiryValidator() },
    ),
  });

  readonly #valores = signal(this.formulario.getRawValue());

  protected readonly total = computed(() => {
    const { quantity, unitPrice } = this.#valores();
    return Math.round(quantity * unitPrice * 100) / 100;
  });

  /** Un campo solo se marca en rojo despues de visitarlo: no se regana por adelantado. */
  protected invalido(control: AbstractControl): boolean {
    return control.touched && control.invalid;
  }

  /** Confirma al usuario que el numero se reconocio, antes de enviarlo. */
  protected readonly marca = computed(() => {
    const marca = resolverMarca(this.#valores().card.pan);
    return marca === 'DESCONOCIDA' ? null : marca;
  });

  /**
   * Reescribe el numero en grupos mientras se teclea. Se conserva la posicion del
   * cursor contando digitos y no caracteres, para no mandarlo al final cuando se
   * corrige algo en medio.
   */
  protected formatearPan(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const digitosAntesDelCursor = campo.value
      .slice(0, campo.selectionStart ?? campo.value.length)
      .replace(/\D/g, '').length;

    const agrupado = agruparPan(campo.value);
    if (agrupado === campo.value) return;

    let posicion = 0;
    let vistos = 0;
    while (posicion < agrupado.length && vistos < digitosAntesDelCursor) {
      if (/\d/.test(agrupado[posicion])) vistos++;
      posicion++;
    }

    campo.value = agrupado;
    campo.setSelectionRange(posicion, posicion);
    this.formulario.controls.card.controls.pan.setValue(agrupado);
  }

  constructor() {
    // Alimenta la señal del total sin recurrir a un BehaviorSubject.
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.#valores.set(this.formulario.getRawValue()));
  }

  protected async enviar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    const { card, ...pedido } = this.formulario.getRawValue();

    try {
      const encryptedCard = await this.#crypto.encryptCard({
        pan: card.pan.replace(/\s/g, ''),
        cvv: card.cvv,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        holder: card.holder,
      });

      const creado = await firstValueFrom(this.#orders.create({ ...pedido, encryptedCard }));

      await this.#router.navigate(['/orders', creado.id]);
    } catch (causa) {
      this.error.set(causa as ApiError);
    } finally {
      this.enviando.set(false);
    }
  }
}
