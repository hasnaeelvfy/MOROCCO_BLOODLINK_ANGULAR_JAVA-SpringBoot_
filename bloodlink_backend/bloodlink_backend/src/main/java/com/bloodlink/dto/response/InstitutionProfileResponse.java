package com.bloodlink.dto.response;

import java.util.List;

public record InstitutionProfileResponse(
        Long id,
        String name,
        String type,
        String city,
        String region,
        String address,
        String phone,
        String email,
        String website,
        String description,
        String workingHours,
        String registrationNumber,
        String verification,
        String registeredAt,
        String logoUrl,
        HospitalStatsResponse stats,
        List<String> requestedBloodGroups,
        List<BloodRequestResponse> activeRequests
) {
}
