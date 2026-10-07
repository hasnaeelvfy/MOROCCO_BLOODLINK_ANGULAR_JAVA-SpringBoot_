package com.bloodlink.service;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.common.enums.MatchLayer;
import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.common.enums.NotificationKind;
import com.bloodlink.common.enums.Urgency;
import com.bloodlink.domain.BloodTypes;
import com.bloodlink.domain.CityCatalog;
import com.bloodlink.domain.DateRules;
import com.bloodlink.domain.DateTimes;
import com.bloodlink.domain.InputRules;
import com.bloodlink.dto.request.CreateBloodRequestRequest;
import com.bloodlink.dto.request.UpdateBloodRequestRequest;
import com.bloodlink.dto.response.BloodRequestResponse;
import com.bloodlink.dto.response.MatchCountsResponse;
import com.bloodlink.entity.BloodRequest;
import com.bloodlink.entity.Hospital;
import com.bloodlink.exception.BusinessRuleException;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.BloodRequestRepository;
import com.bloodlink.security.CurrentAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BloodRequestService {

    private final BloodRequestRepository requestRepository;
    private final MatchingService matchingService;
    private final NotificationService notificationService;
    private final CurrentAccess currentAccess;
    private final CityCatalog cityCatalog;
    private final AuditService auditService;

    public BloodRequestService(
            BloodRequestRepository requestRepository,
            MatchingService matchingService,
            NotificationService notificationService,
            CurrentAccess currentAccess,
            CityCatalog cityCatalog,
            AuditService auditService
    ) {
        this.requestRepository = requestRepository;
        this.matchingService = matchingService;
        this.notificationService = notificationService;
        this.currentAccess = currentAccess;
        this.cityCatalog = cityCatalog;
        this.auditService = auditService;
    }

    @Transactional
    public BloodRequestResponse create(CreateBloodRequestRequest input) {
        Hospital hospital = currentAccess.requireOperationalHospital();
        LocalDateTime neededBefore = DateRules.requireFutureDateTime(DateTimes.parseDateTime(input.neededBefore()));
        BloodRequest request = new BloodRequest();
        request.setHospital(hospital);
        request.setBloodType(BloodTypes.requireValid(input.bloodType()));
        request.setUnits(InputRules.requireUnits(input.units()));
        request.setUrgency(input.urgency());
        request.setNeededBefore(neededBefore);
        request.setNotes(blankToNull(input.notes()));
        request.setReference(blankToNull(input.reference()));
        request.setReason(blankToNull(input.reason()));
        request.setContactName(blankToNull(input.contactName()) != null ? input.contactName().trim() : hospital.getContactName());
        request.setContactPhone(blankToNull(input.contactPhone()) != null ? input.contactPhone().trim() : hospital.getPhone());
        request.setContactMethod(blankToNull(input.contactMethod()) != null ? input.contactMethod().trim() : "phone");
        request.setStatus(BloodRequestStatus.SEARCHING);
        request.setExpansion(expansionFor(input.urgency()));
        request = requestRepository.save(request);

        matchingService.inviteCompatibleDonors(request);
        notificationService.notifyHospitalStaff(
                hospital.getId(),
                NotificationKind.STATUS,
                "Your request is still searching for suitable donors",
                MatchingService.publicCode(request.getId()) + " · " + request.getBloodType() + " · "
                        + request.getUnits() + " units. Compatible donors were notified in parallel.",
                request.getId(),
                null
        );
        return toResponse(request);
    }

    @Transactional
    public List<BloodRequestResponse> listMine() {
        Hospital hospital = currentAccess.requireHospital();
        return requestRepository.findByHospitalId(hospital.getId()).stream()
                .map(this::refreshAndMap)
                .toList();
    }

    @Transactional
    public BloodRequestResponse getMine(Long id) {
        return toResponse(requireOwned(id));
    }

    @Transactional
    public BloodRequestResponse update(Long id, UpdateBloodRequestRequest input) {
        currentAccess.requireOperationalHospital();
        BloodRequest request = requireOwned(id);
        matchingService.expireIfNeeded(request);
        if (!MatchingService.canEdit(request)) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.REQUEST_NOT_EDITABLE, "This request can no longer be edited");
        }
        if (input.bloodType() != null && !input.bloodType().isBlank()) {
            request.setBloodType(BloodTypes.requireValid(input.bloodType()));
        }
        if (input.units() != null) {
            request.setUnits(InputRules.requireUnits(input.units()));
        }
        if (input.urgency() != null) {
            request.setUrgency(input.urgency());
            request.setExpansion(expansionFor(input.urgency()));
        }
        if (input.neededBefore() != null && !input.neededBefore().isBlank()) {
            LocalDateTime neededBefore = DateTimes.parseDateTime(input.neededBefore());
            if (!neededBefore.isAfter(LocalDateTime.now()) && request.getStatus() != BloodRequestStatus.EXPIRED) {
                throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.REQUIRED_TIME_FUTURE, "Required time must be in the future");
            }
            request.setNeededBefore(neededBefore);
        }
        if (input.notes() != null) {
            request.setNotes(blankToNull(input.notes()));
        }
        if (input.reference() != null) {
            request.setReference(blankToNull(input.reference()));
        }
        if (input.reason() != null) {
            request.setReason(blankToNull(input.reason()));
        }
        matchingService.inviteCompatibleDonors(request);
        matchingService.refreshRequestProgress(request);
        return toResponse(request);
    }

    @Transactional
    public BloodRequestResponse cancel(Long id) {
        currentAccess.requireOperationalHospital();
        BloodRequest request = requireOwned(id);
        matchingService.expireIfNeeded(request);
        if (request.getStatus() == BloodRequestStatus.FULFILLED || request.getStatus() == BloodRequestStatus.CANCELLED) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.REQUEST_NOT_CANCELLABLE, "This request can no longer be cancelled");
        }
        request.setStatus(BloodRequestStatus.CANCELLED);
        matchingService.closePending(request, MatchStatus.CANCELLED, "The hospital cancelled this request.");
        notificationService.notifyHospitalStaff(
                request.getHospital().getId(),
                NotificationKind.STATUS,
                MatchingService.publicCode(request.getId()) + " updated",
                "Cancelled",
                request.getId(),
                null
        );
        auditService.record("REQUEST_CANCELLED", "BloodRequest", request.getId(), "hospital");
        return toResponse(request);
    }

    @Transactional
    public BloodRequestResponse cancelByAdmin(Long id, String reason) {
        currentAccess.requireAdmin();
        BloodRequest request = requestRepository.findWithHospitalById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        com.bloodlink.common.ErrorCodes.BLOOD_REQUEST_NOT_FOUND, "Blood request was not found"));
        matchingService.expireIfNeeded(request);
        if (request.getStatus() == BloodRequestStatus.FULFILLED || request.getStatus() == BloodRequestStatus.CANCELLED) {
            throw new BusinessRuleException(com.bloodlink.common.ErrorCodes.REQUEST_NOT_CANCELLABLE, "This request can no longer be cancelled");
        }
        request.setStatus(BloodRequestStatus.CANCELLED);
        String detail = reason == null || reason.isBlank() ? "Cancelled by administrator" : reason.trim();
        matchingService.closePending(request, MatchStatus.CANCELLED, detail);
        notificationService.notifyHospitalStaff(
                request.getHospital().getId(),
                NotificationKind.CANCELLED,
                MatchingService.publicCode(request.getId()) + " cancelled by BloodLink",
                detail,
                request.getId(),
                null
        );
        auditService.record("REQUEST_CANCELLED", "BloodRequest", request.getId(), detail);
        return toResponse(request);
    }

    public BloodRequestResponse toResponse(BloodRequest request) {
        matchingService.expireIfNeeded(request);
        MatchCountsResponse counts = matchingService.counts(request.getId());
        int fulfilled = (int) counts.completed();
        Hospital hospital = request.getHospital();
        return new BloodRequestResponse(
                request.getId(),
                MatchingService.publicCode(request.getId()),
                hospital.getId(),
                hospital.getHospitalName(),
                hospital.getCityId(),
                cityCatalog.nameOf(hospital.getCityId()),
                cityCatalog.regionOf(hospital.getCityId()),
                request.getBloodType(),
                request.getUnits(),
                fulfilled,
                Math.max(0, request.getUnits() - fulfilled),
                request.getUrgency(),
                DateTimes.iso(request.getNeededBefore()),
                request.getContactName(),
                request.getContactPhone(),
                request.getContactMethod(),
                request.getNotes(),
                request.getReference(),
                request.getReason(),
                request.getStatus(),
                MatchingService.displayStatus(request, counts),
                MatchingService.canEdit(request),
                request.getExpansion(),
                DateTimes.iso(request.getCreatedAt()),
                DateTimes.iso(request.getUpdatedAt()),
                counts
        );
    }

    private BloodRequestResponse refreshAndMap(BloodRequest request) {
        matchingService.expireIfNeeded(request);
        return toResponse(request);
    }

    private BloodRequest requireOwned(Long id) {
        Hospital hospital = currentAccess.requireHospital();
        return requestRepository.findByIdAndHospitalId(id, hospital.getId())
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.BLOOD_REQUEST_NOT_FOUND, "Blood request was not found"));
    }

    private MatchLayer expansionFor(Urgency urgency) {
        if (urgency == Urgency.CRITICAL) {
            return MatchLayer.NATIONAL;
        }
        if (urgency == Urgency.URGENT) {
            return MatchLayer.REGION;
        }
        return MatchLayer.CITY;
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
