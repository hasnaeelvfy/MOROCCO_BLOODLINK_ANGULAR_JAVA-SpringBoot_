package com.bloodlink.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DonationStatus {
    COMPLETED("completed"),
    SCHEDULED("scheduled"),
    CANCELLED("cancelled"),
    NO_SHOW("no_show"),
    RECORDED("recorded");

    private final String json;

    DonationStatus(String json) {
        this.json = json;
    }

    @JsonValue
    public String json() {
        return json;
    }

    @JsonCreator
    public static DonationStatus from(String value) {
        if (value == null || value.isBlank()) {
            return COMPLETED;
        }
        for (DonationStatus item : values()) {
            if (item.json.equalsIgnoreCase(value) || item.name().equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Unknown donation status");
    }
}
