package com.bloodlink.service;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.common.enums.Urgency;
import com.bloodlink.domain.CityCatalog;
import com.bloodlink.domain.DateTimes;
import com.bloodlink.domain.InputRules;
import com.bloodlink.domain.MediaUrls;
import com.bloodlink.dto.request.UpdateHospitalProfileRequest;
import com.bloodlink.dto.response.BloodRequestResponse;
import com.bloodlink.dto.response.HospitalDashboardResponse;
import com.bloodlink.dto.response.HospitalProfileResponse;
import com.bloodlink.dto.response.HospitalStatsResponse;
import com.bloodlink.dto.response.NotificationResponse;
import com.bloodlink.entity.Hospital;
import com.bloodlink.exception.ConflictException;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.BloodMatchRepository;
import com.bloodlink.repository.BloodRequestRepository;
import com.bloodlink.repository.HospitalRepository;
import com.bloodlink.security.CurrentAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.EnumSet;
import java.util.List;

@Service
public class HospitalPortalService {

    private static final EnumSet<BloodRequestStatus> ACTIVE =
            EnumSet.of(BloodRequestStatus.SEARCHING, BloodRequestStatus.PARTIAL, BloodRequestStatus.PAUSED);

    private final CurrentAccess currentAccess;
    private final HospitalRepository hospitalRepository;
    private final BloodRequestRepository requestRepository;
    private final BloodMatchRepository matchRepository;
    private final BloodRequestService bloodRequestService;
    private final NotificationService notificationService;
    private final ProfileDirectoryService profileDirectoryService;
    private final FileStorageService fileStorageService;
    private final CityCatalog cityCatalog;

    public HospitalPortalService(
            CurrentAccess currentAccess,
            HospitalRepository hospitalRepository,
            BloodRequestRepository requestRepository,
            BloodMatchRepository matchRepository,
            BloodRequestService bloodRequestService,
            NotificationService notificationService,
            ProfileDirectoryService profileDirectoryService,
            FileStorageService fileStorageService,
            CityCatalog cityCatalog
    ) {
        this.currentAccess = currentAccess;
        this.hospitalRepository = hospitalRepository;
        this.requestRepository = requestRepository;
        this.matchRepository = matchRepository;
        this.bloodRequestService = bloodRequestService;
        this.notificationService = notificationService;
        this.profileDirectoryService = profileDirectoryService;
        this.fileStorageService = fileStorageService;
        this.cityCatalog = cityCatalog;
    }

    @Transactional(readOnly = true)
    public HospitalProfileResponse profile() {
        return toProfile(currentAccess.requireHospital());
    }

    @Transactional
    public HospitalProfileResponse updateProfile(UpdateHospitalProfileRequest input) {
        Hospital hospital = currentAccess.requireHospital();
        if (!cityCatalog.isValid(input.cityId())) {
            throw new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.CITY_NOT_FOUND, "City was not found");
        }
        String registration = input.registrationNumber() == null ? null : input.registrationNumber().trim();
        if (registration != null && !registration.isEmpty()
                && hospitalRepository.existsByRegistrationNumberAndIdNot(registration, hospital.getId())) {
            throw new ConflictException(com.bloodlink.common.ErrorCodes.DUPLICATE_REGISTRATION, "Hospital registration number is already registered");
        }
        hospital.setHospitalName(InputRules.requireHospitalName(input.name()));
        hospital.setType(InputRules.optionalText(input.type(), 80, "Hospital type"));
        hospital.setEmail(InputRules.optionalEmail(input.email()));
        hospital.setPhone(InputRules.requirePhone(input.phone()));
        if (registration != null && !registration.isEmpty()) {
            hospital.setRegistrationNumber(registration);
        }
        hospital.setWebsite(InputRules.optionalWebsite(input.website()));
        hospital.setCityId(input.cityId());
        hospital.setAddress(InputRules.required(input.address(), "Address"));
        hospital.setContactName(blankToNull(input.contact()));
        hospital.setPosition(blankToNull(input.position()));
        hospital.setDescription(InputRules.optionalText(input.description(), 2000, "Description"));
        hospital.setWorkingHours(InputRules.optionalText(input.workingHours(), 255, "Working hours"));
        if (input.approxLatitude() != null && input.approxLongitude() != null) {
            hospital.setApproxLatitude(InputRules.roundCoordinate(input.approxLatitude(), true));
            hospital.setApproxLongitude(InputRules.roundCoordinate(input.approxLongitude(), false));
        }
        return toProfile(hospital);
    }

    @Transactional
    public HospitalProfileResponse uploadLogo(MultipartFile file) {
        Hospital hospital = currentAccess.requireHospital();
        String previous = hospital.getLogoFileName();
        hospital.setLogoFileName(fileStorageService.store("hospitals/" + hospital.getId(), file));
        fileStorageService.deleteQuietly(previous);
        return toProfile(hospital);
    }

    @Transactional
    public HospitalDashboardResponse dashboard() {
        Hospital hospital = currentAccess.requireHospital();
        List<BloodRequestResponse> requests = requestRepository.findByHospitalId(hospital.getId()).stream()
                .map(bloodRequestService::toResponse)
                .toList();
        long active = requests.stream().filter(item -> ACTIVE.contains(item.status())).count();
        long critical = requests.stream()
                .filter(item -> ACTIVE.contains(item.status()) && item.urgency() == Urgency.CRITICAL)
                .count();
        long pending = requests.stream().filter(item -> item.status() == BloodRequestStatus.SEARCHING).count();
        long fulfilled = requests.stream().filter(item -> item.status() == BloodRequestStatus.FULFILLED).count();
        long cancelled = requests.stream().filter(item -> item.status() == BloodRequestStatus.CANCELLED).count();
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
        List<NotificationResponse> notes = notificationService.mine();
        HospitalStatsResponse stats = profileDirectoryService.statsOf(hospital);
        if (stats.totalRequests() == 0 && !requests.isEmpty()) {
            stats = new HospitalStatsResponse(
                    requests.size(),
                    active,
                    critical,
                    pending,
                    fulfilled,
                    responded,
                    cancelled,
                    stats.completedDonations()
            );
        }
        return new HospitalDashboardResponse(
                hospital.getHospitalName(),
                cityCatalog.nameOf(hospital.getCityId()),
                cityCatalog.regionOf(hospital.getCityId()),
                hospital.getVerificationStatus().name().toLowerCase(),
                stats,
                requests.stream().limit(6).toList(),
                notes.stream().limit(5).toList()
        );
    }

    public HospitalProfileResponse toProfile(Hospital hospital) {
        return new HospitalProfileResponse(
                hospital.getId(),
                hospital.getHospitalName(),
                hospital.getType(),
                hospital.getCityId(),
                cityCatalog.nameOf(hospital.getCityId()),
                cityCatalog.regionOf(hospital.getCityId()),
                hospital.getAddress(),
                hospital.getWebsite(),
                hospital.getRegistrationNumber(),
                hospital.getContactName(),
                hospital.getPosition(),
                hospital.getEmail(),
                hospital.getPhone(),
                hospital.getDescription(),
                hospital.getWorkingHours(),
                hospital.getVerificationStatus().name().toLowerCase(),
                DateTimes.iso(hospital.getCreatedAt()),
                MediaUrls.hospitalLogo(hospital.getId(), hospital.getLogoFileName()),
                profileDirectoryService.statsOf(hospital),
                (int) notificationService.unreadCount()
        );
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
