package com.bloodlink.domain;

public final class MediaUrls {

    private MediaUrls() {
    }

    public static String hospitalLogo(Long hospitalId, String logoFileName) {
        if (hospitalId == null || logoFileName == null || logoFileName.isBlank()) {
            return null;
        }
        return "/api/v1/files/hospitals/" + hospitalId + "/logo";
    }

    public static String donorAvatar(Long donorId, String avatarFileName) {
        if (donorId == null || avatarFileName == null || avatarFileName.isBlank()) {
            return null;
        }
        return "/api/v1/files/donors/" + donorId + "/avatar";
    }
}
