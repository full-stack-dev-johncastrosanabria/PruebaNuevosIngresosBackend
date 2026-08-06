package com.prueba.paymentms.service;

public record PaymentResult(boolean approved, String reference, String failureReason) {

    public static PaymentResult aprobado(String referencia) {
        return new PaymentResult(true, referencia, null);
    }

    public static PaymentResult rechazado(String motivo) {
        return new PaymentResult(false, null, motivo);
    }
}
