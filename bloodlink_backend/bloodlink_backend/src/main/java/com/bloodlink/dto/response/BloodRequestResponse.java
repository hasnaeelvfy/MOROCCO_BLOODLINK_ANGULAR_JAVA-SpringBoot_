package com.bloodlink.dto.response;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.common.enums.MatchLayer;
import com.bloodlink.common.enums.Urgency;

public record BloodRequestResponse(
        Long id,
        String publicCode,
        Long hospitalId,
        String hospital,
        Long cityId,
        String city,
        String region,
        String bloodType,
        int units,
        int unitsFulfilled,
        int unitsRemaining,
        Urgency urgency,
        String neededBefore,
        String contactName,
        String contactPhone,
        String contactMethod,
        String notes,
        String reference,
        String reason,
        BloodRequestStatus status,
        String displayStatus,
        boolean editable,
        MatchLayer expansion,
        String createdAt,
        String updatedAt,
        MatchCountsResponse matchCounts
) {
}
