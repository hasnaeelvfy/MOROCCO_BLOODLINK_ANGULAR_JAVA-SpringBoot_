package com.bloodlink.dto.response;

import com.bloodlink.common.enums.DonationStatus;

public record DonationResponse(
        Long id,
        Long requestId,
        String publicRequestCode,
        String date,
        String bloodType,
        String hospital,
        String city,
        int units,
        DonationStatus status,
        String acceptedAt,
        String contactedAt,
        String scheduledAt,
        String completedAt,
        String cancellationReason
) {
}
