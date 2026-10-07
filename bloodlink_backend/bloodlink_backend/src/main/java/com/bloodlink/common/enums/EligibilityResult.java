package com.bloodlink.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EligibilityResult {
    ELIGIBLE("eligible"),
    REVIEW("review"),
    INELIGIBLE("ineligible");

    private final String json;

    EligibilityResult(String json) {
        this.json = json;
    }

    @JsonValue
    public String json() {
        return json;
    }

    @JsonCreator
    public static EligibilityResult from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (EligibilityResult item : values()) {
            if (item.json.equalsIgnoreCase(value) || item.name().equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Unknown eligibility result");
    }
}
