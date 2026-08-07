package com.prueba.paymentms.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// Contrato duplicado deliberadamente: una libreria compartida acoplaria el despliegue de ambos servicios
public record OrderPlacedEvent(
        UUID eventId,
        UUID orderId,
        Instant occurredAt,
        BigDecimal amount,
        String currency,
        Customer customer,
        Card card
) {

    public record Customer(String name, String email) {
    }

    public record Card(String brand, String lastFour, String holder) {
    }
}
