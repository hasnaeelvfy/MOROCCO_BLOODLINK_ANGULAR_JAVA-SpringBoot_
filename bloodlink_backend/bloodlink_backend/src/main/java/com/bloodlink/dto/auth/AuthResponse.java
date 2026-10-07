package com.bloodlink.dto.auth;

import com.bloodlink.common.enums.Role;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Long userId,
        Role role,
        Long hospitalId,
        String message
) {
}
