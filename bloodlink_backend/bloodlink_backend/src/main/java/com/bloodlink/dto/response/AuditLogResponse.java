package com.bloodlink.dto.response;

public record AuditLogResponse(
        Long id,
        Long actorUserId,
        String actorEmail,
        String action,
        String targetType,
        Long targetId,
        String details,
        String createdAt
) {
}
