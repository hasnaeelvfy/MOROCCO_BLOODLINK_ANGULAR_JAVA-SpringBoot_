package com.bloodlink.service;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.dto.request.EligibilityAnswersRequest;
import com.bloodlink.entity.Donor;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DonorEligibilityServiceTest {

    private final DonorEligibilityService service = new DonorEligibilityService();

    @Test
    void eligibleAdultWithWeightAndNoRecentDonation() {
        Donor donor = donor(LocalDate.now().minusYears(30), 62, null);
        DonorEligibilityService.Evaluation evaluation = service.evaluate(donor);
        assertThat(evaluation.result()).isEqualTo(EligibilityResult.ELIGIBLE);
        assertThat(evaluation.age()).isEqualTo(30);
        assertThat(evaluation.reasons()).isEmpty();
    }

    @Test
    void usesDateOfBirthNotClientAge() {
        Donor donor = donor(LocalDate.now().minusYears(16), 70, null);
        EligibilityAnswersRequest answers = new EligibilityAnswersRequest(
                28, 70, null, "good", false, false, false, false, false);
        DonorEligibilityService.Evaluation evaluation = service.evaluate(donor, answers);
        assertThat(evaluation.result()).isEqualTo(EligibilityResult.INELIGIBLE);
        assertThat(evaluation.reasons()).contains("ELIGIBILITY_AGE_MIN");
    }

    @Test
    void rejectsRecentDonationInterval() {
        Donor donor = donor(LocalDate.now().minusYears(28), 60, LocalDate.now().minusDays(10));
        DonorEligibilityService.Evaluation evaluation = service.evaluate(donor);
        assertThat(evaluation.result()).isEqualTo(EligibilityResult.INELIGIBLE);
        assertThat(evaluation.reasons()).isNotEmpty();
    }

    @Test
    void treatsImpossibleLastDonationAsBlocking() {
        Donor donor = donor(LocalDate.of(1996, 4, 12), 60, LocalDate.of(1026, 12, 12));
        DonorEligibilityService.Evaluation evaluation = service.evaluate(donor);
        assertThat(evaluation.result()).isEqualTo(EligibilityResult.INELIGIBLE);
        assertThat(evaluation.reasons()).contains("ELIGIBILITY_DONATION_DATE_INVALID");
    }

    @Test
    void healthFlagsCauseReviewOrIneligible() {
        Donor donor = donor(LocalDate.now().minusYears(40), 70, null);
        EligibilityAnswersRequest answers = new EligibilityAnswersRequest(
                40, 70, null, "fair", false, true, false, false, false);
        assertThat(service.evaluate(donor, answers).result()).isEqualTo(EligibilityResult.REVIEW);

        EligibilityAnswersRequest blocked = new EligibilityAnswersRequest(
                40, 70, null, "good", true, false, false, false, false);
        assertThat(service.evaluate(donor, blocked).result()).isEqualTo(EligibilityResult.INELIGIBLE);
    }

    private Donor donor(LocalDate dob, int weight, LocalDate lastDonation) {
        Donor donor = new Donor();
        donor.setDateOfBirth(dob);
        donor.setWeightKg(weight);
        donor.setHeightCm(170);
        donor.setLastDonation(lastDonation);
        donor.setHealthStatus("good");
        return donor;
    }
}
