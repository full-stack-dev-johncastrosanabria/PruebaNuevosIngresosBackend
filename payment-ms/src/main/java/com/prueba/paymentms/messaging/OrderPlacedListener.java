package com.prueba.paymentms.messaging;

import com.prueba.paymentms.observability.CorrelationIdConstants;
import com.prueba.paymentms.service.PaymentResult;
import com.prueba.paymentms.service.PaymentSimulator;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

@Component
public class OrderPlacedListener {

    private static final Logger log = LoggerFactory.getLogger(OrderPlacedListener.class);

    private final PaymentSimulator simulador;
    private final PaymentEventPublisher publicador;

    public OrderPlacedListener(PaymentSimulator simulador, PaymentEventPublisher publicador) {
        this.simulador = simulador;
        this.publicador = publicador;
    }

    @KafkaListener(topics = KafkaTopics.ORDER_PLACED, groupId = "payment-ms")
    public void alRecibirPedido(ConsumerRecord<String, OrderPlacedEvent> registro) {
        String correlationId = leerCorrelationId(registro);
        MDC.put(CorrelationIdConstants.MDC_KEY, correlationId);
        try {
            OrderPlacedEvent evento = registro.value();
            log.info("Pedido {} recibido para cobro por {} {}",
                    evento.orderId(), evento.amount(), evento.currency());

            PaymentResult resultado = simulador.procesar(evento);

            PaymentProcessedEvent respuesta = new PaymentProcessedEvent(
                    UUID.randomUUID(),
                    evento.orderId(),
                    Instant.now(),
                    resultado.approved()
                            ? PaymentProcessedEvent.APROBADO
                            : PaymentProcessedEvent.RECHAZADO,
                    resultado.reference(),
                    resultado.failureReason());

            publicador.publicar(respuesta, correlationId);
        } finally {
            MDC.remove(CorrelationIdConstants.MDC_KEY);
        }
    }

    private String leerCorrelationId(ConsumerRecord<String, OrderPlacedEvent> registro) {
        var cabecera = registro.headers().lastHeader(CorrelationIdConstants.HEADER);
        return cabecera != null
                ? new String(cabecera.value(), StandardCharsets.UTF_8)
                : UUID.randomUUID().toString();
    }
}
