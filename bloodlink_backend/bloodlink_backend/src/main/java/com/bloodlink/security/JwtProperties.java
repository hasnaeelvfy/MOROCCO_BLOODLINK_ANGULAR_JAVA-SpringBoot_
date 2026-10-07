package com.bloodlink.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "bloodlink.jwt")
public record JwtProperties(String secret, long expirationMs, String issuer) {
}
