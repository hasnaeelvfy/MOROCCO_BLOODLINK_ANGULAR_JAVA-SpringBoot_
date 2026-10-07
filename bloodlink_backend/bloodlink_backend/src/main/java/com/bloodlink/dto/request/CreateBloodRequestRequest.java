package com.bloodlink.dto.request;

import com.bloodlink.common.enums.Urgency;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateBloodRequestRequest(
        @NotBlank String bloodType,
        @NotNull @Min(1) @Max(20) Integer units,
        @NotNull Urgency urgency,
        @NotBlank String neededBefore,
        @Size(max = 2000) String notes,
        @Size(max = 80) String reference,
        @Size(max = 160) String reason,
        @Size(max = 80) String contactName,
        @Size(max = 20) String contactPhone,
        @Size(max = 40) String contactMethod
) {
}
