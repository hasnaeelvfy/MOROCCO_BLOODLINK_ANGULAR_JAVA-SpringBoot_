package com.bloodlink.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class LoggingEmailGateway implements EmailGateway {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailGateway.class);

    @Override
    public void sendPasswordReset(String toEmail, String rawToken) {
        if (rawToken == null) {
            return;
        }
        log.info(
                "Password reset requested for {}. Email delivery is not configured; the reset token was not logged.",
                toEmail
        );
    }
}
