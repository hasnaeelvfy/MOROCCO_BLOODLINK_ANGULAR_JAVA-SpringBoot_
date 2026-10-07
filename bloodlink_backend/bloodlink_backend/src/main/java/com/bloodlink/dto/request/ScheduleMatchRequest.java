package com.bloodlink.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ScheduleMatchRequest(
        @NotBlank String scheduledAt
) {
}
