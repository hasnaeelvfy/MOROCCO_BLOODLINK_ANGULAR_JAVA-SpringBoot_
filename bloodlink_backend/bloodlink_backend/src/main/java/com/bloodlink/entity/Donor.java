package com.bloodlink.entity;

import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.common.enums.PreferredContact;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "donors")
public class Donor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false, unique = true)
    private String cin;

    @Column(name = "city_id", nullable = false)
    private Long cityId;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(nullable = false)
    private boolean available = false;

    @Column(name = "last_donation")
    private LocalDate lastDonation;

    @Column(name = "next_eligible")
    private LocalDate nextEligible;

    @Enumerated(EnumType.STRING)
    private EligibilityResult eligibility;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "weight_kg")
    private Integer weightKg;

    @Column(name = "height_cm")
    private Integer heightCm;

    @Column(name = "approx_latitude")
    private Double approxLatitude;

    @Column(name = "approx_longitude")
    private Double approxLongitude;

    @Column(name = "health_status")
    private String healthStatus = "good";

    @Column(name = "flag_illness", nullable = false)
    private boolean flagIllness = false;

    @Column(name = "flag_medication", nullable = false)
    private boolean flagMedication = false;

    @Column(name = "flag_surgery", nullable = false)
    private boolean flagSurgery = false;

    @Column(name = "flag_travel", nullable = false)
    private boolean flagTravel = false;

    @Column(name = "flag_pregnancy", nullable = false)
    private boolean flagPregnancy = false;

    @Column(name = "avatar_file_name")
    private String avatarFileName;

    @Column(name = "location_consent", nullable = false)
    private boolean locationConsent = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_contact")
    private PreferredContact preferredContact = PreferredContact.APP;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getCin() {
        return cin;
    }

    public void setCin(String cin) {
        this.cin = cin;
    }

    public Long getCityId() {
        return cityId;
    }

    public void setCityId(Long cityId) {
        this.cityId = cityId;
    }

    public String getBloodType() {
        return bloodType;
    }

    public void setBloodType(String bloodType) {
        this.bloodType = bloodType;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    public LocalDate getLastDonation() {
        return lastDonation;
    }

    public void setLastDonation(LocalDate lastDonation) {
        this.lastDonation = lastDonation;
    }

    public LocalDate getNextEligible() {
        return nextEligible;
    }

    public void setNextEligible(LocalDate nextEligible) {
        this.nextEligible = nextEligible;
    }

    public EligibilityResult getEligibility() {
        return eligibility;
    }

    public void setEligibility(EligibilityResult eligibility) {
        this.eligibility = eligibility;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public Integer getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Integer weightKg) {
        this.weightKg = weightKg;
    }

    public Integer getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(Integer heightCm) {
        this.heightCm = heightCm;
    }

    public Double getApproxLatitude() {
        return approxLatitude;
    }

    public void setApproxLatitude(Double approxLatitude) {
        this.approxLatitude = approxLatitude;
    }

    public Double getApproxLongitude() {
        return approxLongitude;
    }

    public void setApproxLongitude(Double approxLongitude) {
        this.approxLongitude = approxLongitude;
    }

    public String getHealthStatus() {
        return healthStatus;
    }

    public void setHealthStatus(String healthStatus) {
        this.healthStatus = healthStatus;
    }

    public boolean isFlagIllness() {
        return flagIllness;
    }

    public void setFlagIllness(boolean flagIllness) {
        this.flagIllness = flagIllness;
    }

    public boolean isFlagMedication() {
        return flagMedication;
    }

    public void setFlagMedication(boolean flagMedication) {
        this.flagMedication = flagMedication;
    }

    public boolean isFlagSurgery() {
        return flagSurgery;
    }

    public void setFlagSurgery(boolean flagSurgery) {
        this.flagSurgery = flagSurgery;
    }

    public boolean isFlagTravel() {
        return flagTravel;
    }

    public void setFlagTravel(boolean flagTravel) {
        this.flagTravel = flagTravel;
    }

    public boolean isFlagPregnancy() {
        return flagPregnancy;
    }

    public void setFlagPregnancy(boolean flagPregnancy) {
        this.flagPregnancy = flagPregnancy;
    }

    public boolean isLocationConsent() {
        return locationConsent;
    }

    public void setLocationConsent(boolean locationConsent) {
        this.locationConsent = locationConsent;
    }

    public PreferredContact getPreferredContact() {
        return preferredContact;
    }

    public void setPreferredContact(PreferredContact preferredContact) {
        this.preferredContact = preferredContact;
    }

    public String getAvatarFileName() {
        return avatarFileName;
    }

    public void setAvatarFileName(String avatarFileName) {
        this.avatarFileName = avatarFileName;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
