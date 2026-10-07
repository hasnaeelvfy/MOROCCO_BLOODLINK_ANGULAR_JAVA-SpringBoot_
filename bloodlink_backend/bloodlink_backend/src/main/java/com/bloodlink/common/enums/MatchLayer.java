package com.bloodlink.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MatchLayer {
    CITY("city"),
    REGION("region"),
    NATIONAL("national");

    private final String json;

    MatchLayer(String json) {
        this.json = json;
    }

    @JsonValue
    public String json() {
        return json;
    }

    @JsonCreator
    public static MatchLayer from(String value) {
        if (value == null || value.isBlank()) {
            return CITY;
        }
        for (MatchLayer item : values()) {
            if (item.json.equalsIgnoreCase(value) || item.name().equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Unknown match layer");
    }
}
