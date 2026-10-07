package com.bloodlink.dto.response;

import com.bloodlink.common.enums.NotificationKind;

public record NotificationResponse(
        Long id,
        NotificationKind kind,
        String title,
        String body,
        String createdAt,
        boolean read,
        Long requestId,
        Long matchId
) {
}
