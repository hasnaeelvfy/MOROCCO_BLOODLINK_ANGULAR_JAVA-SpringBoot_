package com.bloodlink.dto.response;

import com.bloodlink.common.enums.NotificationKind;

public record AdminNotificationResponse(
        Long id,
        Long userId,
        String userEmail,
        NotificationKind kind,
        String title,
        String body,
        boolean read,
        Long requestId,
        Long matchId,
        String createdAt
) {
}
