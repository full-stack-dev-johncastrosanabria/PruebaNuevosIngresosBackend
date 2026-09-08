package com.prueba.orderms.messaging;

import org.springframework.kafka.support.JacksonMapperUtils;
import org.springframework.kafka.support.serializer.JacksonJsonSerializer;
import tools.jackson.databind.cfg.DateTimeFeature;

public class EventJsonSerializer<T> extends JacksonJsonSerializer<T> {

    public EventJsonSerializer() {
        // El contrato Kafka usa segundos numericos con nanosegundos desde Jackson 2.
        super(JacksonMapperUtils.enhancedJsonMapper().rebuild()
                .enable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build());
    }
}
