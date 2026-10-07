package com.bloodlink.service;

import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.common.enums.NotificationKind;
import com.bloodlink.common.enums.PreferredContact;
import com.bloodlink.common.enums.Urgency;
import com.bloodlink.domain.BloodTypes;
import com.bloodlink.domain.CityCatalog;
import com.bloodlink.domain.DateRules;
import com.bloodlink.domain.DateTimes;
import com.bloodlink.domain.InputRules;
import com.bloodlink.domain.MediaUrls;
import com.bloodlink.dto.request.AvailabilityRequest;
import com.bloodlink.dto.request.EligibilityAnswersRequest;
import com.bloodlink.dto.request.UpdateDonorProfileRequest;
import com.bloodlink.dto.response.DonationResponse;
import com.bloodlink.dto.response.DonorDashboardResponse;
import com.bloodlink.dto.response.DonorProfileResponse;
import com.bloodlink.dto.response.DonorStatsResponse;
import com.bloodlink.dto.response.EligibilityResultResponse;
import com.bloodlink.dto.response.MatchResponse;
import com.bloodlink.dto.response.NotificationResponse;
import com.bloodlink.entity.Donor;
import com.bloodlink.exception.ConflictException;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.BloodMatchRepository;
import com.bloodlink.repository.DonationRepository;
import com.bloodlink.repository.DonorRepository;
import com.bloodlink.security.CurrentAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@Service
public class DonorPortalService {

    private final CurrentAccess currentAccess;
    private final DonorRepository donorRepository;
    private final BloodMatchRepository matchRepository;
    private final DonationRepository donationRepository;
    private final MatchingService matchingService;
    private final DonorEligibilityService eligibilityService;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;
    private final CityCatalog cityCatalog;

    public DonorPortalService(
            CurrentAccess currentAccess,
            DonorRepository donorRepository,
            BloodMatchRepository matchRepository,
            DonationRepository donationRepository,
            MatchingService matchingService,
            DonorEligibilityService eligibilityService,
            NotificationService notificationService,
            FileStorageService fileStorageService,
            CityCatalog cityCatalog
    ) {
        this.currentAccess = currentAccess;
        this.donorRepository = donorRepository;
        this.matchRepository = matchRepository;
        this.donationRepository = donationRepository;
        this.matchingService = matchingService;
        this.eligibilityService = eligibilityService;
        this.notificationService = notificationService;
        this.fileStorageService = fileStorageService;
        this.cityCatalog = cityCatalog;
    }

    @Transactional(readOnly = true)
    public DonorProfileResponse profile() {
        return toProfile(currentAccess.requireDonor());
    }

    @Transactional
    public DonorProfileResponse updateProfile(UpdateDonorProfileRequest input) {
        Donor donor = currentAccess.requireDonor();
        if (!cityCatalog.isValid(input.cityId())) {
            throw new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.CITY_NOT_FOUND, "City was not found");
        }
        String cin = InputRules.requireCin(input.cin());
        if (donorRepository.existsByCinAndIdNot(cin, donor.getId())) {
            throw new ConflictException(com.bloodlink.common.ErrorCodes.DUPLICATE_CIN, "CIN is already registered");
        }
        donor.setFirstName(InputRules.requirePersonName(input.firstName(), "First name"));
        donor.setLastName(InputRules.requirePersonName(input.lastName(), "Last name"));
        donor.setPhone(InputRules.requirePhone(input.phone()));
        donor.setCin(cin);
        donor.setCityId(input.cityId());
        if (input.bloodType() != null && !input.bloodType().isBlank()) {
            donor.setBloodType(BloodTypes.requireValid(input.bloodType()));
            donor.setAvailable(true);
        }
        LocalDate dateOfBirth = DateRules.optionalDateOfBirth(DateTimes.parseDate(input.dateOfBirth()));
        donor.setDateOfBirth(dateOfBirth);
        donor.setWeightKg(InputRules.optionalWeight(input.weightKg()));
        donor.setHeightCm(InputRules.optionalHeight(input.heightCm()));
        if (input.lastDonation() != null) {
            LocalDate lastDonation = DateRules.optionalLastDonation(DateTimes.parseDate(input.lastDonation()), dateOfBirth);
            donor.setLastDonation(lastDonation);
            donor.setNextEligible(lastDonation == null ? donor.getNextEligible() : lastDonation.plusDays(DonorEligibilityService.DONATION_INTERVAL_DAYS));
        }
        if (input.preferredContact() != null) {
            donor.setPreferredContact(PreferredContact.from(input.preferredContact()));
        }
        if (input.locationConsent() != null) {
            donor.setLocationConsent(input.locationConsent());
            if (!donor.isLocationConsent()) {
                donor.setApproxLatitude(null);
                donor.setApproxLongitude(null);
            }
        }
        if (Boolean.TRUE.equals(input.locationConsent()) || donor.isLocationConsent()) {
            Double latitude = InputRules.roundCoordinate(input.latitude(), true);
            Double longitude = InputRules.roundCoordinate(input.longitude(), false);
            if (latitude != null && longitude != null) {
                donor.setApproxLatitude(latitude);
                donor.setApproxLongitude(longitude);
                donor.setLocationConsent(true);
            }
        }
        eligibilityService.refresh(donor);
        matchingService.inviteDonorToOpenRequests(donor);
        return toProfile(donor);
    }

    @Transactional
    public DonorProfileResponse uploadAvatar(MultipartFile file) {
        Donor donor = currentAccess.requireDonor();
        String previous = donor.getAvatarFileName();
        donor.setAvatarFileName(fileStorageService.store("donors/" + donor.getId(), file));
        fileStorageService.deleteQuietly(previous);
        return toProfile(donor);
    }

    @Transactional
    public DonorProfileResponse setAvailability(AvailabilityRequest input) {
        Donor donor = currentAccess.requireDonor();
        donor.setAvailable(Boolean.TRUE.equals(input.available()));
        if (donor.isAvailable()) {
            matchingService.inviteDonorToOpenRequests(donor);
        }
        return toProfile(donor);
    }

    @Transactional
    public EligibilityResultResponse evaluate(EligibilityAnswersRequest answers) {
        Donor donor = currentAccess.requireDonor();
        DonorEligibilityService.Evaluation evaluation = eligibilityService.applyToDonor(donor, answers);
        String body = switch (evaluation.result()) {
            case ELIGIBLE -> "Preliminarily eligible. A clinician must still confirm.";
            case REVIEW -> evaluation.reasons().isEmpty()
                    ? "Needs medical review. This is not a diagnosis."
                    : String.join(" ", evaluation.reasons());
            case INELIGIBLE -> evaluation.reasons().isEmpty()
                    ? "Not currently eligible to donate."
                    : evaluation.reasons().get(0);
        };
        notificationService.notifyUser(
                donor.getUser(),
                NotificationKind.ELIGIBILITY,
                "Preliminary screening updated",
                body,
                null,
                null
        );
        return new EligibilityResultResponse(
                evaluation.result(),
                DateTimes.iso(evaluation.nextEligible()),
                evaluation.age(),
                evaluation.reasons()
        );
    }

    @Transactional(readOnly = true)
    public DonorDashboardResponse dashboard() {
        Donor donor = currentAccess.requireDonor();
        List<MatchResponse> invitations = matchingService.forDonor();
        List<MatchResponse> pending = invitations.stream()
                .filter(item -> item.status() == MatchStatus.PENDING)
                .toList();
        long accepted = invitations.stream().filter(item -> MatchingService.hasRelationship(item.status())).count();
        long urgent = pending.stream()
                .filter(item -> item.urgency() == Urgency.URGENT || item.urgency() == Urgency.CRITICAL)
                .count();
        List<NotificationResponse> notes = notificationService.mine();
        return new DonorDashboardResponse(
                toProfile(donor),
                new DonorStatsResponse(
                        pending.size(),
                        accepted,
                        donationRepository.countByDonor_IdAndStatus(
                                donor.getId(), com.bloodlink.common.enums.DonationStatus.COMPLETED),
                        pending.size(),
                        urgent
                ),
                pending,
                notes.stream().limit(5).toList()
        );
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> history() {
        Donor donor = currentAccess.requireDonor();
        return donationRepository.findByDonorId(donor.getId()).stream()
                .filter(item -> item.getStatus() == com.bloodlink.common.enums.DonationStatus.COMPLETED)
                .map(item -> com.bloodlink.domain.DonationViews.toResponse(item, cityCatalog))
                .toList();
    }

    public DonorProfileResponse toProfile(Donor donor) {
        DonorEligibilityService.Evaluation evaluation = eligibilityService.evaluate(donor);
        boolean[] checks = {
                donor.getFirstName() != null && !donor.getFirstName().isBlank(),
                donor.getCityId() != null,
                donor.getBloodType() != null && !donor.getBloodType().isBlank(),
                donor.getDateOfBirth() != null,
                donor.getWeightKg() != null,
                donor.getEligibility() != null
        };
        int complete = 0;
        for (boolean check : checks) {
            if (check) {
                complete++;
            }
        }
        long completed = donationRepository.countByDonor_IdAndStatus(donor.getId(), com.bloodlink.common.enums.DonationStatus.COMPLETED);
        long accepted = matchRepository.countByDonor_IdAndStatusIn(
                donor.getId(),
                java.util.EnumSet.of(
                        MatchStatus.ACCEPTED,
                        MatchStatus.CONTACTED,
                        MatchStatus.SCHEDULED,
                        MatchStatus.COMPLETED
                ));
        long declined = matchRepository.countByDonor_IdAndStatus(donor.getId(), MatchStatus.DECLINED);
        Integer reliability = ProfileDirectoryService.reliabilityPercent(completed, accepted);
        return new DonorProfileResponse(
                donor.getId(),
                donor.getUser().getId(),
                donor.getFirstName(),
                donor.getLastName(),
                donor.getPhone(),
                donor.getUser().getEmail(),
                donor.getCin(),
                donor.getCityId(),
                cityCatalog.nameOf(donor.getCityId()),
                cityCatalog.regionOf(donor.getCityId()),
                donor.getBloodType(),
                donor.isAvailable(),
                DateTimes.iso(donor.getLastDonation()),
                DateTimes.iso(evaluation.nextEligible()),
                evaluation.result(),
                DateTimes.iso(donor.getDateOfBirth()),
                evaluation.age(),
                donor.getWeightKg(),
                donor.getHeightCm(),
                donor.isLocationConsent(),
                donor.getApproxLatitude() != null && donor.getApproxLongitude() != null,
                donor.getApproxLatitude(),
                donor.getApproxLongitude(),
                donor.getPreferredContact(),
                Math.round(complete * 100f / checks.length),
                (int) notificationService.unreadCount(),
                MediaUrls.donorAvatar(donor.getId(), donor.getAvatarFileName()),
                DateTimes.iso(donor.getCreatedAt()),
                completed,
                accepted,
                declined,
                reliability,
                reliability == null ? null : ProfileDirectoryService.RELIABILITY_FORMULA
        );
    }
}
