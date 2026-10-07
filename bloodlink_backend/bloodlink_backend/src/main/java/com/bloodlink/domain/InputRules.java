package com.bloodlink.domain;

import com.bloodlink.common.ErrorCodes;
import com.bloodlink.exception.BusinessRuleException;

import java.util.Locale;
import java.util.regex.Pattern;

public final class InputRules {

    private static final Pattern PERSON_NAME = Pattern.compile("^[\\p{L}][\\p{L} .'-]{0,78}[\\p{L}]$|^[\\p{L}]$");
    private static final Pattern HOSPITAL_NAME = Pattern.compile("^[\\p{L}0-9][\\p{L}0-9 .,'&()/-]{1,118}$");
    private static final Pattern PHONE = Pattern.compile("^\\+?[0-9]{8,15}$");
    private static final Pattern CIN = Pattern.compile("^[A-Z]{1,2}[A-Z0-9]{5,10}$");
    private static final Pattern EMAIL = Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern WEBSITE = Pattern.compile("^(https?://)?([A-Za-z0-9-]+\\.)+[A-Za-z]{2,}(/\\S*)?$");

    public static final int MIN_WEIGHT_KG = 45;
    public static final int MAX_WEIGHT_KG = 200;
    public static final int ELIGIBLE_MIN_WEIGHT_KG = 50;
    public static final int MIN_HEIGHT_CM = 140;
    public static final int MAX_HEIGHT_CM = 220;
    public static final int MAX_UNITS = 20;
    public static final int MAX_NOTES = 2000;

    private InputRules() {
    }

    public static String requirePersonName(String value, String field) {
        String trimmed = required(value, field);
        if (!PERSON_NAME.matcher(trimmed).matches() || trimmed.chars().anyMatch(Character::isDigit)) {
            throw new BusinessRuleException(ErrorCodes.INVALID_PERSON_NAME, field + " must contain letters only");
        }
        return trimmed;
    }

    public static String requireHospitalName(String value) {
        String trimmed = required(value, "Hospital name");
        if (!HOSPITAL_NAME.matcher(trimmed).matches()) {
            throw new BusinessRuleException(ErrorCodes.INVALID_HOSPITAL_NAME, "Hospital name format is invalid");
        }
        return trimmed;
    }

    public static String requirePhone(String value) {
        String compact = required(value, "Phone number").replace(" ", "");
        if (!PHONE.matcher(compact).matches()) {
            throw new BusinessRuleException(ErrorCodes.INVALID_PHONE, "Phone number format is invalid");
        }
        return compact;
    }

    public static String requireCin(String value) {
        String compact = required(value, "CIN").replace(" ", "").toUpperCase(Locale.ROOT);
        if (!CIN.matcher(compact).matches()) {
            throw new BusinessRuleException(ErrorCodes.INVALID_CIN, "CIN format is invalid");
        }
        return compact;
    }

    public static String optionalText(String value, int max, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() > max) {
            throw new BusinessRuleException(ErrorCodes.FIELD_TOO_LONG, field + " is too long");
        }
        return trimmed;
    }

    public static String optionalEmail(String value) {
        String trimmed = optionalText(value, 120, "Email");
        if (trimmed == null) {
            return null;
        }
        if (!EMAIL.matcher(trimmed).matches()) {
            throw new BusinessRuleException(ErrorCodes.INVALID_EMAIL, "Email format is invalid");
        }
        return trimmed.toLowerCase(Locale.ROOT);
    }

    public static String optionalWebsite(String value) {
        String trimmed = optionalText(value, 200, "Website");
        if (trimmed == null) {
            return null;
        }
        if (!WEBSITE.matcher(trimmed).matches()) {
            throw new BusinessRuleException(ErrorCodes.INVALID_WEBSITE, "Website format is invalid");
        }
        return trimmed;
    }

    public static int requireWeight(Integer weightKg) {
        if (weightKg == null) {
            throw new BusinessRuleException(ErrorCodes.WEIGHT_REQUIRED, "Weight is required");
        }
        if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
            throw new BusinessRuleException(ErrorCodes.INVALID_WEIGHT, "Weight must be within the allowed range");
        }
        return weightKg;
    }

    public static Integer optionalWeight(Integer weightKg) {
        if (weightKg == null) {
            return null;
        }
        return requireWeight(weightKg);
    }

    public static Integer optionalHeight(Integer heightCm) {
        if (heightCm == null) {
            return null;
        }
        if (heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
            throw new BusinessRuleException(ErrorCodes.INVALID_HEIGHT, "Height must be within the allowed range");
        }
        return heightCm;
    }

    public static int requireUnits(Integer units) {
        if (units == null || units < 1) {
            throw new BusinessRuleException(ErrorCodes.INVALID_UNITS, "At least one unit is required");
        }
        if (units > MAX_UNITS) {
            throw new BusinessRuleException(ErrorCodes.INVALID_UNITS, "Quantity must respect reasonable limits");
        }
        return units;
    }

    public static Double roundCoordinate(Double value, boolean latitude) {
        if (value == null) {
            return null;
        }
        double min = latitude ? -90 : -180;
        double max = latitude ? 90 : 180;
        if (value < min || value > max) {
            throw new BusinessRuleException(ErrorCodes.INVALID_COORDINATE, latitude ? "Latitude is invalid" : "Longitude is invalid");
        }
        return Math.round(value * 100.0) / 100.0;
    }

    public static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new BusinessRuleException(ErrorCodes.FIELD_REQUIRED, field + " is required");
        }
        return value.trim();
    }

    public static String requirePassword(String value) {
        String trimmed = required(value, "Password");
        if (trimmed.length() < 8 || trimmed.length() > 120) {
            throw new BusinessRuleException(ErrorCodes.PASSWORD_TOO_SHORT, "Password must be between 8 and 120 characters");
        }
        return trimmed;
    }

    public static String requireLocale(String value) {
        if (value == null || value.isBlank()) {
            return "ar-MA";
        }
        String normalized = value.trim();
        if (!normalized.equals("ar-MA") && !normalized.equals("fr") && !normalized.equals("en")) {
            throw new BusinessRuleException(ErrorCodes.INVALID_LOCALE, "Unsupported locale");
        }
        return normalized;
    }
}
