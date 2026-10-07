package com.bloodlink.dto.request;

public record CancelMatchRequest(
        String reason,
        Boolean noShow
) {
}
