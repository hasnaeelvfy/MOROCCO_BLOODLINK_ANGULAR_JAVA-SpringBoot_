package com.bloodlink.domain;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.common.enums.MatchLayer;
import com.bloodlink.common.enums.Urgency;
import com.bloodlink.entity.BloodRequest;
import com.bloodlink.entity.Donor;

public final class MatchRanking {

    public static final String FORMULA =
            "Exact blood type 35, compatible 22; eligibility ELIGIBLE 20 / REVIEW 10 / unknown 6 / INELIGIBLE 0; "
                    + "available 10; urgency CRITICAL 15 / URGENT 10 / STANDARD 4; "
                    + "GPS under 15km 15 / 50km 10 / 150km 5, otherwise CITY 12 / REGION 6 / NATIONAL 2. Maximum 100.";

    private MatchRanking() {
    }

    public static int score(Donor donor, BloodRequest request, MatchLayer layer, Integer distanceKm) {
        int score = 0;
        String donorType = BloodTypes.normalize(donor.getBloodType());
        String requestType = BloodTypes.normalize(request.getBloodType());
        if (donorType != null && donorType.equals(requestType)) {
            score += 35;
        } else if (BloodCompatibility.canDonateTo(donor.getBloodType(), request.getBloodType())) {
            score += 22;
        }

        if (donor.getEligibility() == EligibilityResult.ELIGIBLE) {
            score += 20;
        } else if (donor.getEligibility() == EligibilityResult.REVIEW) {
            score += 10;
        } else if (donor.getEligibility() == null) {
            score += 6;
        }

        if (donor.isAvailable()) {
            score += 10;
        }

        if (request.getUrgency() == Urgency.CRITICAL) {
            score += 15;
        } else if (request.getUrgency() == Urgency.URGENT) {
            score += 10;
        } else {
            score += 4;
        }

        if (distanceKm != null) {
            if (distanceKm <= 15) {
                score += 15;
            } else if (distanceKm <= 50) {
                score += 10;
            } else if (distanceKm <= 150) {
                score += 5;
            }
        } else if (layer == MatchLayer.CITY) {
            score += 12;
        } else if (layer == MatchLayer.REGION) {
            score += 6;
        } else {
            score += 2;
        }
        return Math.min(100, score);
    }

    public static int score(Donor donor, BloodRequest request, MatchLayer layer) {
        return score(donor, request, layer, null);
    }
}
