package com.bloodlink.dto.response;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.common.enums.UserStatus;

public record AdminDonorSummaryResponse(
        Long id,
        Long userId,
        String fullName,
        String email,
        String phone,
        String cin,
        String bloodType,
        String city,
        EligibilityResult eligibility,
        String nextEligible,
        long completedDonations,
        UserStatus status,
        boolean available
) {
}
