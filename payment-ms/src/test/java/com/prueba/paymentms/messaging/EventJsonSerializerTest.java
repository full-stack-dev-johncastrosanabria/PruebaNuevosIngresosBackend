package com.prueba.paymentms.messaging;

import org.junit.jupiter.api.Test;
import org.springframework.kafka.support.serializer.JacksonJsonDeserializer;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EventJsonSerializerTest {

    @Test
    void conservaElTimestampNumericoYLosNanosegundosDelContratoKafka() {
        PaymentProcessedEvent evento = new PaymentProcessedEvent(
                UUID.randomUUID(), UUID.randomUUID(),
                Instant.parse("2026-09-05T00:00:00.123456789Z"),
                "APROBADO", "PAY-123", null);

        try (EventJsonSerializer<PaymentProcessedEvent> serializador = new EventJsonSerializer<>();
                JacksonJsonDeserializer<PaymentProcessedEvent> deserializador =
                        new JacksonJsonDeserializer<>(PaymentProcessedEvent.class)) {
            byte[] mensaje = serializador.serialize("payments.processed", evento);

            assertThat(new String(mensaje, StandardCharsets.UTF_8))
                    .contains("\"occurredAt\":1788566400.123456789");
            assertThat(deserializador.deserialize("payments.processed", mensaje)).isEqualTo(evento);
        }
    }
}
