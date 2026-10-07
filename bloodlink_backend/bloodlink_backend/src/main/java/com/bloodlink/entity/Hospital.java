package com.bloodlink.entity;

import com.bloodlink.common.enums.HospitalVerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "hospitals")
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hospital_name", nullable = false)
    private String hospitalName;

    @Column(name = "registration_number", nullable = false, unique = true)
    private String registrationNumber;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String address;

    @Column(name = "city_id", nullable = false)
    private Long cityId;

    private String type;

    private String website;

    private String email;

    @Column(name = "contact_name")
    private String contactName;

    private String position;

    @Column(length = 2000)
    private String description;

    @Column(name = "working_hours")
    private String workingHours;

    @Column(name = "logo_file_name")
    private String logoFileName;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private HospitalVerificationStatus verificationStatus;

    @Column(name = "verification_reason", length = 1000)
    private String verificationReason;

    @Column(name = "approx_latitude")
    private Double approxLatitude;

    @Column(name = "approx_longitude")
    private Double approxLongitude;

    @OneToMany(mappedBy = "hospital")
    private List<User> users = new ArrayList<>();

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

    public String getHospitalName() {
        return hospitalName;
    }

    public void setHospitalName(String hospitalName) {
        this.hospitalName = hospitalName;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public void setRegistrationNumber(String registrationNumber) {
        this.registrationNumber = registrationNumber;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Long getCityId() {
        return cityId;
    }

    public void setCityId(Long cityId) {
        this.cityId = cityId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getWorkingHours() {
        return workingHours;
    }

    public void setWorkingHours(String workingHours) {
        this.workingHours = workingHours;
    }

    public String getLogoFileName() {
        return logoFileName;
    }

    public void setLogoFileName(String logoFileName) {
        this.logoFileName = logoFileName;
    }

    public HospitalVerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public void setVerificationStatus(HospitalVerificationStatus verificationStatus) {
        this.verificationStatus = verificationStatus;
    }

    public String getVerificationReason() {
        return verificationReason;
    }

    public void setVerificationReason(String verificationReason) {
        this.verificationReason = verificationReason;
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

    public List<User> getUsers() {
        return users;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
