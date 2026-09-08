package com.prueba.orderms.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderTest {

    private Order pedidoPendiente() {
        return Order.nuevo(
                "Ana Torres", "ana@ejemplo.com",
                "SKU-1", "Teclado", 2,
                new BigDecimal("49.95"), "USD",
                "ANA TORRES", "VISA", "4242", "criptograma");
    }

    @Test
    void unPedidoNuevoNaceEnPendienteConElTotalCalculado() {
        Order pedido = pedidoPendiente();

        assertThat(pedido.getStatus()).isEqualTo(OrderStatus.PENDIENTE);
        assertThat(pedido.getTotalAmount()).isEqualByComparingTo("99.90");
        assertThat(pedido.getId()).isNotNull();
    }

    @Test
    void marcarPagadoTransicionaDesdePendiente() {
        Order pedido = pedidoPendiente();

        pedido.marcarPagado("PAY-123");

        assertThat(pedido.getStatus()).isEqualTo(OrderStatus.PAGADO);
        assertThat(pedido.getPaymentReference()).isEqualTo("PAY-123");
        assertThat(pedido.getFailureReason()).isNull();
    }

    @Test
    void marcarFallidoTransicionaDesdePendiente() {
        Order pedido = pedidoPendiente();

        pedido.marcarFallido("Fondos insuficientes");

        assertThat(pedido.getStatus()).isEqualTo(OrderStatus.FALLO_PAGO);
        assertThat(pedido.getFailureReason()).isEqualTo("Fondos insuficientes");
    }

    @Test
    void unPedidoYaResueltoNoAceptaOtraTransicion() {
        Order pedido = pedidoPendiente();
        pedido.marcarPagado("PAY-123");

        assertThatThrownBy(() -> pedido.marcarFallido("tardio"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PAGADO");
    }

    @Test
    void elTotalSeRedondeaADosDecimales() {
        Order pedido = Order.nuevo(
                "Ana", "ana@ejemplo.com", "SKU-2", "Cable", 3,
                new BigDecimal("10.333"), "USD",
                "ANA", "VISA", "4242", "criptograma");

        assertThat(pedido.getTotalAmount()).isEqualByComparingTo("31.00");
    }

    @Test
    void quantityZeroThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> Order.nuevo(
                "Ana", "ana@ejemplo.com",
                "SKU-1", "Teclado", 0,
                new BigDecimal("49.95"), "USD",
                "ANA TORRES", "VISA", "4242", "criptograma"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Quantity must be greater than zero");
    }

    @Test
    void negativeQuantityThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> Order.nuevo(
                "Ana", "ana@ejemplo.com",
                "SKU-1", "Teclado", -1,
                new BigDecimal("49.95"), "USD",
                "ANA TORRES", "VISA", "4242", "criptograma"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Quantity must be greater than zero");
    }

    @Test
    void nullUnitPriceThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> Order.nuevo(
                "Ana", "ana@ejemplo.com",
                "SKU-1", "Teclado", 1,
                null, "USD",
                "ANA TORRES", "VISA", "4242", "criptograma"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unit price must be greater than zero");
    }

    @Test
    void zeroUnitPriceThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> Order.nuevo(
                "Ana", "ana@ejemplo.com",
                "SKU-1", "Teclado", 1,
                BigDecimal.ZERO, "USD",
                "ANA TORRES", "VISA", "4242", "criptograma"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unit price must be greater than zero");
    }

    @Test
    void negativeUnitPriceThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> Order.nuevo(
                "Ana", "ana@ejemplo.com",
                "SKU-1", "Teclado", 1,
                new BigDecimal("-0.01"), "USD",
                "ANA TORRES", "VISA", "4242", "criptograma"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unit price must be greater than zero");
    }

    @Test
    void quantityThreeAndUnitPriceTenPointThreeThreeThreeResultsInTotalAmountThirtyOnePointZeroZero() {
        Order pedido = Order.nuevo(
                "Ana", "ana@ejemplo.com",
                "SKU-1", "Teclado", 3,
                new BigDecimal("10.333"), "USD",
                "ANA TORRES", "VISA", "4242", "criptograma");

        assertThat(pedido.getTotalAmount()).isEqualByComparingTo("31.00");
        assertThat(pedido.getUnitPrice()).isEqualByComparingTo("10.333");
    }

    @Test
    void quantityOneAndUnitPriceZeroPointZeroZeroFiveResultsInTotalAmountZeroPointZeroOne() {
        Order pedido = Order.nuevo(
                "Ana", "ana@ejemplo.com",
                "SKU-1", "Teclado", 1,
                new BigDecimal("0.005"), "USD",
                "ANA TORRES", "VISA", "4242", "criptograma");

        assertThat(pedido.getTotalAmount()).isEqualByComparingTo("0.01");
    }
}
