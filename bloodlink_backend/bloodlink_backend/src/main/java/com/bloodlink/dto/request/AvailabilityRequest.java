package com.bloodlink.dto.request;

import jakarta.validation.constraints.NotNull;

public record AvailabilityRequest(
        @NotNull Boolean available
) {
}
