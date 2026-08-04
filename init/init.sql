CREATE TABLE IF NOT EXISTS orders (
    id                     UUID          PRIMARY KEY,
    customer_name          VARCHAR(120)  NOT NULL,
    customer_email         VARCHAR(180)  NOT NULL,
    product_sku            VARCHAR(60)   NOT NULL,
    product_name           VARCHAR(160)  NOT NULL,
    quantity               INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price             NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
    total_amount           NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    currency               VARCHAR(3)    NOT NULL DEFAULT 'USD',
    status                 VARCHAR(20)   NOT NULL
        CHECK (status IN ('PENDIENTE', 'PAGADO', 'FALLO_PAGO')),
    card_holder            VARCHAR(120)  NOT NULL,
    card_brand             VARCHAR(20)   NOT NULL,
    card_last_four         VARCHAR(4)    NOT NULL,
    encrypted_card_payload TEXT          NOT NULL,
    payment_reference      VARCHAR(60),
    failure_reason         VARCHAR(200),
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    version                BIGINT        NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- Idempotencia del consumidor de payment-processed.
-- Kafka entrega at-least-once: una reentrega no debe reaplicar la transicion de estado.
CREATE TABLE IF NOT EXISTS processed_events (
    event_id       UUID        PRIMARY KEY,
    consumer_group VARCHAR(80) NOT NULL,
    processed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
