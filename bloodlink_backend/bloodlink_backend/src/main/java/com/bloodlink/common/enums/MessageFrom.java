package com.bloodlink.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MessageFrom {
    DONOR("donor"),
    HOSPITAL("hospital");

    private final String json;

    MessageFrom(String json) {
        this.json = json;
    }

    @JsonValue
    public String json() {
        return json;
    }

    @JsonCreator
    public static MessageFrom from(String value) {
        if (value == null || value.isBlank()) {
            return HOSPITAL;
        }
        for (MessageFrom item : values()) {
            if (item.json.equalsIgnoreCase(value) || item.name().equalsIgnoreCase(value)) {
                return item;
            }
        }
        throw new IllegalArgumentException("Unknown message sender");
    }
}
