package com.bloodlink.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PreferredContact {
    APP("app"),
    PHONE("phone"),
    EMAIL("email");

    private final String json;

    PreferredContact(String json) {
        this.json = json;
    }

    @JsonValue
    public String json() {
        return json;
    }

    @JsonCreator
    public static PreferredContact from(String value) {
        if (value == null || value.isBlank()) {
            return APP;
        }
        for (PreferredContact item : values()) {
            if (item.json.equalsIgnoreCase(value) || item.name().equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Unknown preferred contact");
    }
}
