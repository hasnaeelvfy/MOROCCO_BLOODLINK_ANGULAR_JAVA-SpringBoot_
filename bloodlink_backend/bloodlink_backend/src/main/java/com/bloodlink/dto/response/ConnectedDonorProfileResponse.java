package com.bloodlink.dto.response;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.common.enums.MatchStatus;

import java.util.List;

public record ConnectedDonorProfileResponse(
        Long id,
        String publicCode,
        String fullName,
        String bloodType,
        String city,
        String region,
        EligibilityResult eligibility,
        String lastDonation,
        String nextEligible,
        String phone,
        String cin,
        String avatarUrl,
        long completedDonations,
        long acceptedRequests,
        Integer reliabilityPercent,
        String reliabilityFormula,
        MatchStatus currentMatchStatus,
        Long currentRequestId,
        List<DonationResponse> donationsWithThisHospital
) {
}
