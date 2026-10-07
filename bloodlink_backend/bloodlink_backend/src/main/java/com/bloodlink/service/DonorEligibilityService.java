package com.bloodlink.service;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.domain.DateRules;
import com.bloodlink.domain.InputRules;
import com.bloodlink.dto.request.EligibilityAnswersRequest;
import com.bloodlink.entity.Donor;
import com.bloodlink.exception.BusinessRuleException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class DonorEligibilityService {

    public static final int DONATION_INTERVAL_DAYS = 56;

    public Evaluation evaluate(Donor donor) {
        return evaluate(donor, null);
    }

    public Evaluation evaluate(Donor donor, EligibilityAnswersRequest answers) {
        List<String> blocking = new ArrayList<>();
        List<String> review = new ArrayList<>();

        Integer weight = answers != null && answers.weight() != null ? answers.weight() : donor.getWeightKg();
        LocalDate lastDonation = answers != null && answers.lastDonation() != null && !answers.lastDonation().isBlank()
                ? DateTimesSafe(answers.lastDonation())
                : donor.getLastDonation();
        LocalDate dateOfBirth = donor.getDateOfBirth();
        int age = DateRules.ageYears(dateOfBirth);

        if (dateOfBirth == null) {
            review.add("ELIGIBILITY_DOB_REQUIRED");
        } else if (age < DateRules.MIN_DONOR_AGE) {
            blocking.add("ELIGIBILITY_AGE_MIN");
        } else if (age > DateRules.MAX_DONOR_AGE) {
            blocking.add("ELIGIBILITY_AGE_MAX");
        }

        if (weight == null) {
            review.add("ELIGIBILITY_WEIGHT_REQUIRED");
        } else if (weight < InputRules.ELIGIBLE_MIN_WEIGHT_KG || weight > InputRules.MAX_WEIGHT_KG) {
            blocking.add("ELIGIBILITY_WEIGHT_RANGE");
        }

        Integer height = donor.getHeightCm();
        if (height == null) {
            review.add("ELIGIBILITY_HEIGHT_REQUIRED");
        } else if (height < InputRules.MIN_HEIGHT_CM || height > InputRules.MAX_HEIGHT_CM) {
            blocking.add("ELIGIBILITY_HEIGHT_RANGE");
        }

        if (!DateRules.isPlausibleLastDonation(lastDonation, dateOfBirth)) {
            blocking.add("ELIGIBILITY_DONATION_DATE_INVALID");
        } else if (lastDonation != null && lastDonation.plusDays(DONATION_INTERVAL_DAYS).isAfter(LocalDate.now())) {
            blocking.add("DONOR_NOT_ELIGIBLE");
        }

        boolean illness = answers != null ? answers.currentIllness() : donor.isFlagIllness();
        boolean surgery = answers != null ? answers.recentSurgery() : donor.isFlagSurgery();
        boolean pregnancy = answers != null ? answers.pregnancy() : donor.isFlagPregnancy();
        boolean medication = answers != null ? answers.medication() : donor.isFlagMedication();
        boolean travel = answers != null ? answers.recentTravel() : donor.isFlagTravel();
        String health = answers != null ? answers.generalHealth() : donor.getHealthStatus();
        if (health == null || health.isBlank()) {
            health = "good";
        }

        if (illness) {
            blocking.add("ELIGIBILITY_ILLNESS");
        }
        if (surgery) {
            blocking.add("ELIGIBILITY_SURGERY");
        }
        if (pregnancy) {
            blocking.add("ELIGIBILITY_PREGNANCY");
        }
        if ("poor".equalsIgnoreCase(health)) {
            blocking.add("ELIGIBILITY_HEALTH_POOR");
        }
        if (medication) {
            review.add("ELIGIBILITY_MEDICATION_REVIEW");
        }
        if (travel) {
            review.add("ELIGIBILITY_TRAVEL_REVIEW");
        }
        if ("fair".equalsIgnoreCase(health)) {
            review.add("ELIGIBILITY_HEALTH_FAIR");
        }

        EligibilityResult result = EligibilityResult.ELIGIBLE;
        List<String> reasons = new ArrayList<>();
        if (!blocking.isEmpty()) {
            result = EligibilityResult.INELIGIBLE;
            reasons.addAll(blocking);
        } else if (!review.isEmpty()) {
            result = EligibilityResult.REVIEW;
            reasons.addAll(review);
        }
        Integer ageValue = age >= 0 ? age : null;
        LocalDate nextEligible = lastDonation == null ? LocalDate.now() : lastDonation.plusDays(DONATION_INTERVAL_DAYS);
        if (nextEligible.isBefore(LocalDate.now())) {
            nextEligible = LocalDate.now();
        }
        return new Evaluation(result, ageValue, nextEligible, List.copyOf(reasons));
    }

    public boolean canBeInvited(Donor donor) {
        return evaluate(donor).result() != EligibilityResult.INELIGIBLE;
    }

    public void requireEligibleToAccept(Donor donor) {
        Evaluation evaluation = evaluate(donor);
        donor.setEligibility(evaluation.result());
        donor.setNextEligible(evaluation.nextEligible());
        if (evaluation.result() == EligibilityResult.INELIGIBLE) {
            throw new BusinessRuleException(
                    com.bloodlink.common.ErrorCodes.DONOR_NOT_ELIGIBLE,
                    evaluation.reasons().isEmpty()
                            ? "Donor is not currently eligible to donate"
                            : evaluation.reasons().get(0)
            );
        }
    }

    public Evaluation applyToDonor(Donor donor, EligibilityAnswersRequest answers) {
        if (answers != null) {
            if (answers.weight() != null) {
                donor.setWeightKg(InputRules.requireWeight(answers.weight()));
            }
            if (answers.lastDonation() != null && !answers.lastDonation().isBlank()) {
                LocalDate lastDonation = DateTimesSafe(answers.lastDonation());
                lastDonation = DateRules.optionalLastDonation(lastDonation, donor.getDateOfBirth());
                donor.setLastDonation(lastDonation);
            }
            donor.setHealthStatus(normalizeHealth(answers.generalHealth()));
            donor.setFlagIllness(answers.currentIllness());
            donor.setFlagMedication(answers.medication());
            donor.setFlagSurgery(answers.recentSurgery());
            donor.setFlagTravel(answers.recentTravel());
            donor.setFlagPregnancy(answers.pregnancy());
        }
        Evaluation evaluation = evaluate(donor);
        donor.setEligibility(evaluation.result());
        donor.setNextEligible(evaluation.nextEligible());
        return evaluation;
    }

    public Evaluation refresh(Donor donor) {
        return applyToDonor(donor, null);
    }

    public void applyAfterDonation(Donor donor, LocalDate donatedOn) {
        donor.setLastDonation(donatedOn);
        donor.setNextEligible(donatedOn.plusDays(DONATION_INTERVAL_DAYS));
        refresh(donor);
    }

    private static String normalizeHealth(String value) {
        if (value == null || value.isBlank()) {
            return "good";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!normalized.equals("good") && !normalized.equals("fair") && !normalized.equals("poor")) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_HEALTH_VALUE, "General health value is invalid");
        }
        return normalized;
    }

    private static LocalDate DateTimesSafe(String value) {
        return DateRules.optionalLastDonation(com.bloodlink.domain.DateTimes.parseDate(value), null);
    }

    public record Evaluation(
            EligibilityResult result,
            Integer age,
            LocalDate nextEligible,
            List<String> reasons
    ) {
    }
}
