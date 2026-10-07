package com.bloodlink.service;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.domain.CityCatalog;
import com.bloodlink.domain.DateTimes;
import com.bloodlink.domain.MediaUrls;
import com.bloodlink.dto.response.BloodRequestResponse;
import com.bloodlink.dto.response.ConnectedDonorProfileResponse;
import com.bloodlink.dto.response.DonationResponse;
import com.bloodlink.dto.response.HospitalStatsResponse;
import com.bloodlink.dto.response.InstitutionProfileResponse;
import com.bloodlink.entity.BloodMatch;
import com.bloodlink.entity.Donor;
import com.bloodlink.entity.Hospital;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.BloodMatchRepository;
import com.bloodlink.repository.BloodRequestRepository;
import com.bloodlink.repository.DonationRepository;
import com.bloodlink.repository.DonorRepository;
import com.bloodlink.repository.HospitalRepository;
import com.bloodlink.security.CurrentAccess;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;

@Service
public class ProfileDirectoryService {

    public static final String RELIABILITY_FORMULA =
            "Completed donations ÷ accepted invitations × 100. Hidden until the donor has at least one accepted invitation.";

    private static final EnumSet<BloodRequestStatus> ACTIVE =
            EnumSet.of(BloodRequestStatus.SEARCHING, BloodRequestStatus.PARTIAL, BloodRequestStatus.PAUSED);

    private final CurrentAccess currentAccess;
    private final HospitalRepository hospitalRepository;
    private final DonorRepository donorRepository;
    private final BloodRequestRepository requestRepository;
    private final BloodMatchRepository matchRepository;
    private final DonationRepository donationRepository;
    private final BloodRequestService bloodRequestService;
    private final CityCatalog cityCatalog;

    public ProfileDirectoryService(
            CurrentAccess currentAccess,
            HospitalRepository hospitalRepository,
            DonorRepository donorRepository,
            BloodRequestRepository requestRepository,
            BloodMatchRepository matchRepository,
            DonationRepository donationRepository,
            BloodRequestService bloodRequestService,
            CityCatalog cityCatalog
    ) {
        this.currentAccess = currentAccess;
        this.hospitalRepository = hospitalRepository;
        this.donorRepository = donorRepository;
        this.requestRepository = requestRepository;
        this.matchRepository = matchRepository;
        this.donationRepository = donationRepository;
        this.bloodRequestService = bloodRequestService;
        this.cityCatalog = cityCatalog;
    }

    @Transactional(readOnly = true)
    public InstitutionProfileResponse hospitalForDonor(Long hospitalId) {
        currentAccess.requireDonor();
        Hospital hospital = hospitalRepository.findById(hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.HOSPITAL_NOT_FOUND, "Hospital was not found"));
        return toInstitution(hospital);
    }

    @Transactional(readOnly = true)
    public InstitutionProfileResponse ownInstitution() {
        return toInstitution(currentAccess.requireHospital());
    }

    @Transactional(readOnly = true)
    public ConnectedDonorProfileResponse donorForHospital(Long donorId) {
        Hospital hospital = currentAccess.requireHospital();
        if (!matchRepository.existsByBloodRequest_Hospital_IdAndDonor_IdAndStatusIn(
                hospital.getId(),
                donorId,
                java.util.EnumSet.of(
                        MatchStatus.ACCEPTED,
                        MatchStatus.CONTACTED,
                        MatchStatus.SCHEDULED,
                        MatchStatus.COMPLETED
                ))) {
            throw new AccessDeniedException("Donor details are available after the donor accepts your request");
        }
        Donor donor = donorRepository.findById(donorId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.DONOR_NOT_FOUND, "Donor was not found"));
        long completed = donationRepository.countByDonor_IdAndStatus(donor.getId(), com.bloodlink.common.enums.DonationStatus.COMPLETED);
        long accepted = matchRepository.countByDonor_IdAndStatusIn(
                donor.getId(),
                EnumSet.of(
                        MatchStatus.ACCEPTED,
                        MatchStatus.CONTACTED,
                        MatchStatus.SCHEDULED,
                        MatchStatus.COMPLETED
                ));
        BloodMatch latest = matchRepository
                .findFirstByBloodRequest_Hospital_IdAndDonor_IdAndStatusInOrderByRespondedAtDesc(
                        hospital.getId(),
                        donor.getId(),
                        EnumSet.of(
                                MatchStatus.ACCEPTED,
                                MatchStatus.CONTACTED,
                                MatchStatus.SCHEDULED,
                                MatchStatus.COMPLETED
                        ))
                .orElse(null);
        List<DonationResponse> donations = donationRepository
                .findByDonorIdAndHospitalId(donor.getId(), hospital.getId()).stream()
                .map(item -> com.bloodlink.domain.DonationViews.toResponse(item, cityCatalog))
                .toList();
        return new ConnectedDonorProfileResponse(
                donor.getId(),
                MatchingService.publicCode(donor.getId()),
                donor.getFirstName() + " " + donor.getLastName(),
                donor.getBloodType(),
                cityCatalog.nameOf(donor.getCityId()),
                cityCatalog.regionOf(donor.getCityId()),
                donor.getEligibility(),
                DateTimes.iso(donor.getLastDonation()),
                DateTimes.iso(donor.getNextEligible()),
                donor.getPhone(),
                donor.getCin(),
                MediaUrls.donorAvatar(donor.getId(), donor.getAvatarFileName()),
                completed,
                accepted,
                reliabilityPercent(completed, accepted),
                accepted > 0 ? RELIABILITY_FORMULA : null,
                latest == null ? null : latest.getStatus(),
                latest == null ? null : latest.getBloodRequest().getId(),
                donations
        );
    }

    public HospitalStatsResponse statsOf(Hospital hospital) {
        long total = requestRepository.countByHospital_Id(hospital.getId());
        long active = requestRepository.countByHospital_IdAndStatusIn(hospital.getId(), ACTIVE);
        long searching = requestRepository.countByHospital_IdAndStatus(hospital.getId(), BloodRequestStatus.SEARCHING);
        long fulfilled = requestRepository.countByHospital_IdAndStatus(hospital.getId(), BloodRequestStatus.FULFILLED);
        long cancelled = requestRepository.countByHospital_IdAndStatus(hospital.getId(), BloodRequestStatus.CANCELLED);
        long critical = requestRepository.findByHospitalId(hospital.getId()).stream()
                .filter(item -> ACTIVE.contains(item.getStatus())
                        && item.getUrgency() != null
                        && item.getUrgency().name().equals("CRITICAL"))
                .count();
        long responded = matchRepository.countByBloodRequest_Hospital_IdAndStatusIn(
                hospital.getId(),
                EnumSet.of(
                        MatchStatus.ACCEPTED,
                        MatchStatus.CONTACTED,
                        MatchStatus.SCHEDULED,
                        MatchStatus.COMPLETED,
                        MatchStatus.DECLINED
                )
        );
        long donations = donationRepository.countByHospital_IdAndStatus(hospital.getId(), com.bloodlink.common.enums.DonationStatus.COMPLETED);
        return new HospitalStatsResponse(total, active, critical, searching, fulfilled, responded, cancelled, donations);
    }

    public static Integer reliabilityPercent(long completedDonations, long acceptedRequests) {
        if (acceptedRequests <= 0) {
            return null;
        }
        return (int) Math.min(100, Math.round(100.0 * completedDonations / acceptedRequests));
    }

    private InstitutionProfileResponse toInstitution(Hospital hospital) {
        List<BloodRequestResponse> active = requestRepository.findByHospitalId(hospital.getId()).stream()
                .map(bloodRequestService::toResponse)
                .filter(item -> ACTIVE.contains(item.status()))
                .limit(8)
                .toList();
        List<String> groups = requestRepository.findByHospitalId(hospital.getId()).stream()
                .map(item -> item.getBloodType())
                .distinct()
                .toList();
        return new InstitutionProfileResponse(
                hospital.getId(),
                hospital.getHospitalName(),
                hospital.getType(),
                cityCatalog.nameOf(hospital.getCityId()),
                cityCatalog.regionOf(hospital.getCityId()),
                hospital.getAddress(),
                hospital.getPhone(),
                hospital.getEmail(),
                hospital.getWebsite(),
                hospital.getDescription(),
                hospital.getWorkingHours(),
                hospital.getRegistrationNumber(),
                hospital.getVerificationStatus().name().toLowerCase(),
                DateTimes.iso(hospital.getCreatedAt()),
                MediaUrls.hospitalLogo(hospital.getId(), hospital.getLogoFileName()),
                statsOf(hospital),
                groups,
                active
        );
    }
}
