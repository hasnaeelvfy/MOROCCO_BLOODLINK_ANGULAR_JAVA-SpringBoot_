package com.bloodlink.dto.request;

public record AccountSettingsRequest(
        String locale,
        Boolean notifyInvitations,
        Boolean notifyStatus,
        Boolean notifyReminders
) {
}
