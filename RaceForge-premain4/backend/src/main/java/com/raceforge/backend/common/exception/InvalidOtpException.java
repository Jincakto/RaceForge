package com.raceforge.backend.common.exception;

import org.springframework.http.HttpStatus;

public class InvalidOtpException extends ApiException {
    public InvalidOtpException() {
        super(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Invalid or expired OTP");
    }
}
