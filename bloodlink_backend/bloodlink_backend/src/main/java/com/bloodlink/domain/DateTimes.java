package com.bloodlink.domain;

import com.bloodlink.exception.BusinessRuleException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;

public final class DateTimes {

    private static final DateTimeFormatter FLEX = new DateTimeFormatterBuilder()
            .appendPattern("yyyy-MM-dd'T'HH:mm")
            .optionalStart()
            .appendPattern(":ss")
            .optionalEnd()
            .toFormatter();

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private DateTimes() {
    }

    public static LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.DATETIME_REQUIRED, "Date and time are required");
        }
        try {
            return LocalDateTime.parse(value.trim(), FLEX);
        } catch (DateTimeParseException ex) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_DATETIME, "Invalid date/time");
        }
    }

    public static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_DATETIME, "Invalid date");
        }
    }

    public static String iso(LocalDateTime value) {
        return value == null ? null : value.format(ISO);
    }

    public static String iso(LocalDate value) {
        return value == null ? null : value.toString();
    }
}
