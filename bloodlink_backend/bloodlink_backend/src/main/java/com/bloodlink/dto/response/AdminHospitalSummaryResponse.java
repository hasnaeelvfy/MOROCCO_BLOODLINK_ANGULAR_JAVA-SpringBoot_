package com.bloodlink.dto.response;

public record AdminHospitalSummaryResponse(
        Long id,
        String name,
        String type,
        String city,
        String phone,
        String email,
        String registrationNumber,
        String verification,
        String verificationReason,
        String registeredAt,
        String logoUrl
) {
}
