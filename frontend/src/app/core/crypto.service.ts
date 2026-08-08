import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import type { CardInput, PublicKeyResponse } from './models/card.model';

// Usa RSA-OAEP con SHA-256 via crypto.subtle; sin librerias de terceros de criptografia
@Injectable({ providedIn: 'root' })
export class CryptoService {
  readonly #http = inject(HttpClient);

  // La llave no cambia durante la vida de la pagina: se resuelve una vez y se reutiliza
  #llaveImportada: Promise<CryptoKey> | null = null;

  async encryptCard(card: CardInput): Promise<string> {
    const llave = await this.#obtenerLlave();
    const carga = new TextEncoder().encode(JSON.stringify(card));
    const cifrado = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, llave, carga);
    return this.#aBase64(new Uint8Array(cifrado));
  }

  #obtenerLlave(): Promise<CryptoKey> {
    this.#llaveImportada ??= this.#descargarEImportar();
    return this.#llaveImportada;
  }

  async #descargarEImportar(): Promise<CryptoKey> {
    try {
      const respuesta = await firstValueFrom(
        this.#http.get<PublicKeyResponse>(`${environment.apiBaseUrl}/crypto/public-key`),
      );
      return await crypto.subtle.importKey(
        'spki',
        this.#desdeBase64(respuesta.publicKey),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt'],
      );
    } catch (error) {
      // Si la importacion falla, no dejar cacheada una promesa rechazada para que el siguiente intento pueda reintentar
      this.#llaveImportada = null;
      throw error;
    }
  }

  #desdeBase64(valor: string): ArrayBuffer {
    const binario = atob(valor);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.codePointAt(i) ?? 0;
    return bytes.buffer as ArrayBuffer;
  }

  #aBase64(bytes: Uint8Array): string {
    let binario = '';
    for (const byte of bytes) binario += String.fromCodePoint(byte);
    return btoa(binario);
  }
}
