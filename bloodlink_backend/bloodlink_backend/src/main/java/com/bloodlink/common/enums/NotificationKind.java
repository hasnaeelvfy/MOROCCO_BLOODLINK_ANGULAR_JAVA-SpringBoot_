package com.bloodlink.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum NotificationKind {
    INVITATION("invitation"),
    ACCEPTED("accepted"),
    DECLINED("declined"),
    CANCELLED("cancelled"),
    REMINDER("reminder"),
    ELIGIBILITY("eligibility"),
    STATUS("status"),
    VERIFICATION("verification");

    private final String json;

    NotificationKind(String json) {
        this.json = json;
    }

    @JsonValue
    public String json() {
        return json;
    }

    @JsonCreator
    public static NotificationKind from(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        for (NotificationKind item : values()) {
            if (item.json.equalsIgnoreCase(value) || item.name().equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Unknown notification kind");
    }
}
