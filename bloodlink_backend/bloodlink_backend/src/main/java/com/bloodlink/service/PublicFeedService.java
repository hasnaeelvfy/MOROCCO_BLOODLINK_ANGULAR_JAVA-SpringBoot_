package com.bloodlink.service;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.common.enums.Urgency;
import com.bloodlink.domain.CityCatalog;
import com.bloodlink.dto.response.PublicBloodRequestResponse;
import com.bloodlink.entity.BloodRequest;
import com.bloodlink.repository.BloodRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;

@Service
public class PublicFeedService {

    private static final EnumSet<BloodRequestStatus> ACTIVE = EnumSet.of(
            BloodRequestStatus.SEARCHING,
            BloodRequestStatus.PARTIAL,
            BloodRequestStatus.PAUSED
    );

    private final BloodRequestRepository requestRepository;
    private final CityCatalog cityCatalog;

    public PublicFeedService(BloodRequestRepository requestRepository, CityCatalog cityCatalog) {
        this.requestRepository = requestRepository;
        this.cityCatalog = cityCatalog;
    }

    @Transactional(readOnly = true)
    public List<PublicBloodRequestResponse> activeRequests() {
        LocalDateTime now = LocalDateTime.now();
        return requestRepository.findByStatusIn(ACTIVE).stream()
                .filter(request -> request.getNeededBefore().isAfter(now))
                .sorted(Comparator
                        .comparingInt((BloodRequest request) -> urgencyOrder(request.getUrgency()))
                        .thenComparing(BloodRequest::getCreatedAt, Comparator.reverseOrder()))
                .limit(20)
                .map(this::toPublic)
                .toList();
    }

    private PublicBloodRequestResponse toPublic(BloodRequest request) {
        return new PublicBloodRequestResponse(
                request.getId(),
                "BL-" + request.getId(),
                request.getBloodType(),
                request.getUnits(),
                cityCatalog.nameOf(request.getHospital().getCityId()),
                request.getUrgency(),
                request.getStatus().name(),
                publicDisplayStatus(request)
        );
    }

    private String publicDisplayStatus(BloodRequest request) {
        return switch (request.getStatus()) {
            case PARTIAL -> "Donors responding";
            case PAUSED -> "Paused";
            case SEARCHING -> "Search radius expanding";
            default -> "Searching for compatible donors";
        };
    }

    private int urgencyOrder(Urgency urgency) {
        return switch (urgency) {
            case CRITICAL -> 0;
            case URGENT -> 1;
            case STANDARD -> 2;
        };
    }
}
