package com.bloodlink.dto.response;

import java.util.List;

public record HospitalDashboardResponse(
        String hospitalName,
        String city,
        String region,
        String verification,
        HospitalStatsResponse stats,
        List<BloodRequestResponse> recentRequests,
        List<NotificationResponse> recentNotifications
) {
}
