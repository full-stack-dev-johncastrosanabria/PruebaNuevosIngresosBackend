package com.prueba.paymentms.messaging;

import java.time.Instant;
import java.util.UUID;

public record PaymentProcessedEvent(
        UUID eventId,
        UUID orderId,
        Instant occurredAt,
        String status,
        String paymentReference,
        String failureReason
) {

    public static final String APROBADO = "APROBADO";
    public static final String RECHAZADO = "RECHAZADO";
}
