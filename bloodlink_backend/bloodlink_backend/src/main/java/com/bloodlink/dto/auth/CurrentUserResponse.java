package com.bloodlink.dto.auth;

import com.bloodlink.common.enums.Role;

public record CurrentUserResponse(
        Long userId,
        String email,
        Role role,
        Long hospitalId,
        String locale
) {
}
