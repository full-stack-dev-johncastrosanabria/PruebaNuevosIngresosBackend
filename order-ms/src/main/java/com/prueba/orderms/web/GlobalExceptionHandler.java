package com.prueba.orderms.web;

import com.prueba.orderms.card.InvalidCardException;
import com.prueba.orderms.crypto.CryptoException;
import com.prueba.orderms.service.OrderNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.kafka.KafkaException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail solicitudInvalida(MethodArgumentNotValidException e) {
        Map<String, String> errores = new HashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(error -> errores.put(error.getField(), error.getDefaultMessage()));

        ProblemDetail problema = crear(HttpStatus.BAD_REQUEST, "Solicitud invalida",
                "Uno o mas campos no superaron la validacion");
        problema.setProperty("errors", errores);
        return problema;
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail parametroInvalido(MethodArgumentTypeMismatchException e) {
        // Un identificador mal formado es un error del cliente, no una falla del servidor
        String tipoRequerido = e.getRequiredType() != null
                ? e.getRequiredType().getSimpleName()
                : "valor";
        return crear(HttpStatus.BAD_REQUEST, "Parametro invalido",
                "El valor '%s' no es un %s valido para el parametro '%s'"
                        .formatted(e.getValue(), tipoRequerido, e.getName()));
    }

    @ExceptionHandler(InvalidCardException.class)
    public ProblemDetail tarjetaInvalida(InvalidCardException e) {
        return crear(HttpStatus.BAD_REQUEST, "Datos de tarjeta invalidos", e.getMessage());
    }

    @ExceptionHandler(CryptoException.class)
    public ProblemDetail criptogramaInvalido(CryptoException e) {
        // Se registra la causa en el servidor pero al cliente se devuelve un mensaje generico
        log.warn("Fallo al procesar datos cifrados: {}", e.getMessage());
        return crear(HttpStatus.BAD_REQUEST, "Datos cifrados invalidos",
                "No fue posible procesar los datos de tarjeta cifrados");
    }

    @ExceptionHandler(OrderNotFoundException.class)
    public ProblemDetail pedidoNoEncontrado(OrderNotFoundException e) {
        return crear(HttpStatus.NOT_FOUND, "Pedido no encontrado", e.getMessage());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ProblemDetail conflictoDeConcurrencia(OptimisticLockingFailureException e) {
        return crear(HttpStatus.CONFLICT, "Conflicto de concurrencia",
                "El pedido fue modificado por otra operacion. Intente de nuevo.");
    }

    @ExceptionHandler(KafkaException.class)
    public ProblemDetail mensajeriaNoDisponible(KafkaException e) {
        log.error("Kafka no esta disponible", e);
        return crear(HttpStatus.SERVICE_UNAVAILABLE, "Servicio de mensajeria no disponible",
                "El pedido no pudo encolarse para su procesamiento. Intente mas tarde.");
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail errorNoControlado(Exception e) {
        log.error("Error no controlado", e);
        return crear(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno",
                "Ocurrio un error inesperado al procesar la solicitud");
    }

    private ProblemDetail crear(HttpStatus estado, String titulo, String detalle) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(estado, detalle);
        problema.setTitle(titulo);
        problema.setProperty("timestamp", Instant.now());
        return problema;
    }
}
