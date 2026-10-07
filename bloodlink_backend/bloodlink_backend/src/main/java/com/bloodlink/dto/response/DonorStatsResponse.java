package com.bloodlink.dto.response;

public record DonorStatsResponse(
        long pendingInvitations,
        long accepted,
        long donations,
        long availableRequests,
        long urgentRequests
) {
}
