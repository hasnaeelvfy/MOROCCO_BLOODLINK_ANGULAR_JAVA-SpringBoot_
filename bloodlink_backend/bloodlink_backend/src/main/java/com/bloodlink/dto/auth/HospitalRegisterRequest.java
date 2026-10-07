package com.bloodlink.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record HospitalRegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank String hospitalName,
        @NotBlank String registrationNumber,
        @NotBlank String phone,
        @NotBlank String address,
        @NotNull Long cityId
) {
}
