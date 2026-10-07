package com.bloodlink.security;

import com.bloodlink.common.ErrorCodes;
import com.bloodlink.common.enums.HospitalVerificationStatus;
import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.entity.Donor;
import com.bloodlink.entity.Hospital;
import com.bloodlink.entity.User;
import com.bloodlink.exception.BusinessRuleException;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.DonorRepository;
import com.bloodlink.repository.HospitalRepository;
import com.bloodlink.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentAccess {

    private final HospitalRepository hospitalRepository;
    private final DonorRepository donorRepository;
    private final UserRepository userRepository;

    public CurrentAccess(
            HospitalRepository hospitalRepository,
            DonorRepository donorRepository,
            UserRepository userRepository
    ) {
        this.hospitalRepository = hospitalRepository;
        this.donorRepository = donorRepository;
        this.userRepository = userRepository;
    }

    public AuthUser requireAuth() {
        return SecurityUtils.currentUser();
    }

    @Transactional(readOnly = true)
    public Hospital requireHospital() {
        AuthUser auth = requireAuth();
        if (auth.role() != Role.HOSPITAL || auth.hospitalId() == null) {
            throw new AccessDeniedException("Hospital access required");
        }
        return hospitalRepository.findById(auth.hospitalId())
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.HOSPITAL_NOT_FOUND, "Hospital was not found"));
    }

    @Transactional(readOnly = true)
    public Hospital requireOperationalHospital() {
        Hospital hospital = requireHospital();
        if (hospital.getVerificationStatus() == HospitalVerificationStatus.PENDING) {
            throw new BusinessRuleException(ErrorCodes.HOSPITAL_NOT_VERIFIED, "Hospital verification is still pending");
        }
        if (hospital.getVerificationStatus() == HospitalVerificationStatus.REJECTED) {
            throw new BusinessRuleException(ErrorCodes.HOSPITAL_REJECTED, "Hospital verification was rejected");
        }
        if (hospital.getVerificationStatus() == HospitalVerificationStatus.SUSPENDED) {
            throw new BusinessRuleException(ErrorCodes.HOSPITAL_SUSPENDED, "This hospital account is suspended");
        }
        User user = requireUser();
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessRuleException(ErrorCodes.ACCOUNT_DEACTIVATED, "This account is deactivated");
        }
        return hospital;
    }

    @Transactional(readOnly = true)
    public Donor requireDonor() {
        AuthUser auth = requireAuth();
        if (auth.role() != Role.DONOR) {
            throw new AccessDeniedException("Donor access required");
        }
        return donorRepository.findByUser_Id(auth.userId())
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.DONOR_PROFILE_NOT_FOUND, "Donor profile was not found"));
    }

    @Transactional(readOnly = true)
    public User requireAdmin() {
        AuthUser auth = requireAuth();
        if (auth.role() != Role.ADMIN) {
            throw new AccessDeniedException("Admin access required");
        }
        return requireUser();
    }

    @Transactional(readOnly = true)
    public User requireUser() {
        AuthUser auth = requireAuth();
        return userRepository.findById(auth.userId())
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.USER_NOT_FOUND, "User was not found"));
    }
}
