package com.bloodlink.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateHospitalProfileRequest(
        @NotBlank String name,
        String type,
        String email,
        @NotBlank String phone,
        String registrationNumber,
        String website,
        @NotNull Long cityId,
        @NotBlank String address,
        String contact,
        String position,
        String description,
        String workingHours,
        Double approxLatitude,
        Double approxLongitude
) {
}
