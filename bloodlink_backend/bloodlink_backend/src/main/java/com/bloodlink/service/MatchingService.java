package com.bloodlink.service;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.common.enums.DonationStatus;
import com.bloodlink.common.enums.MatchLayer;
import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.common.enums.NotificationKind;
import com.bloodlink.common.enums.Urgency;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.domain.BloodCompatibility;
import com.bloodlink.domain.BloodTypes;
import com.bloodlink.domain.CityCatalog;
import com.bloodlink.domain.DateTimes;
import com.bloodlink.domain.Distances;
import com.bloodlink.domain.MatchRanking;
import com.bloodlink.domain.MediaUrls;
import com.bloodlink.dto.response.MatchCountsResponse;
import com.bloodlink.dto.response.MatchResponse;
import com.bloodlink.entity.BloodMatch;
import com.bloodlink.entity.BloodRequest;
import com.bloodlink.entity.Donation;
import com.bloodlink.entity.Donor;
import com.bloodlink.exception.BusinessRuleException;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.BloodMatchRepository;
import com.bloodlink.repository.BloodRequestRepository;
import com.bloodlink.repository.DonationRepository;
import com.bloodlink.repository.DonorRepository;
import com.bloodlink.security.CurrentAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;

@Service
public class MatchingService {

    private static final EnumSet<MatchStatus> RELATIONSHIP = EnumSet.of(
            MatchStatus.ACCEPTED,
            MatchStatus.CONTACTED,
            MatchStatus.SCHEDULED,
            MatchStatus.COMPLETED
    );

    private final BloodMatchRepository matchRepository;
    private final BloodRequestRepository requestRepository;
    private final DonorRepository donorRepository;
    private final DonationRepository donationRepository;
    private final NotificationService notificationService;
    private final DonorEligibilityService eligibilityService;
    private final AuditService auditService;
    private final CityCatalog cityCatalog;
    private final CurrentAccess currentAccess;

    public MatchingService(
            BloodMatchRepository matchRepository,
            BloodRequestRepository requestRepository,
            DonorRepository donorRepository,
            DonationRepository donationRepository,
            NotificationService notificationService,
            DonorEligibilityService eligibilityService,
            AuditService auditService,
            CityCatalog cityCatalog,
            CurrentAccess currentAccess
    ) {
        this.matchRepository = matchRepository;
        this.requestRepository = requestRepository;
        this.donorRepository = donorRepository;
        this.donationRepository = donationRepository;
        this.notificationService = notificationService;
        this.eligibilityService = eligibilityService;
        this.auditService = auditService;
        this.cityCatalog = cityCatalog;
        this.currentAccess = currentAccess;
    }

    @Transactional
    public List<BloodMatch> inviteCompatibleDonors(BloodRequest request) {
        List<Candidate> candidates = donorRepository.findMatchCandidates(UserStatus.ACTIVE).stream()
                .filter(Donor::isAvailable)
                .filter(donor -> BloodCompatibility.canDonateTo(donor.getBloodType(), request.getBloodType()))
                .filter(eligibilityService::canBeInvited)
                .filter(donor -> !matchRepository.existsByBloodRequest_IdAndDonor_Id(request.getId(), donor.getId()))
                .map(donor -> toCandidate(donor, request))
                .filter(item -> withinExpansion(item.layer(), request.getExpansion()))
                .sorted(Comparator
                        .comparingInt((Candidate item) -> MatchRanking.score(
                                item.donor(), request, item.layer(), distanceKm(item.donor(), request)))
                        .reversed()
                        .thenComparingInt(item -> layerOrder(item.layer())))
                .toList();

        List<Candidate> selected = candidates;
        List<BloodMatch> saved = new ArrayList<>();
        for (Candidate candidate : selected) {
            BloodMatch match = new BloodMatch();
            match.setBloodRequest(request);
            match.setDonor(candidate.donor());
            match.setBloodType(BloodTypes.normalize(candidate.donor().getBloodType()));
            match.setAvailable(candidate.donor().isAvailable());
            match.setLayer(candidate.layer());
            match.setCompatibility(BloodCompatibility.label(candidate.donor().getBloodType(), request.getBloodType()));
            match.setStatus(MatchStatus.PENDING);
            saved.add(matchRepository.save(match));
        }

        String city = cityCatalog.nameOf(request.getHospital().getCityId());
        String urgency = request.getUrgency() == Urgency.STANDARD ? "Normal" : request.getUrgency().name();
        for (BloodMatch match : saved) {
            notificationService.notifyUser(
                    match.getDonor().getUser(),
                    NotificationKind.INVITATION,
                    "Urgent blood request near you",
                    request.getBloodType() + " · " + urgency + " · " + request.getUnits()
                            + " units needed. Approximate city match in " + city + ".",
                    request.getId(),
                    match.getId()
            );
        }
        if (!saved.isEmpty()) {
            notificationService.notifyHospitalStaff(
                    request.getHospital().getId(),
                    NotificationKind.STATUS,
                    "Invitations sent",
                    saved.size() + " compatible donor(s) were invited at the same time.",
                    request.getId(),
                    null
            );
        }
        return saved;
    }

    @Transactional
    public int inviteDonorToOpenRequests(Donor donor) {
        if (donor.getBloodType() == null
                || !donor.isAvailable()
                || !eligibilityService.canBeInvited(donor)) {
            return 0;
        }
        List<BloodRequest> open = requestRepository.findByStatusIn(EnumSet.of(
                BloodRequestStatus.SEARCHING,
                BloodRequestStatus.PARTIAL
        ));
        int created = 0;
        LocalDateTime now = LocalDateTime.now();
        for (BloodRequest request : open) {
            if (!request.getNeededBefore().isAfter(now)) {
                continue;
            }
            MatchLayer layer = cityCatalog.layer(donor.getCityId(), request.getHospital().getCityId());
            if (!withinExpansion(layer, request.getExpansion())) {
                continue;
            }
            if (!BloodCompatibility.canDonateTo(donor.getBloodType(), request.getBloodType())) {
                continue;
            }
            if (matchRepository.existsByBloodRequest_IdAndDonor_Id(request.getId(), donor.getId())) {
                continue;
            }
            BloodMatch match = new BloodMatch();
            match.setBloodRequest(request);
            match.setDonor(donor);
            match.setBloodType(BloodTypes.normalize(donor.getBloodType()));
            match.setAvailable(donor.isAvailable());
            match.setLayer(layer);
            match.setCompatibility(BloodCompatibility.label(donor.getBloodType(), request.getBloodType()));
            match.setStatus(MatchStatus.PENDING);
            match = matchRepository.save(match);
            created++;

            String city = cityCatalog.nameOf(request.getHospital().getCityId());
            String urgency = request.getUrgency() == Urgency.STANDARD ? "Normal" : request.getUrgency().name();
            notificationService.notifyUser(
                    donor.getUser(),
                    NotificationKind.INVITATION,
                    "Urgent blood request near you",
                    request.getBloodType() + " · " + urgency + " · " + request.getUnits()
                            + " units needed. Approximate city match in " + city + ".",
                    request.getId(),
                    match.getId()
            );
            notificationService.notifyHospitalStaff(
                    request.getHospital().getId(),
                    NotificationKind.STATUS,
                    "New compatible donor found",
                    "A compatible donor was invited to " + publicCode(request.getId()) + ".",
                    request.getId(),
                    match.getId()
            );
        }
        return created;
    }

    @Transactional
    public MatchResponse respond(Long matchId, MatchStatus status, String declineReason) {
        if (status != MatchStatus.ACCEPTED && status != MatchStatus.DECLINED) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_MATCH_RESPONSE, "Only accept or decline is allowed");
        }
        Donor donor = currentAccess.requireDonor();
        BloodMatch match = matchRepository.findByIdAndDonorId(matchId, donor.getId())
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.INVITATION_NOT_FOUND, "Invitation was not found"));
        if (match.getStatus() != MatchStatus.PENDING) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVITATION_NOT_PENDING, "This invitation is no longer pending");
        }
        BloodRequest request = match.getBloodRequest();
        expireIfNeeded(request);
        if (request.getStatus() == BloodRequestStatus.CANCELLED
                || request.getStatus() == BloodRequestStatus.FULFILLED
                || request.getStatus() == BloodRequestStatus.EXPIRED
                || request.getStatus() == BloodRequestStatus.PAUSED) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.REQUEST_NOT_ACTIVE, "This blood request is no longer active");
        }
        if (status == MatchStatus.ACCEPTED) {
            eligibilityService.requireEligibleToAccept(donor);
            if (!BloodCompatibility.canDonateTo(donor.getBloodType(), request.getBloodType())) {
                throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INCOMPATIBLE_BLOOD_TYPE, "This donor is not compatible with the requested blood type");
            }
        }

        match.setStatus(status);
        match.setRespondedAt(LocalDateTime.now());
        if (status == MatchStatus.ACCEPTED) {
            match.setAcceptedAt(match.getRespondedAt());
        }
        if (status == MatchStatus.DECLINED && declineReason != null && !declineReason.isBlank()) {
            match.setDeclineReason(declineReason.trim());
        }

        Long hospitalId = request.getHospital().getId();
        if (status == MatchStatus.ACCEPTED) {
            notificationService.notifyHospitalStaff(
                    hospitalId,
                    NotificationKind.ACCEPTED,
                    "Donor accepted your blood request",
                    "A compatible donor accepted " + publicCode(request.getId())
                            + ". Review matching to coordinate support.",
                    request.getId(),
                    match.getId()
            );
            notificationService.notifyUser(
                    donor.getUser(),
                    NotificationKind.ACCEPTED,
                    "You accepted an invitation",
                    publicCode(request.getId()) + " — the hospital can now open communication. No donation has been recorded.",
                    request.getId(),
                    match.getId()
            );
            refreshRequestProgress(request);
        } else {
            notificationService.notifyHospitalStaff(
                    hospitalId,
                    NotificationKind.DECLINED,
                    "New donor response",
                    "A compatible donor declined " + publicCode(request.getId())
                            + ". Other notified donors remain active.",
                    request.getId(),
                    match.getId()
            );
            notificationService.notifyUser(
                    donor.getUser(),
                    NotificationKind.DECLINED,
                    "You declined an invitation",
                    publicCode(request.getId()) + " was declined.",
                    request.getId(),
                    match.getId()
            );
        }
        return toResponse(match, true);
    }

    @Transactional
    public void closePending(BloodRequest request, MatchStatus status, String reason) {
        List<BloodMatch> pending = matchRepository.findByBloodRequest_IdAndStatus(request.getId(), MatchStatus.PENDING);
        LocalDateTime now = LocalDateTime.now();
        for (BloodMatch match : pending) {
            match.setStatus(status);
            match.setRespondedAt(now);
            notificationService.notifyUser(
                    match.getDonor().getUser(),
                    NotificationKind.CANCELLED,
                    status == MatchStatus.EXPIRED ? "Request fulfilled" : "Request cancelled",
                    publicCode(request.getId()) + ": " + reason,
                    request.getId(),
                    match.getId()
            );
        }
    }

    @Transactional
    public void refreshRequestProgress(BloodRequest request) {
        expireIfNeeded(request);
        if (request.getStatus() == BloodRequestStatus.CANCELLED
                || request.getStatus() == BloodRequestStatus.EXPIRED
                || request.getStatus() == BloodRequestStatus.PAUSED) {
            return;
        }
        long completed = matchRepository.countByBloodRequest_IdAndStatus(request.getId(), MatchStatus.COMPLETED);
        long engaged = completed
                + matchRepository.countByBloodRequest_IdAndStatus(request.getId(), MatchStatus.ACCEPTED)
                + matchRepository.countByBloodRequest_IdAndStatus(request.getId(), MatchStatus.CONTACTED)
                + matchRepository.countByBloodRequest_IdAndStatus(request.getId(), MatchStatus.SCHEDULED);
        if (completed >= request.getUnits()) {
            fulfill(request);
            return;
        }
        if (engaged > 0) {
            boolean becamePartial = request.getStatus() != BloodRequestStatus.PARTIAL;
            request.setStatus(BloodRequestStatus.PARTIAL);
            if (becamePartial) {
                notificationService.notifyHospitalStaff(
                        request.getHospital().getId(),
                        NotificationKind.STATUS,
                        "Donors are responding to " + publicCode(request.getId()),
                        engaged + " donor engagement(s) are in progress. Completion still requires hospital confirmation.",
                        request.getId(),
                        null
                );
            }
        } else {
            request.setStatus(BloodRequestStatus.SEARCHING);
        }
    }

    @Transactional
    public void fulfill(BloodRequest request) {
        if (request.getStatus() == BloodRequestStatus.FULFILLED) {
            return;
        }
        request.setStatus(BloodRequestStatus.FULFILLED);
        closePending(request, MatchStatus.EXPIRED, "This request has already received sufficient completed donations.");
        notificationService.notifyHospitalStaff(
                request.getHospital().getId(),
                NotificationKind.STATUS,
                "Request fulfilled",
                publicCode(request.getId()) + " received sufficient donor support.",
                request.getId(),
                null
        );
    }

    @Transactional
    public void expireIfNeeded(BloodRequest request) {
        if (request.getNeededBefore().isBefore(LocalDateTime.now())
                && request.getStatus() != BloodRequestStatus.FULFILLED
                && request.getStatus() != BloodRequestStatus.CANCELLED
                && request.getStatus() != BloodRequestStatus.EXPIRED) {
            request.setStatus(BloodRequestStatus.EXPIRED);
            closePending(request, MatchStatus.EXPIRED, "This request expired before enough donor support was confirmed.");
        }
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> forHospitalRequest(Long requestId) {
        Long hospitalId = currentAccess.requireHospital().getId();
        requestRepository.findByIdAndHospitalId(requestId, hospitalId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.BLOOD_REQUEST_NOT_FOUND, "Blood request was not found"));
        return matchRepository.findByRequestId(requestId).stream()
                .map(match -> toResponse(match, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> forHospital() {
        Long hospitalId = currentAccess.requireHospital().getId();
        return matchRepository.findByHospitalId(hospitalId).stream()
                .map(match -> toResponse(match, false))
                .sorted(Comparator.comparingInt((MatchResponse item) -> item.matchScore() == null ? 0 : item.matchScore()).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MatchResponse> forDonor() {
        Donor donor = currentAccess.requireDonor();
        return matchRepository.findByDonorId(donor.getId()).stream()
                .map(match -> toResponse(match, true))
                .sorted(Comparator
                        .comparingInt((MatchResponse item) -> urgencyRank(item.urgency()))
                        .thenComparingInt(item -> item.matchScore() == null ? 0 : item.matchScore())
                        .reversed())
                .toList();
    }

    public MatchCountsResponse counts(Long requestId) {
        List<BloodMatch> matches = matchRepository.findByRequestId(requestId);
        return counts(matches);
    }

    public MatchCountsResponse counts(List<BloodMatch> matches) {
        long pending = matches.stream().filter(item -> item.getStatus() == MatchStatus.PENDING).count();
        long accepted = matches.stream().filter(item -> RELATIONSHIP.contains(item.getStatus())
                && item.getStatus() != MatchStatus.COMPLETED).count();
        long declined = matches.stream().filter(item -> item.getStatus() == MatchStatus.DECLINED).count();
        long closed = matches.stream().filter(item ->
                item.getStatus() == MatchStatus.CANCELLED || item.getStatus() == MatchStatus.EXPIRED).count();
        long completed = matches.stream().filter(item -> item.getStatus() == MatchStatus.COMPLETED).count();
        return new MatchCountsResponse(matches.size(), pending, accepted, declined, closed, completed);
    }

    public MatchResponse toAdminResponse(BloodMatch match) {
        return toResponse(match, false, true);
    }

    public MatchResponse toResponse(BloodMatch match, boolean includeHospitalDetails) {
        boolean related = RELATIONSHIP.contains(match.getStatus());
        return toResponse(match, includeHospitalDetails, !includeHospitalDetails && related);
    }

    private MatchResponse toResponse(BloodMatch match, boolean includeHospitalDetails, boolean revealIdentity) {
        BloodRequest request = match.getBloodRequest();
        Donor donor = match.getDonor();
        boolean related = RELATIONSHIP.contains(match.getStatus());
        Long exposedDonorId = includeHospitalDetails || related || revealIdentity
                ? donor.getId()
                : null;
        Integer distance = distanceKm(donor, request);
        int score = MatchRanking.score(donor, request, match.getLayer(), distance);
        return new MatchResponse(
                match.getId(),
                request.getId(),
                request.getHospital().getId(),
                exposedDonorId,
                publicCode(request.getId()),
                publicCode(donor.getId()),
                match.getBloodType(),
                donor.getCityId(),
                cityCatalog.nameOf(donor.getCityId()),
                match.isAvailable(),
                donor.getEligibility(),
                distance,
                match.getCompatibility(),
                match.getLayer(),
                match.getStatus(),
                DateTimes.iso(match.getCreatedAt()),
                DateTimes.iso(match.getRespondedAt()),
                DateTimes.iso(match.getAcceptedAt()),
                DateTimes.iso(match.getContactedAt()),
                DateTimes.iso(match.getScheduledAt()),
                DateTimes.iso(match.getCompletedAt()),
                match.getDeclineReason(),
                request.getHospital().getHospitalName(),
                request.getUnits(),
                request.getUrgency(),
                DateTimes.iso(request.getNeededBefore()),
                revealIdentity ? donor.getFirstName() + " " + donor.getLastName() : null,
                revealIdentity ? donor.getPhone() : null,
                revealIdentity ? donor.getCin() : null,
                score,
                MatchRanking.FORMULA,
                MediaUrls.hospitalLogo(request.getHospital().getId(), request.getHospital().getLogoFileName())
        );
    }

    public static String publicCode(Long id) {
        return "BL-" + id;
    }

    public static String displayStatus(BloodRequest request, MatchCountsResponse counts) {
        if (request.getStatus() == BloodRequestStatus.CANCELLED) {
            return "Cancelled";
        }
        if (request.getStatus() == BloodRequestStatus.FULFILLED) {
            return "Fulfilled";
        }
        if (request.getStatus() == BloodRequestStatus.EXPIRED || request.getNeededBefore().isBefore(LocalDateTime.now())) {
            return "Expired";
        }
        if (request.getStatus() == BloodRequestStatus.PAUSED) {
            return "Paused";
        }
        if (counts.completed() > 0 && counts.completed() < request.getUnits()) {
            return "Partially fulfilled";
        }
        if (counts.accepted() + counts.declined() + counts.completed() > 0) {
            return "Donors responding";
        }
        return "Searching for donors";
    }

    public static boolean canEdit(BloodRequest request) {
        return !EnumSet.of(BloodRequestStatus.FULFILLED, BloodRequestStatus.CANCELLED, BloodRequestStatus.EXPIRED)
                .contains(request.getStatus());
    }

    @Transactional
    public MatchResponse contact(Long matchId) {
        BloodMatch match = requireHospitalMatch(matchId);
        requireActiveRequest(match.getBloodRequest());
        if (match.getStatus() != MatchStatus.ACCEPTED && match.getStatus() != MatchStatus.CONTACTED) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_MATCH_TRANSITION, "This match cannot be marked contacted");
        }
        match.setStatus(MatchStatus.CONTACTED);
        match.setContactedAt(LocalDateTime.now());
        notificationService.notifyUser(
                match.getDonor().getUser(),
                NotificationKind.STATUS,
                "The hospital contacted you",
                publicCode(match.getBloodRequest().getId()) + " — please coordinate your visit.",
                match.getBloodRequest().getId(),
                match.getId()
        );
        refreshRequestProgress(match.getBloodRequest());
        return toResponse(match, false);
    }

    @Transactional
    public MatchResponse schedule(Long matchId, String scheduledAtRaw) {
        BloodMatch match = requireHospitalMatch(matchId);
        requireActiveRequest(match.getBloodRequest());
        if (match.getStatus() != MatchStatus.ACCEPTED
                && match.getStatus() != MatchStatus.CONTACTED
                && match.getStatus() != MatchStatus.SCHEDULED) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_MATCH_TRANSITION, "This match cannot be scheduled");
        }
        LocalDateTime scheduledAt = DateTimes.parseDateTime(scheduledAtRaw);
        match.setStatus(MatchStatus.SCHEDULED);
        match.setScheduledAt(scheduledAt);
        if (match.getContactedAt() == null) {
            match.setContactedAt(LocalDateTime.now());
        }
        notificationService.notifyUser(
                match.getDonor().getUser(),
                NotificationKind.STATUS,
                "Donation visit scheduled",
                publicCode(match.getBloodRequest().getId()) + " is scheduled.",
                match.getBloodRequest().getId(),
                match.getId()
        );
        refreshRequestProgress(match.getBloodRequest());
        return toResponse(match, false);
    }

    @Transactional
    public MatchResponse complete(Long matchId) {
        BloodMatch match = requireHospitalMatch(matchId);
        BloodRequest request = match.getBloodRequest();
        requireActiveRequest(request);
        if (!EnumSet.of(MatchStatus.ACCEPTED, MatchStatus.CONTACTED, MatchStatus.SCHEDULED).contains(match.getStatus())) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_MATCH_TRANSITION, "This match cannot be completed");
        }
        Donor donor = match.getDonor();
        if (donationRepository.existsByDonor_IdAndBloodRequest_IdAndStatus(
                donor.getId(), request.getId(), DonationStatus.COMPLETED)) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.DONATION_ALREADY_RECORDED, "A completed donation already exists for this request");
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        match.setStatus(MatchStatus.COMPLETED);
        match.setCompletedAt(now);
        if (match.getAcceptedAt() == null) {
            match.setAcceptedAt(match.getRespondedAt());
        }

        Donation donation = new Donation();
        donation.setDonor(donor);
        donation.setHospital(request.getHospital());
        donation.setBloodRequest(request);
        donation.setBloodMatch(match);
        donation.setBloodType(request.getBloodType());
        donation.setUnits(1);
        donation.setDonatedOn(today);
        donation.setStatus(DonationStatus.COMPLETED);
        donation.setAcceptedAt(match.getAcceptedAt());
        donation.setContactedAt(match.getContactedAt());
        donation.setScheduledAt(match.getScheduledAt());
        donation.setCompletedAt(now);
        donationRepository.save(donation);

        eligibilityService.applyAfterDonation(donor, today);
        notificationService.notifyUser(
                donor.getUser(),
                NotificationKind.STATUS,
                "Donation recorded",
                "A completed donation was recorded for " + publicCode(request.getId()) + ".",
                request.getId(),
                match.getId()
        );
        auditService.record("DONATION_COMPLETED", "Donation", donation.getId(),
                "match=" + match.getId() + " request=" + request.getId());
        refreshRequestProgress(request);
        return toResponse(match, false);
    }

    @Transactional
    public MatchResponse cancelEngagement(Long matchId, String reason, boolean noShow) {
        BloodMatch match = requireHospitalMatch(matchId);
        if (!EnumSet.of(MatchStatus.ACCEPTED, MatchStatus.CONTACTED, MatchStatus.SCHEDULED).contains(match.getStatus())) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.INVALID_MATCH_TRANSITION, "This match cannot be cancelled");
        }
        LocalDateTime now = LocalDateTime.now();
        match.setStatus(MatchStatus.CANCELLED);
        match.setCancelledAt(now);
        if (reason != null && !reason.isBlank()) {
            match.setDeclineReason(reason.trim());
        }
        Donation donation = new Donation();
        donation.setDonor(match.getDonor());
        donation.setHospital(match.getBloodRequest().getHospital());
        donation.setBloodRequest(match.getBloodRequest());
        donation.setBloodMatch(match);
        donation.setBloodType(match.getBloodRequest().getBloodType());
        donation.setUnits(0);
        donation.setDonatedOn(LocalDate.now());
        donation.setStatus(noShow ? DonationStatus.NO_SHOW : DonationStatus.CANCELLED);
        donation.setAcceptedAt(match.getAcceptedAt());
        donation.setContactedAt(match.getContactedAt());
        donation.setScheduledAt(match.getScheduledAt());
        donation.setCancelledAt(now);
        donation.setCancellationReason(match.getDeclineReason());
        donationRepository.save(donation);
        notificationService.notifyUser(
                match.getDonor().getUser(),
                NotificationKind.CANCELLED,
                noShow ? "Visit marked as no-show" : "Donation cancelled",
                publicCode(match.getBloodRequest().getId()) + " was closed without a completed donation.",
                match.getBloodRequest().getId(),
                match.getId()
        );
        auditService.record("DONATION_CANCELLED", "BloodMatch", match.getId(), noShow ? "NO_SHOW" : "CANCELLED");
        refreshRequestProgress(match.getBloodRequest());
        return toResponse(match, false);
    }

    public static boolean hasRelationship(MatchStatus status) {
        return RELATIONSHIP.contains(status);
    }

    private BloodMatch requireHospitalMatch(Long matchId) {
        Long hospitalId = currentAccess.requireOperationalHospital().getId();
        BloodMatch match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.MATCH_NOT_FOUND, "Match was not found"));
        if (!match.getBloodRequest().getHospital().getId().equals(hospitalId)) {
            throw new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.MATCH_NOT_FOUND, "Match was not found");
        }
        return match;
    }

    private void requireActiveRequest(BloodRequest request) {
        expireIfNeeded(request);
        if (request.getStatus() == BloodRequestStatus.CANCELLED
                || request.getStatus() == BloodRequestStatus.EXPIRED
                || request.getStatus() == BloodRequestStatus.FULFILLED
                || request.getStatus() == BloodRequestStatus.PAUSED) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.REQUEST_NOT_ACTIVE, "This blood request is no longer active");
        }
    }

    private boolean withinExpansion(MatchLayer layer, MatchLayer expansion) {
        if (expansion == null || expansion == MatchLayer.NATIONAL) {
            return true;
        }
        if (expansion == MatchLayer.REGION) {
            return layer != MatchLayer.NATIONAL;
        }
        return layer == MatchLayer.CITY;
    }

    private Integer distanceKm(Donor donor, BloodRequest request) {
        if (donor == null || !donor.isLocationConsent()) {
            return null;
        }
        return Distances.kilometers(
                donor.getApproxLatitude(),
                donor.getApproxLongitude(),
                request.getHospital().getApproxLatitude(),
                request.getHospital().getApproxLongitude()
        );
    }

    private Candidate toCandidate(Donor donor, BloodRequest request) {
        return new Candidate(donor, cityCatalog.layer(donor.getCityId(), request.getHospital().getCityId()));
    }

    private int layerOrder(MatchLayer layer) {
        return switch (layer) {
            case CITY -> 0;
            case REGION -> 1;
            case NATIONAL -> 2;
        };
    }

    private int urgencyRank(Urgency urgency) {
        if (urgency == Urgency.CRITICAL) {
            return 3;
        }
        if (urgency == Urgency.URGENT) {
            return 2;
        }
        return 1;
    }

    private record Candidate(Donor donor, MatchLayer layer) {
    }
}
