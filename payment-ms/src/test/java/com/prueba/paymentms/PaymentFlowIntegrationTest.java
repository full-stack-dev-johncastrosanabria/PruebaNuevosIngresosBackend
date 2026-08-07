package com.prueba.paymentms;

import com.prueba.paymentms.messaging.KafkaTopics;
import com.prueba.paymentms.messaging.OrderPlacedEvent;
import com.prueba.paymentms.messaging.PaymentProcessedEvent;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class PaymentFlowIntegrationTest {

    @Container
    @ServiceConnection
    static final KafkaContainer KAFKA =
            new KafkaContainer(DockerImageName.parse("apache/kafka:4.3.1"));

    @Autowired
    private KafkaTemplate<String, Object> plantilla;

    private OrderPlacedEvent pedidoPor(String monto) {
        return new OrderPlacedEvent(
                UUID.randomUUID(), UUID.randomUUID(), Instant.now(),
                new BigDecimal(monto), "USD",
                new OrderPlacedEvent.Customer("Ana Torres", "ana@ejemplo.com"),
                new OrderPlacedEvent.Card("VISA", "4242", "ANA TORRES"));
    }

    private ConsumerRecord<String, PaymentProcessedEvent> publicarYEsperarRespuesta(
            OrderPlacedEvent pedido) {

        try (Consumer<String, PaymentProcessedEvent> consumidor = consumidorDeResultados()) {
            // Forzar asignacion de particion antes de publicar para no ver respuestas de tests anteriores
            consumidor.poll(Duration.ofMillis(500));
            plantilla.send(KafkaTopics.ORDER_PLACED, pedido.orderId().toString(), pedido);
            return KafkaTestUtils.getSingleRecord(
                    consumidor, KafkaTopics.PAYMENT_PROCESSED, Duration.ofSeconds(20));
        }
    }

    @Test
    void apruebaUnCobroPorDebajoDelUmbral() {
        OrderPlacedEvent pedido = pedidoPor("249.90");

        ConsumerRecord<String, PaymentProcessedEvent> respuesta = publicarYEsperarRespuesta(pedido);

        assertThat(respuesta.key()).isEqualTo(pedido.orderId().toString());
        assertThat(respuesta.value().orderId()).isEqualTo(pedido.orderId());
        assertThat(respuesta.value().status()).isEqualTo("APROBADO");
        assertThat(respuesta.value().paymentReference()).startsWith("PAY-");
        assertThat(respuesta.value().failureReason()).isNull();
    }

    @Test
    void rechazaUnCobroQueAlcanzaElUmbral() {
        OrderPlacedEvent pedido = pedidoPor("1500.00");

        ConsumerRecord<String, PaymentProcessedEvent> respuesta = publicarYEsperarRespuesta(pedido);

        assertThat(respuesta.value().status()).isEqualTo("RECHAZADO");
        assertThat(respuesta.value().paymentReference()).isNull();
        assertThat(respuesta.value().failureReason()).contains("Fondos insuficientes");
    }

    @Test
    void propagaElIdentificadorDeCorrelacionAlEventoDeRespuesta() {
        OrderPlacedEvent pedido = pedidoPor("49.95");
        String correlacion = "correlacion-de-prueba";

        try (Consumer<String, PaymentProcessedEvent> consumidor = consumidorDeResultados()) {
            // Forzar asignacion de particion antes de publicar
            consumidor.poll(Duration.ofMillis(500));
            ProducerRecord<String, Object> registro =
                    new ProducerRecord<>(KafkaTopics.ORDER_PLACED, pedido.orderId().toString(), pedido);
            registro.headers().add("X-Correlation-Id", correlacion.getBytes(StandardCharsets.UTF_8));
            plantilla.send(registro);

            ConsumerRecord<String, PaymentProcessedEvent> respuesta = KafkaTestUtils.getSingleRecord(
                    consumidor, KafkaTopics.PAYMENT_PROCESSED, Duration.ofSeconds(20));

            String recibido = new String(
                    respuesta.headers().lastHeader("X-Correlation-Id").value(),
                    StandardCharsets.UTF_8);
            assertThat(recibido).isEqualTo(correlacion);
        }
    }

    private Consumer<String, PaymentProcessedEvent> consumidorDeResultados() {
        Map<String, Object> propiedades = KafkaTestUtils.consumerProps(
                KAFKA.getBootstrapServers(), "prueba-" + UUID.randomUUID(), "true");
        propiedades.put("key.deserializer", StringDeserializer.class);
        propiedades.put("value.deserializer", JsonDeserializer.class);
        propiedades.put("spring.json.trusted.packages", "com.prueba.paymentms.messaging");
        propiedades.put("spring.json.value.default.type",
                "com.prueba.paymentms.messaging.PaymentProcessedEvent");
        propiedades.put("spring.json.use.type.headers", false);
        propiedades.put("auto.offset.reset", "latest");

        Consumer<String, PaymentProcessedEvent> consumidor =
                new DefaultKafkaConsumerFactory<String, PaymentProcessedEvent>(propiedades)
                        .createConsumer();
        consumidor.subscribe(List.of(KafkaTopics.PAYMENT_PROCESSED));
        return consumidor;
    }
}
