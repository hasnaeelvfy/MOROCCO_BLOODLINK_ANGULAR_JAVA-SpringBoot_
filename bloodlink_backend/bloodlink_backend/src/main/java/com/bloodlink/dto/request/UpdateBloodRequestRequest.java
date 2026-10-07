package com.bloodlink.dto.request;

import com.bloodlink.common.enums.Urgency;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateBloodRequestRequest(
        String bloodType,
        @Min(1) @Max(20) Integer units,
        Urgency urgency,
        String neededBefore,
        String notes,
        String reference,
        String reason
) {
}
