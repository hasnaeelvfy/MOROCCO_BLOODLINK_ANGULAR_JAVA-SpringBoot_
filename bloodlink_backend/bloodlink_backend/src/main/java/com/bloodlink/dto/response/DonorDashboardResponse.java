package com.bloodlink.dto.response;

import java.util.List;

public record DonorDashboardResponse(
        DonorProfileResponse profile,
        DonorStatsResponse stats,
        List<MatchResponse> pendingInvitations,
        List<NotificationResponse> recentNotifications
) {
}
