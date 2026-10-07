package com.bloodlink.dto.response;

public record MatchCountsResponse(
        long total,
        long pending,
        long accepted,
        long declined,
        long closed,
        long completed
) {
}
