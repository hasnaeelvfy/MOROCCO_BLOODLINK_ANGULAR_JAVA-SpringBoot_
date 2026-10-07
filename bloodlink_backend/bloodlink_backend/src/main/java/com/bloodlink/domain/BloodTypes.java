package com.bloodlink.domain;

import com.bloodlink.exception.BusinessRuleException;

import java.util.Locale;
import java.util.Set;

public final class BloodTypes {

    public static final Set<String> ALL = Set.of(
            "A+", "A-",
            "B+", "B-",
            "AB+", "AB-",
            "O+", "O-"
    );

    private BloodTypes() {
    }

    public static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String compact = value.trim().replace(" ", "").toUpperCase(Locale.ROOT)
                .replace('\u2212', '-')
                .replace('\u2013', '-')
                .replace('\u2014', '-')
                .replace('\u00AD', '-');
        if (compact.matches("(A|B|AB|O)\\?")) {
            compact = compact.substring(0, compact.length() - 1) + "-";
        }
        return compact.isEmpty() ? null : compact;
    }

    public static String requireValid(String value) {
        String normalized = normalize(value);
        if (normalized == null || !ALL.contains(normalized)) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_BLOOD_GROUP, "Invalid blood type");
        }
        return normalized;
    }
}
