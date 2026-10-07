package com.bloodlink.exception;

import com.bloodlink.common.ErrorCodes;

public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Invalid email or password");
    }

    public String getCode() {
        return ErrorCodes.INVALID_CREDENTIALS;
    }
}
