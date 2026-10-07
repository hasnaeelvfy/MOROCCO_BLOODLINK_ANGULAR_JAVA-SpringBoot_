package com.bloodlink.security;

import com.bloodlink.common.enums.Role;
import org.springframework.security.oauth2.jwt.Jwt;

public record AuthUser(
        Long userId,
        String email,
        Role role,
        Long hospitalId
) {
    public static AuthUser from(Jwt jwt) {
        String roleName = jwt.getClaimAsString("role");
        return new AuthUser(
                toLong(jwt.getClaim("userId")),
                jwt.getClaimAsString("email"),
                roleName == null ? null : Role.valueOf(roleName),
                toLong(jwt.getClaim("hospitalId"))
        );
    }

    private static Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }
}
