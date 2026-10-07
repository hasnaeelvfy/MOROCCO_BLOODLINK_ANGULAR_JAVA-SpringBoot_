package com.bloodlink.dto.response;

import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.UserStatus;

public record AdminUserSummaryResponse(
        Long id,
        String email,
        Role role,
        UserStatus status,
        Long hospitalId,
        String hospitalName,
        Long donorId,
        String displayName,
        String locale,
        String createdAt
) {
}
