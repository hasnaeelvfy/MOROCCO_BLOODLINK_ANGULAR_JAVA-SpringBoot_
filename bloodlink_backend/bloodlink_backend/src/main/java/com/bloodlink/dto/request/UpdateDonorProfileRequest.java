package com.bloodlink.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateDonorProfileRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank String phone,
        @NotBlank String cin,
        @NotNull Long cityId,
        String bloodType,
        String dateOfBirth,
        Integer weightKg,
        Integer heightCm,
        String lastDonation,
        String preferredContact,
        Boolean locationConsent,
        Double latitude,
        Double longitude
) {
}
