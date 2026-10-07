package com.bloodlink.dto.response;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.common.enums.MatchLayer;
import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.common.enums.Urgency;

public record MatchResponse(
        Long id,
        Long requestId,
        Long hospitalId,
        Long donorId,
        String publicRequestCode,
        String donorPublicCode,
        String bloodType,
        Long cityId,
        String city,
        boolean available,
        EligibilityResult eligibility,
        Integer distanceKm,
        String compatibility,
        MatchLayer layer,
        MatchStatus status,
        String createdAt,
        String respondedAt,
        String acceptedAt,
        String contactedAt,
        String scheduledAt,
        String completedAt,
        String declineReason,
        String hospital,
        Integer units,
        Urgency urgency,
        String neededBefore,
        String donorName,
        String donorPhone,
        String donorCin,
        Integer matchScore,
        String matchScoreFormula,
        String hospitalLogoUrl
) {
}
