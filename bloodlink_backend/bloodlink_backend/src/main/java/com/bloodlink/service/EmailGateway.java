package com.bloodlink.service;

/**
 * Outbound email port. BloodLink does not currently ship an SMTP provider.
 * Password-reset tokens are persisted as hashes; the raw token is passed here
 * for delivery only and must never be written to application logs.
 */
public interface EmailGateway {

    void sendPasswordReset(String toEmail, String rawToken);
}
