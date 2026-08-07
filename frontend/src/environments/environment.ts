export const environment = {
  // Ruta relativa: nginx redirige /api hacia OrderMS por la red interna de Docker, sin CORS
  apiBaseUrl: '/api/v1',
  pollingIntervalMs: 2000,
  pollingTimeoutMs: 60000,
} as const;
