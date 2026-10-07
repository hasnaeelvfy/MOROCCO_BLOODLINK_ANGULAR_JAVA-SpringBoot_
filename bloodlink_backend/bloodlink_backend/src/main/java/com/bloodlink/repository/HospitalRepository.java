package com.bloodlink.repository;

import com.bloodlink.common.enums.HospitalVerificationStatus;
import com.bloodlink.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    Optional<Hospital> findByRegistrationNumber(String registrationNumber);

    boolean existsByRegistrationNumber(String registrationNumber);

    boolean existsByRegistrationNumberAndIdNot(String registrationNumber, Long id);

    long countByVerificationStatus(HospitalVerificationStatus status);
}
