package com.bloodlink.dto.response;

import com.bloodlink.common.enums.EligibilityResult;

import java.util.List;

public record EligibilityResultResponse(
        EligibilityResult result,
        String nextEligible,
        Integer age,
        List<String> reasons
) {
}
