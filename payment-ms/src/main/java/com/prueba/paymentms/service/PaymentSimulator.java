package com.prueba.paymentms.service;

import com.prueba.paymentms.messaging.OrderPlacedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;

// La decision es determinista: un rechazo aleatorio impediria al revisor reproducir el camino de fallo
@Service
public class PaymentSimulator {

    private static final Logger log = LoggerFactory.getLogger(PaymentSimulator.class);

    private final BigDecimal umbralDeRechazo;
    private final long retrasoEnMilisegundos;

    public PaymentSimulator(
            @Value("${payment.simulation.decline-threshold}") BigDecimal umbralDeRechazo,
            @Value("${payment.simulation.processing-delay-ms}") long retrasoEnMilisegundos) {
        this.umbralDeRechazo = umbralDeRechazo;
        this.retrasoEnMilisegundos = retrasoEnMilisegundos;
    }

    public PaymentResult procesar(OrderPlacedEvent evento) {
        simularLatenciaDeLaPasarela();

        if (evento.amount().compareTo(umbralDeRechazo) >= 0) {
            log.info("Cobro rechazado para el pedido {}: el monto {} alcanza el umbral {}",
                    evento.orderId(), evento.amount(), umbralDeRechazo);
            return PaymentResult.rechazado(
                    "Fondos insuficientes para un cargo de %s %s"
                            .formatted(evento.amount(), evento.currency()));
        }

        String referencia = "PAY-" + UUID.randomUUID().toString()
                .substring(0, 8).toUpperCase(Locale.ROOT);
        log.info("Cobro aprobado para el pedido {} con referencia {}", evento.orderId(), referencia);
        return PaymentResult.aprobado(referencia);
    }

    private void simularLatenciaDeLaPasarela() {
        if (retrasoEnMilisegundos <= 0) {
            return;
        }
        try {
            Thread.sleep(retrasoEnMilisegundos);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
