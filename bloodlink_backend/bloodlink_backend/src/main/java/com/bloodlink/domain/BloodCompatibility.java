package com.bloodlink.domain;

import java.util.List;
import java.util.Map;

public final class BloodCompatibility {

    private static final Map<String, List<String>> CAN_RECEIVE = Map.of(
            "O-", List.of("O-"),
            "O+", List.of("O-", "O+"),
            "A-", List.of("O-", "A-"),
            "A+", List.of("O-", "O+", "A-", "A+"),
            "B-", List.of("O-", "B-"),
            "B+", List.of("O-", "O+", "B-", "B+"),
            "AB-", List.of("O-", "A-", "B-", "AB-"),
            "AB+", List.of("O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+")
    );

    private BloodCompatibility() {
    }

    public static boolean canDonateTo(String donorType, String requestType) {
        String donor = BloodTypes.normalize(donorType);
        String request = BloodTypes.normalize(requestType);
        if (donor == null || request == null) {
            return false;
        }
        List<String> allowed = CAN_RECEIVE.get(request);
        return allowed != null && allowed.contains(donor);
    }

    public static String label(String donorType, String requestType) {
        String donor = BloodTypes.normalize(donorType);
        String request = BloodTypes.normalize(requestType);
        if (donor == null || request == null || !canDonateTo(donor, request)) {
            return "Incompatible";
        }
        return donor.equals(request) ? "Exact match" : "Compatible";
    }
}
