export interface CardInput {
  readonly pan: string;
  readonly cvv: string;
  readonly expiryMonth: number;
  readonly expiryYear: number;
  readonly holder: string;
}

export interface PublicKeyResponse {
  readonly algorithm: string;
  readonly keySize: number;
  readonly format: string;
  readonly hash: string;
  readonly publicKey: string;
}
