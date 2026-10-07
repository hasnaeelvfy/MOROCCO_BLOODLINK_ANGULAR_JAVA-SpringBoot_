package com.bloodlink.dto.response;

import com.bloodlink.common.enums.Urgency;

public record PublicBloodRequestResponse(
        Long id,
        String publicCode,
        String bloodType,
        int units,
        String city,
        Urgency urgency,
        String status,
        String displayStatus
) {
}
