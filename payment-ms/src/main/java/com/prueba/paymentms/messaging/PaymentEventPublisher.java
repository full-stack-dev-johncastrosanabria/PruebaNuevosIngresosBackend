package com.prueba.paymentms.messaging;

import com.prueba.paymentms.observability.CorrelationIdConstants;
import java.nio.charset.StandardCharsets;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class PaymentEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventPublisher.class);

    private final KafkaTemplate<String, Object> plantilla;

    public PaymentEventPublisher(KafkaTemplate<String, Object> plantilla) {
        this.plantilla = plantilla;
    }

    public void publicar(PaymentProcessedEvent evento, String correlationId) {
        String clave = evento.orderId().toString();

        ProducerRecord<String, Object> registro =
                new ProducerRecord<>(KafkaTopics.PAYMENT_PROCESSED, clave, evento);
        registro.headers().add(CorrelationIdConstants.HEADER,
                correlationId.getBytes(StandardCharsets.UTF_8));

        plantilla.send(registro).whenComplete((resultado, error) -> {
            if (error != null) {
                log.error("No fue posible publicar payment-processed para el pedido {}", clave, error);
            } else {
                log.info("Evento payment-processed publicado para el pedido {} con estado {}",
                        clave, evento.status());
            }
        });
    }
}
