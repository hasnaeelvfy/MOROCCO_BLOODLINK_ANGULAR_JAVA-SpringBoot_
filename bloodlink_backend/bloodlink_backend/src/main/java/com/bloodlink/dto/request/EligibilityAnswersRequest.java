package com.bloodlink.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EligibilityAnswersRequest(
        @NotNull Integer age,
        @NotNull Integer weight,
        String lastDonation,
        @NotBlank String generalHealth,
        boolean currentIllness,
        boolean medication,
        boolean recentSurgery,
        boolean recentTravel,
        boolean pregnancy
) {
}
