package com.bloodlink.dto.response;

public record AccountSettingsResponse(
        String locale,
        boolean notifyInvitations,
        boolean notifyStatus,
        boolean notifyReminders
) {
}
