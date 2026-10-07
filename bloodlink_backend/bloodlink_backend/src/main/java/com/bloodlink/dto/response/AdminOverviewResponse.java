package com.bloodlink.dto.response;

public record AdminOverviewResponse(
        long hospitals,
        long donors,
        long pendingVerifications,
        long activeRequests,
        long fulfilledRequests,
        long activeDonors,
        long eligibleDonors,
        long pendingHospitals,
        long verifiedHospitals,
        long rejectedHospitals,
        long suspendedHospitals,
        long cancelledRequests,
        long expiredRequests,
        long pendingMatches,
        long acceptedMatches,
        long completedDonations
) {
}
