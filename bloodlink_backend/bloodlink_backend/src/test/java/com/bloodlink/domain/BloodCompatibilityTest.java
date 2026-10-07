package com.bloodlink.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BloodCompatibilityTest {

    @Test
    void normalizesUnicodeAndAsciiMinusToTheSameType() {
        assertThat(BloodTypes.normalize("AB\u2212")).isEqualTo("AB-");
        assertThat(BloodTypes.normalize("AB-")).isEqualTo("AB-");
        assertThat(BloodTypes.normalize("ab −")).isEqualTo("AB-");
        assertThat(BloodTypes.normalize("AB?")).isEqualTo("AB-");
        assertThat(BloodTypes.requireValid("AB\u2212")).isEqualTo("AB-");
    }

    @Test
    void exactAbMinusDonorMatchesAbMinusRequest() {
        assertThat(BloodCompatibility.canDonateTo("AB\u2212", "AB-")).isTrue();
        assertThat(BloodCompatibility.canDonateTo("AB-", "AB\u2212")).isTrue();
        assertThat(BloodCompatibility.label("AB\u2212", "AB-")).isEqualTo("Exact match");
    }

    @Test
    void oMinusCanDonateToAbMinus() {
        assertThat(BloodCompatibility.canDonateTo("O-", "AB-")).isTrue();
        assertThat(BloodCompatibility.label("O-", "AB-")).isEqualTo("Compatible");
    }

    @Test
    void abPlusCannotDonateToAbMinus() {
        assertThat(BloodCompatibility.canDonateTo("AB+", "AB-")).isFalse();
    }
}
