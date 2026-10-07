package com.bloodlink.dto.response;

import com.bloodlink.common.enums.MessageFrom;

public record MessageResponse(
        Long id,
        Long requestId,
        MessageFrom from,
        Long authorId,
        String text,
        String at
) {
}
