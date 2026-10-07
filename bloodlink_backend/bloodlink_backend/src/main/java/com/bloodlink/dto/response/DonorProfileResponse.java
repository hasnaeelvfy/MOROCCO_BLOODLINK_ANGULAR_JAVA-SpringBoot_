package com.bloodlink.dto.response;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.common.enums.PreferredContact;

public record DonorProfileResponse(
        Long id,
        Long userId,
        String firstName,
        String lastName,
        String phone,
        String email,
        String cin,
        Long cityId,
        String city,
        String region,
        String bloodType,
        boolean available,
        String lastDonation,
        String nextEligible,
        EligibilityResult eligibility,
        String dateOfBirth,
        Integer age,
        Integer weightKg,
        Integer heightCm,
        boolean locationConsent,
        boolean locationRecorded,
        Double approxLatitude,
        Double approxLongitude,
        PreferredContact preferredContact,
        int completion,
        int unreadNotifications,
        String avatarUrl,
        String registeredAt,
        long completedDonations,
        long acceptedRequests,
        long declinedRequests,
        Integer reliabilityPercent,
        String reliabilityFormula
) {
}
