import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { CryptoService } from './crypto.service';
import { environment } from '../../environments/environment';

async function parDePrueba(): Promise<{ publicKeyBase64: string; privateKey: CryptoKey }> {
  const par = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  );
  const spki = await crypto.subtle.exportKey('spki', par.publicKey);
  const bytes = new Uint8Array(spki);
  let binario = '';
  for (const b of bytes) binario += String.fromCodePoint(b);
  return { publicKeyBase64: btoa(binario), privateKey: par.privateKey };
}

describe('CryptoService', () => {
  let servicio: CryptoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CryptoService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CryptoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function responderLlave(publicKeyBase64: string): void {
    http.expectOne(`${environment.apiBaseUrl}/crypto/public-key`).flush({
      algorithm: 'RSA-OAEP',
      keySize: 2048,
      format: 'SPKI',
      hash: 'SHA-256',
      publicKey: publicKeyBase64,
    });
  }

  it('produce un criptograma que la llave privada correspondiente puede descifrar', async () => {
    const { publicKeyBase64, privateKey } = await parDePrueba();

    const promesa = servicio.encryptCard({
      pan: '4242424242424242',
      cvv: '123',
      expiryMonth: 12,
      expiryYear: 2030,
      holder: 'ANA TORRES',
    });
    responderLlave(publicKeyBase64);
    const cifrado = await promesa;

    const bytes = Uint8Array.from(atob(cifrado), (c) => c.codePointAt(0));
    const claro = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, bytes);
    const datos = JSON.parse(new TextDecoder().decode(claro)) as Record<string, unknown>;

    expect(datos['pan']).toBe('4242424242424242');
    expect(datos['cvv']).toBe('123');
    expect(datos['expiryMonth']).toBe(12);
    expect(datos['holder']).toBe('ANA TORRES');
  });

  it('el criptograma no contiene el numero de tarjeta en claro', async () => {
    const { publicKeyBase64 } = await parDePrueba();

    const promesa = servicio.encryptCard({
      pan: '4242424242424242',
      cvv: '123',
      expiryMonth: 12,
      expiryYear: 2030,
      holder: 'ANA TORRES',
    });
    responderLlave(publicKeyBase64);

    expect(await promesa).not.toContain('4242424242424242');
  });

  it('solicita la llave publica una sola vez y reutiliza la cacheada', async () => {
    const { publicKeyBase64 } = await parDePrueba();
    const tarjeta = {
      pan: '4242424242424242',
      cvv: '123',
      expiryMonth: 12,
      expiryYear: 2030,
      holder: 'ANA TORRES',
    };

    const primera = servicio.encryptCard(tarjeta);
    responderLlave(publicKeyBase64);
    await primera;

    await servicio.encryptCard(tarjeta);
    // Si hubiera una segunda peticion, http.verify() del afterEach fallaria
    expect(true).toBe(true);
  });
});
