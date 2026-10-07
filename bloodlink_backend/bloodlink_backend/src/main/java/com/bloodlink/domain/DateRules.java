package com.bloodlink.domain;

import com.bloodlink.exception.BusinessRuleException;
import com.bloodlink.common.ErrorCodes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

public final class DateRules {

    public static final int MIN_DONOR_AGE = 18;
    public static final int MAX_DONOR_AGE = 65;
    private static final LocalDate EARLIEST_BIRTH = LocalDate.of(1925, 1, 1);
    private static final LocalDate EARLIEST_DONATION = LocalDate.of(1980, 1, 1);

    private DateRules() {
    }

    public static LocalDate requireDateOfBirth(LocalDate dateOfBirth) {
        if (dateOfBirth == null) {
            throw new BusinessRuleException(ErrorCodes.DATE_OF_BIRTH_REQUIRED, "Date of birth is required");
        }
        LocalDate today = LocalDate.now();
        if (dateOfBirth.isAfter(today)) {
            throw new BusinessRuleException(ErrorCodes.DATE_OF_BIRTH_FUTURE, "Date of birth cannot be in the future");
        }
        if (dateOfBirth.isBefore(EARLIEST_BIRTH)) {
            throw new BusinessRuleException(ErrorCodes.INVALID_DATE_OF_BIRTH, "Date of birth is not valid");
        }
        int age = Period.between(dateOfBirth, today).getYears();
        if (age < 16) {
            throw new BusinessRuleException(ErrorCodes.AGE_BUSINESS_RULE, "Donor age must satisfy business rules");
        }
        if (age > 100) {
            throw new BusinessRuleException(ErrorCodes.INVALID_DATE_OF_BIRTH, "Date of birth is not valid");
        }
        return dateOfBirth;
    }

    public static LocalDate optionalDateOfBirth(LocalDate dateOfBirth) {
        return dateOfBirth == null ? null : requireDateOfBirth(dateOfBirth);
    }

    public static LocalDate optionalLastDonation(LocalDate lastDonation, LocalDate dateOfBirth) {
        if (lastDonation == null) {
            return null;
        }
        LocalDate today = LocalDate.now();
        if (lastDonation.isAfter(today)) {
            throw new BusinessRuleException(ErrorCodes.INVALID_DONATION_DATE, "Last donation date cannot be in the future");
        }
        if (lastDonation.isBefore(EARLIEST_DONATION)) {
            throw new BusinessRuleException(ErrorCodes.INVALID_DONATION_DATE, "Last donation date is not valid");
        }
        if (dateOfBirth != null && lastDonation.isBefore(dateOfBirth)) {
            throw new BusinessRuleException(ErrorCodes.DONATION_BEFORE_BIRTH, "Last donation date cannot be before date of birth");
        }
        return lastDonation;
    }

    public static boolean isPlausibleLastDonation(LocalDate lastDonation, LocalDate dateOfBirth) {
        if (lastDonation == null) {
            return true;
        }
        LocalDate today = LocalDate.now();
        if (lastDonation.isAfter(today) || lastDonation.isBefore(EARLIEST_DONATION)) {
            return false;
        }
        return dateOfBirth == null || !lastDonation.isBefore(dateOfBirth);
    }

    public static int ageYears(LocalDate dateOfBirth) {
        if (dateOfBirth == null) {
            return -1;
        }
        return Period.between(dateOfBirth, LocalDate.now()).getYears();
    }

    public static LocalDateTime requireFutureDateTime(LocalDateTime value) {
        if (value == null) {
            throw new BusinessRuleException(ErrorCodes.INVALID_DATETIME, "Required time is invalid");
        }
        if (!value.isAfter(LocalDateTime.now())) {
            throw new BusinessRuleException(ErrorCodes.REQUIRED_TIME_FUTURE, "Required time must be in the future");
        }
        return value;
    }
}
