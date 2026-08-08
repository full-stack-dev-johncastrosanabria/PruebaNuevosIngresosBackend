# Sistema de Pedidos y Pagos

Solución con dos microservicios (`OrderMS` y `PaymentMS`) que se comunican de forma asíncrona mediante Apache Kafka para procesar pedidos y simular cobros. Los datos sensibles de la tarjeta se cifran con RSA en el navegador antes de enviarse. Incluye un frontend en Angular para operar el flujo completo.

**Stack:** Java 21, Spring Boot 3.5, Apache Kafka (KRaft), PostgreSQL 17, Docker Compose, Angular 21.

## Arquitectura

```
Cliente ──POST /api/v1/orders──> OrderMS ──> PostgreSQL (PENDIENTE)
                                    │
                                    └──topic order-placed──> PaymentMS
                                                                 │
                                                        (simula el cobro)
                                                                 │
OrderMS <──topic payment-processed───────────────────────────────┘
   │
   └──> PostgreSQL (PAGADO | FALLO_PAGO)

Cliente ──GET /api/v1/orders/{id}──> estado final
```

**Seguridad:** El cliente pide la llave pública RSA a `OrderMS`, cifra el bloque de la tarjeta en el navegador y envía solo el `encryptedCard`. El backend descifra, extrae la marca y los últimos 4 dígitos, y descarta el número completo. El PAN nunca se persiste ni viaja por Kafka.

---

## a. Prerrequisitos

| Herramienta | Version minima | Para que |
|---|---|---|
| Docker + Docker Compose | 24 / v2 | Levantar todo el sistema |
| Git | 2.30 | Clonar el repositorio |
| cURL | cualquiera | Ejecutar el script de validacion |
| jq | 1.6 | Formatear las respuestas JSON del script (opcional) |
| OpenSSL | 1.1 | Solo si se quieren llaves RSA persistentes (opcional) |

No hace falta instalar Java, Maven, Node ni PostgreSQL en la maquina: cada imagen
compila su propio artefacto dentro de Docker.

---
## b. Instrucciones de Ejecución

### 1. Instalación

Clonar el repositorio:

```bash
git clone https://github.com/full-stack-dev-johncastrosanabria/PruebaNuevosIngresosBackend.git
cd PruebaNuevosIngresosBackend
```

### 2. Preparación de la base de datos

No requiere pasos manuales. El script SQL [`init/init.sql`](init/init.sql) crea la tabla `orders` con sus índices y restricciones. Se inyecta automáticamente en el contenedor de PostgreSQL a través del volumen de arranque oficial en `docker-compose.yml`:

```yaml
volumes:
  - ./init/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

### 3. Levantar el Sistema

El sistema está preparado para funcionar sin configuración previa. Si no encuentra un archivo `.env` ni llaves RSA en la carpeta `keys/`, generará un par efímero automáticamente para que el flujo funcione.

```bash
docker compose up --build -d
```

Esto construirá las imágenes y arrancará los 5 servicios (PostgreSQL, Kafka, OrderMS, PaymentMS y Frontend) respetando los healthchecks de cada dependencia. Las dos personalizaciones opcionales, para un uso más allá de la revisión, están descritas en [Configuracion opcional](#configuracion-opcional).

**Verificar el estado:**

```bash
docker compose ps
```

Todos los servicios deberían estar `running (healthy)`.

**URLs disponibles:**

* **Frontend:** http://localhost:4200
* **OrderMS API:** http://localhost:8080
* **Swagger UI:** http://localhost:8080/swagger-ui/index.html

### Configuracion opcional

Ninguno de estos dos pasos hace falta para revisar la prueba. Ni el archivo `.env` ni las llaves se versionan, porque este es un repositorio público y no es sitio para credenciales; el sistema está preparado para funcionar sin ellos.

**Variables de entorno.** Compose aplica valores por defecto razonables. Para cambiar puertos o credenciales:

```bash
cp .env.example .env    # editar a gusto
```

`PAYMENT_DECLINE_THRESHOLD` define el monto a partir del cual el cobro simulado se rechaza (1000.00 por defecto), lo que permite reproducir el camino de fallo de forma determinista.

**Llaves RSA persistentes.** Sin llaves en disco, OrderMS genera un par efímero en cada arranque: el flujo funciona igual, pero los pedidos creados antes de un reinicio dejan de ser descifrables. Para fijarlas:

```bash
./scripts/generate-keys.sh
docker compose restart order-ms
```

Deja `keys/private_key.pem` y `keys/public_key.pem`, que Compose monta en OrderMS en solo lectura.

---

## c. Instrucciones de Prueba (Script de Validación)

Puedes probar el flujo completo desde la interfaz web (http://localhost:4200) o por línea de comandos. Para reproducir el camino de fallo (`FALLO_PAGO`), usa un monto total igual o superior a 1000.00.

#### 1. Cifrar los datos de la tarjeta

El endpoint `POST /orders` exige que la tarjeta viaje cifrada. Usamos el script de ayuda que toma la llave pública del propio servicio:

```bash
TARJETA=$(./scripts/encrypt-card.sh 4242424242424242 123 12 2030 "ANA TORRES")
```

#### 2. Crear un pedido (POST)

```bash
RESPUESTA=$(curl -sS -X POST http://localhost:8080/api/v1/orders \
  -H 'Content-Type: application/json' \
  -d "{
    \"customerName\": \"Ana Torres\",
    \"customerEmail\": \"ana.torres@ejemplo.com\",
    \"productSku\": \"SKU-001\",
    \"productName\": \"Teclado mecanico\",
    \"quantity\": 2,
    \"unitPrice\": 49.99,
    \"currency\": \"USD\",
    \"encryptedCard\": \"${TARJETA}\"
  }")

ID=$(echo "${RESPUESTA}" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
echo "Pedido creado con ID: ${ID}"
```

#### 3. Consultar el estado inicial

Inmediatamente después de crear el pedido, el estado será `PENDIENTE`:

```bash
curl -s http://localhost:8080/api/v1/orders/${ID} | jq
```

*(Salida esperada)*

```json
{
  "id": "1463bbb9-8e15-4269-92e8-a6850fc895fd",
  "productName": "Teclado mecanico",
  "totalAmount": 99.98,
  "status": "PENDIENTE",
  "cardBrand": "VISA",
  "cardLastFour": "4242"
}
```

#### 4. Observar los logs de Kafka

Para confirmar la comunicación asíncrona entre `OrderMS` y `PaymentMS`:

```bash
docker compose logs -f order-ms payment-ms
```

*(Flujo esperado en logs)*

```text
order-ms    Pedido 1463bbb9... registrado en estado PENDIENTE
order-ms    Evento order-placed publicado para el pedido 1463bbb9...
payment-ms  Pedido 1463bbb9... recibido para cobro
payment-ms  Cobro aprobado para el pedido 1463bbb9...
order-ms    Resultado de pago recibido para el pedido 1463bbb9...: APROBADO
order-ms    Pedido 1463bbb9... actualizado a PAGADO
```

#### 5. Consultar el estado final

Tras unos segundos, el estado se actualiza a `PAGADO`:

```bash
curl -s http://localhost:8080/api/v1/orders/${ID} | jq '.status, .paymentReference'
```

*(Salida esperada)*

```json
"PAGADO"
"PAY-C0C0DB0E"
```

---

## Notas de Diseño

* **Contenerización:** Se usaron `Dockerfile` multi-etapa para ambos microservicios y el frontend. Spring Boot extrae las capas para cachear dependencias, y Angular se compila con Node pero se sirve desde nginx. Ningún contenedor corre como root.
* **Kafka:** Se desactivó la creación automática de tópicos. Se declaran explícitamente con sus particiones y colas de mensajes fallidos (`.DLT`) para evitar bloqueos por mensajes envenenados. El productor es idempotente.
* **Trazabilidad:** Cada petición HTTP genera un `correlation-id` que se inyecta en los headers de los mensajes de Kafka, permitiendo trazar el flujo completo entre ambos microservicios en los logs.
* **Errores:** La API estandariza los errores usando `application/problem+json` (RFC 7807), devolviendo detalles exactos de validación por campo para facilitar el feedback en el frontend.
