package com.prueba.paymentms.service;

import com.prueba.paymentms.messaging.OrderPlacedEvent;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentSimulatorTest {

    private final PaymentSimulator simulador =
            new PaymentSimulator(new BigDecimal("1000.00"), 0);

    private OrderPlacedEvent eventoPor(String monto) {
        return new OrderPlacedEvent(
                UUID.randomUUID(), UUID.randomUUID(), Instant.now(),
                new BigDecimal(monto), "USD",
                new OrderPlacedEvent.Customer("Ana", "ana@ejemplo.com"),
                new OrderPlacedEvent.Card("VISA", "4242", "ANA TORRES"));
    }

    @Test
    void apruebaMontosPorDebajoDelUmbral() {
        PaymentResult resultado = simulador.procesar(eventoPor("999.99"));

        assertThat(resultado.approved()).isTrue();
        assertThat(resultado.reference()).startsWith("PAY-");
        assertThat(resultado.failureReason()).isNull();
    }

    @Test
    void rechazaMontosIgualesAlUmbral() {
        PaymentResult resultado = simulador.procesar(eventoPor("1000.00"));

        assertThat(resultado.approved()).isFalse();
        assertThat(resultado.reference()).isNull();
        assertThat(resultado.failureReason()).contains("Fondos insuficientes");
    }

    @Test
    void rechazaMontosPorEncimaDelUmbral() {
        assertThat(simulador.procesar(eventoPor("5000.00")).approved()).isFalse();
    }

    @Test
    void generaReferenciasDistintasEnCadaAprobacion() {
        String primera = simulador.procesar(eventoPor("10.00")).reference();
        String segunda = simulador.procesar(eventoPor("10.00")).reference();

        assertThat(primera).isNotEqualTo(segunda);
    }
}
