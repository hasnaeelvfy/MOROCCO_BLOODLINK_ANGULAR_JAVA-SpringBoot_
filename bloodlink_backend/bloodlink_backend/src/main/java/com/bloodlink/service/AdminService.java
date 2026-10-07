package com.bloodlink.service;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.common.enums.DonationStatus;
import com.bloodlink.common.enums.EligibilityResult;
import com.bloodlink.common.enums.HospitalVerificationStatus;
import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.common.enums.NotificationKind;
import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.Urgency;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.domain.CityCatalog;
import com.bloodlink.domain.DateTimes;
import com.bloodlink.domain.DonationViews;
import com.bloodlink.domain.MediaUrls;
import com.bloodlink.dto.request.AdminReasonRequest;
import com.bloodlink.dto.response.AdminDonorSummaryResponse;
import com.bloodlink.dto.response.AdminHospitalSummaryResponse;
import com.bloodlink.dto.response.AdminNotificationResponse;
import com.bloodlink.dto.response.AdminOverviewResponse;
import com.bloodlink.dto.response.AdminUserSummaryResponse;
import com.bloodlink.dto.response.AuditLogResponse;
import com.bloodlink.dto.response.BloodRequestResponse;
import com.bloodlink.dto.response.DonationResponse;
import com.bloodlink.dto.response.MatchResponse;
import com.bloodlink.entity.BloodMatch;
import com.bloodlink.entity.BloodRequest;
import com.bloodlink.entity.Donation;
import com.bloodlink.entity.Donor;
import com.bloodlink.entity.Hospital;
import com.bloodlink.entity.User;
import com.bloodlink.exception.BusinessRuleException;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.BloodMatchRepository;
import com.bloodlink.repository.BloodRequestRepository;
import com.bloodlink.repository.DonationRepository;
import com.bloodlink.repository.DonorRepository;
import com.bloodlink.repository.HospitalRepository;
import com.bloodlink.repository.NotificationRepository;
import com.bloodlink.repository.UserRepository;
import com.bloodlink.security.CurrentAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final EnumSet<MatchStatus> ENGAGED = EnumSet.of(
            MatchStatus.ACCEPTED, MatchStatus.CONTACTED, MatchStatus.SCHEDULED, MatchStatus.COMPLETED
    );

    private final CurrentAccess currentAccess;
    private final HospitalRepository hospitalRepository;
    private final DonorRepository donorRepository;
    private final BloodRequestRepository requestRepository;
    private final BloodMatchRepository matchRepository;
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final BloodRequestService bloodRequestService;
    private final MatchingService matchingService;
    private final AuditService auditService;
    private final CityCatalog cityCatalog;

    public AdminService(
            CurrentAccess currentAccess,
            HospitalRepository hospitalRepository,
            DonorRepository donorRepository,
            BloodRequestRepository requestRepository,
            BloodMatchRepository matchRepository,
            DonationRepository donationRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            NotificationService notificationService,
            BloodRequestService bloodRequestService,
            MatchingService matchingService,
            AuditService auditService,
            CityCatalog cityCatalog
    ) {
        this.currentAccess = currentAccess;
        this.hospitalRepository = hospitalRepository;
        this.donorRepository = donorRepository;
        this.requestRepository = requestRepository;
        this.matchRepository = matchRepository;
        this.donationRepository = donationRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.bloodRequestService = bloodRequestService;
        this.matchingService = matchingService;
        this.auditService = auditService;
        this.cityCatalog = cityCatalog;
    }

    @Transactional(readOnly = true)
    public AdminOverviewResponse overview() {
        currentAccess.requireAdmin();
        long pending = hospitalRepository.countByVerificationStatus(HospitalVerificationStatus.PENDING);
        return new AdminOverviewResponse(
                hospitalRepository.count(),
                donorRepository.count(),
                pending,
                requestRepository.countByStatusIn(EnumSet.of(
                        BloodRequestStatus.SEARCHING, BloodRequestStatus.PARTIAL, BloodRequestStatus.PAUSED
                )),
                requestRepository.countByStatus(BloodRequestStatus.FULFILLED),
                userRepository.countByRoleAndStatus(Role.DONOR, UserStatus.ACTIVE),
                donorRepository.countByEligibility(EligibilityResult.ELIGIBLE),
                pending,
                hospitalRepository.countByVerificationStatus(HospitalVerificationStatus.VERIFIED),
                hospitalRepository.countByVerificationStatus(HospitalVerificationStatus.REJECTED),
                hospitalRepository.countByVerificationStatus(HospitalVerificationStatus.SUSPENDED),
                requestRepository.countByStatus(BloodRequestStatus.CANCELLED),
                requestRepository.countByStatus(BloodRequestStatus.EXPIRED),
                matchRepository.countByStatus(MatchStatus.PENDING),
                matchRepository.countByStatusIn(ENGAGED),
                donationRepository.countByStatus(DonationStatus.COMPLETED)
        );
    }

    @Transactional(readOnly = true)
    public List<AdminHospitalSummaryResponse> hospitals(String query, String verification) {
        currentAccess.requireAdmin();
        String q = normalize(query);
        HospitalVerificationStatus status = parseVerification(verification);
        return hospitalRepository.findAll().stream()
                .filter(item -> status == null || item.getVerificationStatus() == status)
                .filter(item -> q == null || contains(
                        q,
                        item.getHospitalName(),
                        item.getEmail(),
                        item.getRegistrationNumber(),
                        item.getPhone(),
                        cityCatalog.nameOf(item.getCityId())
                ))
                .map(this::toHospitalSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminHospitalSummaryResponse hospital(Long hospitalId) {
        currentAccess.requireAdmin();
        return toHospitalSummary(requireHospital(hospitalId));
    }

    @Transactional
    public AdminHospitalSummaryResponse verify(Long hospitalId) {
        return setHospitalStatus(hospitalId, HospitalVerificationStatus.VERIFIED, null, "Hospital verification approved");
    }

    @Transactional
    public AdminHospitalSummaryResponse reject(Long hospitalId, AdminReasonRequest request) {
        String reason = request == null ? null : request.reason();
        return setHospitalStatus(hospitalId, HospitalVerificationStatus.REJECTED, reason, "Hospital verification rejected");
    }

    @Transactional
    public AdminHospitalSummaryResponse suspendHospital(Long hospitalId, AdminReasonRequest request) {
        String reason = request == null ? null : request.reason();
        return setHospitalStatus(hospitalId, HospitalVerificationStatus.SUSPENDED, reason, "Hospital account suspended");
    }

    @Transactional
    public AdminHospitalSummaryResponse reactivateHospital(Long hospitalId) {
        currentAccess.requireAdmin();
        Hospital hospital = requireHospital(hospitalId);
        HospitalVerificationStatus next = hospital.getVerificationStatus() == HospitalVerificationStatus.REJECTED
                ? HospitalVerificationStatus.PENDING
                : HospitalVerificationStatus.VERIFIED;
        return setHospitalStatus(hospitalId, next, null, "Hospital account reactivated");
    }

    @Transactional(readOnly = true)
    public List<BloodRequestResponse> hospitalRequests(Long hospitalId) {
        currentAccess.requireAdmin();
        requireHospital(hospitalId);
        return requestRepository.findByHospitalId(hospitalId).stream()
                .map(bloodRequestService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminDonorSummaryResponse> donors(String query, String bloodType, String eligibility, String status) {
        currentAccess.requireAdmin();
        String q = normalize(query);
        EligibilityResult eligibilityFilter = parseEligibility(eligibility);
        UserStatus userStatus = parseUserStatus(status);
        return donorRepository.findAllWithUser().stream()
                .filter(item -> bloodType == null || bloodType.isBlank()
                        || Objects.equals(item.getBloodType(), bloodType.trim()))
                .filter(item -> eligibilityFilter == null || item.getEligibility() == eligibilityFilter)
                .filter(item -> userStatus == null || item.getUser().getStatus() == userStatus)
                .filter(item -> q == null || contains(
                        q,
                        item.getFirstName(),
                        item.getLastName(),
                        item.getUser().getEmail(),
                        item.getPhone(),
                        item.getCin(),
                        cityCatalog.nameOf(item.getCityId())
                ))
                .map(this::toDonorSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminDonorSummaryResponse donor(Long donorId) {
        currentAccess.requireAdmin();
        Donor donor = donorRepository.findById(donorId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.DONOR_NOT_FOUND, "Donor was not found"));
        return toDonorSummary(donor);
    }

    @Transactional
    public AdminDonorSummaryResponse setDonorStatus(Long donorId, UserStatus status) {
        currentAccess.requireAdmin();
        Donor donor = donorRepository.findById(donorId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.DONOR_NOT_FOUND, "Donor was not found"));
        User user = donor.getUser();
        protectAdmin(user);
        user.setStatus(status);
        auditService.record("DONOR_STATUS", "Donor", donor.getId(), status.name());
        notificationService.notifyUser(
                user,
                NotificationKind.STATUS,
                status == UserStatus.ACTIVE ? "Account reactivated" : "Account updated",
                "Your BloodLink donor account is now " + status.name().toLowerCase(Locale.ROOT) + ".",
                null,
                null
        );
        return toDonorSummary(donor);
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> donorHistory(Long donorId) {
        currentAccess.requireAdmin();
        return donationRepository.findByDonorId(donorId).stream()
                .map(item -> DonationViews.toResponse(item, cityCatalog))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BloodRequestResponse> requests(String query, String status, String bloodType, String urgency) {
        currentAccess.requireAdmin();
        String q = normalize(query);
        BloodRequestStatus statusFilter = parseRequestStatus(status);
        Urgency urgencyFilter = parseUrgency(urgency);
        return requestRepository.findAllWithHospital().stream()
                .filter(item -> statusFilter == null || item.getStatus() == statusFilter)
                .filter(item -> bloodType == null || bloodType.isBlank()
                        || Objects.equals(item.getBloodType(), bloodType.trim()))
                .filter(item -> urgencyFilter == null || item.getUrgency() == urgencyFilter)
                .filter(item -> q == null || contains(
                        q,
                        MatchingService.publicCode(item.getId()),
                        item.getHospital().getHospitalName(),
                        item.getBloodType(),
                        item.getReference()
                ))
                .map(bloodRequestService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BloodRequestResponse request(Long id) {
        currentAccess.requireAdmin();
        BloodRequest request = requestRepository.findWithHospitalById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        com.bloodlink.common.ErrorCodes.BLOOD_REQUEST_NOT_FOUND, "Blood request was not found"));
        return bloodRequestService.toResponse(request);
    }

    @Transactional
    public BloodRequestResponse cancelRequest(Long id, AdminReasonRequest request) {
        return bloodRequestService.cancelByAdmin(id, request == null ? null : request.reason());
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> matches(String query, String status) {
        currentAccess.requireAdmin();
        String q = normalize(query);
        MatchStatus statusFilter = parseMatchStatus(status);
        return matchRepository.findAllFetched().stream()
                .filter(item -> statusFilter == null || item.getStatus() == statusFilter)
                .filter(item -> q == null || contains(
                        q,
                        MatchingService.publicCode(item.getId()),
                        MatchingService.publicCode(item.getBloodRequest().getId()),
                        item.getDonor().getFirstName(),
                        item.getDonor().getLastName(),
                        item.getBloodRequest().getHospital().getHospitalName(),
                        item.getCompatibility()
                ))
                .map(matchingService::toAdminResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> requestMatches(Long requestId) {
        currentAccess.requireAdmin();
        return matchRepository.findByRequestId(requestId).stream()
                .map(matchingService::toAdminResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> donations(String query, Long donorId, Long hospitalId, String from, String to) {
        currentAccess.requireAdmin();
        String q = normalize(query);
        LocalDate fromDate = DateTimes.parseDate(from);
        LocalDate toDate = DateTimes.parseDate(to);
        return donationRepository.findAllFetched().stream()
                .filter(item -> donorId == null || item.getDonor().getId().equals(donorId))
                .filter(item -> hospitalId == null || item.getHospital().getId().equals(hospitalId))
                .filter(item -> fromDate == null || item.getDonatedOn() == null || !item.getDonatedOn().isBefore(fromDate))
                .filter(item -> toDate == null || item.getDonatedOn() == null || !item.getDonatedOn().isAfter(toDate))
                .filter(item -> q == null || contains(
                        q,
                        item.getHospital().getHospitalName(),
                        item.getDonor().getFirstName(),
                        item.getDonor().getLastName(),
                        item.getBloodType()
                ))
                .map(item -> DonationViews.toResponse(item, cityCatalog))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminUserSummaryResponse> users(String query, String role, String status) {
        currentAccess.requireAdmin();
        String q = normalize(query);
        Role roleFilter = parseRole(role);
        UserStatus statusFilter = parseUserStatus(status);
        Map<Long, Donor> donorsByUser = donorRepository.findAllWithUser().stream()
                .collect(Collectors.toMap(item -> item.getUser().getId(), item -> item, (a, b) -> a));
        return userRepository.findAllFetched().stream()
                .filter(item -> roleFilter == null || item.getRole() == roleFilter)
                .filter(item -> statusFilter == null || item.getStatus() == statusFilter)
                .filter(item -> q == null || contains(
                        q,
                        item.getEmail(),
                        item.getHospital() == null ? null : item.getHospital().getHospitalName(),
                        displayName(item, donorsByUser.get(item.getId()))
                ))
                .map(item -> toUserSummary(item, donorsByUser.get(item.getId())))
                .toList();
    }

    @Transactional
    public AdminUserSummaryResponse setUserStatus(Long userId, UserStatus status) {
        User actor = currentAccess.requireAdmin();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.USER_NOT_FOUND, "User was not found"));
        protectAdmin(user);
        if (user.getId().equals(actor.getId())) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.ADMIN_TARGET_PROTECTED, "You cannot change your own admin account status here");
        }
        user.setStatus(status);
        auditService.record("USER_STATUS", "User", user.getId(), status.name());
        notificationService.notifyUser(
                user,
                NotificationKind.STATUS,
                "Account status updated",
                "Your BloodLink account is now " + status.name().toLowerCase(Locale.ROOT) + ".",
                null,
                null
        );
        Donor donor = donorRepository.findByUser_Id(user.getId()).orElse(null);
        return toUserSummary(user, donor);
    }

    @Transactional(readOnly = true)
    public List<AdminNotificationResponse> notifications() {
        currentAccess.requireAdmin();
        return notificationRepository.findAllFetched().stream()
                .limit(200)
                .map(item -> new AdminNotificationResponse(
                        item.getId(),
                        item.getUser().getId(),
                        item.getUser().getEmail(),
                        item.getKind(),
                        item.getTitle(),
                        item.getBody(),
                        item.isRead(),
                        item.getRequestId(),
                        item.getMatchId(),
                        DateTimes.iso(item.getCreatedAt())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> audit() {
        return auditService.recent();
    }

    private AdminHospitalSummaryResponse setHospitalStatus(
            Long hospitalId,
            HospitalVerificationStatus status,
            String reason,
            String title
    ) {
        currentAccess.requireAdmin();
        Hospital hospital = requireHospital(hospitalId);
        if (hospital.getVerificationStatus() == status) {
            throw new BusinessRuleException(
                    com.bloodlink.common.ErrorCodes.VERIFICATION_STATUS_UNCHANGED,
                    "This hospital already has that verification status"
            );
        }
        hospital.setVerificationStatus(status);
        hospital.setVerificationReason(reason == null || reason.isBlank() ? null : reason.trim());
        String body = switch (status) {
            case VERIFIED -> "Your institution is now verified on BloodLink.";
            case REJECTED -> hospital.getVerificationReason() == null
                    ? "Your institution verification was rejected. Update your profile and wait for review."
                    : hospital.getVerificationReason();
            case SUSPENDED -> hospital.getVerificationReason() == null
                    ? "Your institution is suspended and cannot create blood requests."
                    : hospital.getVerificationReason();
            case PENDING -> "Your institution is pending review again.";
        };
        notificationService.notifyHospitalStaff(
                hospital.getId(),
                NotificationKind.VERIFICATION,
                title,
                body,
                null,
                null
        );
        auditService.record("HOSPITAL_" + status.name(), "Hospital", hospital.getId(), hospital.getVerificationReason());
        return toHospitalSummary(hospital);
    }

    private Hospital requireHospital(Long hospitalId) {
        return hospitalRepository.findById(hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.HOSPITAL_NOT_FOUND, "Hospital was not found"));
    }

    private void protectAdmin(User user) {
        if (user.getRole() == Role.ADMIN) {
            throw new BusinessRuleException(
                    com.bloodlink.common.ErrorCodes.ADMIN_TARGET_PROTECTED,
                    "Administrator accounts cannot be changed from this action"
            );
        }
    }

    private AdminHospitalSummaryResponse toHospitalSummary(Hospital hospital) {
        return new AdminHospitalSummaryResponse(
                hospital.getId(),
                hospital.getHospitalName(),
                hospital.getType(),
                cityCatalog.nameOf(hospital.getCityId()),
                hospital.getPhone(),
                hospital.getEmail(),
                hospital.getRegistrationNumber(),
                hospital.getVerificationStatus().name().toLowerCase(Locale.ROOT),
                hospital.getVerificationReason(),
                DateTimes.iso(hospital.getCreatedAt()),
                MediaUrls.hospitalLogo(hospital.getId(), hospital.getLogoFileName())
        );
    }

    private AdminDonorSummaryResponse toDonorSummary(Donor donor) {
        if (donor.getUser() == null) {
            donor = donorRepository.findById(donor.getId()).orElse(donor);
        }
        return new AdminDonorSummaryResponse(
                donor.getId(),
                donor.getUser().getId(),
                donor.getFirstName() + " " + donor.getLastName(),
                donor.getUser().getEmail(),
                donor.getPhone(),
                donor.getCin(),
                donor.getBloodType(),
                cityCatalog.nameOf(donor.getCityId()),
                donor.getEligibility(),
                DateTimes.iso(donor.getNextEligible()),
                donationRepository.countByDonor_IdAndStatus(donor.getId(), DonationStatus.COMPLETED),
                donor.getUser().getStatus(),
                donor.isAvailable()
        );
    }

    private AdminUserSummaryResponse toUserSummary(User user, Donor donor) {
        return new AdminUserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getStatus(),
                user.getHospital() == null ? null : user.getHospital().getId(),
                user.getHospital() == null ? null : user.getHospital().getHospitalName(),
                donor == null ? null : donor.getId(),
                displayName(user, donor),
                user.getLocale(),
                DateTimes.iso(user.getCreatedAt())
        );
    }

    private String displayName(User user, Donor donor) {
        if (donor != null) {
            return donor.getFirstName() + " " + donor.getLastName();
        }
        if (user.getHospital() != null) {
            return user.getHospital().getHospitalName();
        }
        return user.getEmail();
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean contains(String query, String... values) {
        for (String value : values) {
            if (value != null && value.toLowerCase(Locale.ROOT).contains(query)) {
                return true;
            }
        }
        return false;
    }

    private static HospitalVerificationStatus parseVerification(String value) {
        return parseEnum(HospitalVerificationStatus.class, value);
    }

    private static EligibilityResult parseEligibility(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return EligibilityResult.from(value);
        } catch (RuntimeException ex) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.VALIDATION_ERROR, "Invalid filter value");
        }
    }

    private static UserStatus parseUserStatus(String value) {
        return parseEnum(UserStatus.class, value);
    }

    private static BloodRequestStatus parseRequestStatus(String value) {
        return parseEnum(BloodRequestStatus.class, value);
    }

    private static Urgency parseUrgency(String value) {
        return parseEnum(Urgency.class, value);
    }

    private static MatchStatus parseMatchStatus(String value) {
        return parseEnum(MatchStatus.class, value);
    }

    private static Role parseRole(String value) {
        return parseEnum(Role.class, value);
    }

    private static <E extends Enum<E>> E parseEnum(Class<E> type, String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.VALIDATION_ERROR, "Invalid filter value");
        }
    }
}
