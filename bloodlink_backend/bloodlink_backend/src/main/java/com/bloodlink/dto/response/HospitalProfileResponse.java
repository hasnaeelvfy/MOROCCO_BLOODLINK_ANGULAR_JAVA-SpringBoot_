package com.bloodlink.dto.response;

public record HospitalProfileResponse(
        Long id,
        String name,
        String type,
        Long cityId,
        String city,
        String region,
        String address,
        String website,
        String registrationNumber,
        String contact,
        String position,
        String email,
        String phone,
        String description,
        String workingHours,
        String verification,
        String registeredAt,
        String logoUrl,
        HospitalStatsResponse stats,
        int unreadNotifications
) {
}
