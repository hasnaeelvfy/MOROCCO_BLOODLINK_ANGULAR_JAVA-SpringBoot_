package com.bloodlink.dto.response;

public record HospitalStatsResponse(
        long totalRequests,
        long activeRequests,
        long criticalRequests,
        long pendingRequests,
        long fulfilledRequests,
        long donorsResponded,
        long cancelledRequests,
        long completedDonations
) {
}
