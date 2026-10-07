package com.bloodlink.service;

import com.bloodlink.common.enums.BloodRequestStatus;
import com.bloodlink.domain.BloodTypes;
import com.bloodlink.entity.BloodRequest;
import com.bloodlink.entity.Donor;
import com.bloodlink.repository.BloodRequestRepository;
import com.bloodlink.repository.DonorRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;

@Component
public class OpenRequestMatchingRepair {

    private final DonorRepository donorRepository;
    private final BloodRequestRepository requestRepository;
    private final MatchingService matchingService;

    public OpenRequestMatchingRepair(
            DonorRepository donorRepository,
            BloodRequestRepository requestRepository,
            MatchingService matchingService
    ) {
        this.donorRepository = donorRepository;
        this.requestRepository = requestRepository;
        this.matchingService = matchingService;
    }

    @Transactional
    @EventListener(ApplicationReadyEvent.class)
    public void normalizeTypesAndInviteOpenRequests() {
        List<Donor> donors = donorRepository.findAll();
        for (Donor donor : donors) {
            String normalized = BloodTypes.normalize(donor.getBloodType());
            if (normalized != null && BloodTypes.ALL.contains(normalized)) {
                donor.setBloodType(normalized);
            }
        }
        donorRepository.flush();

        List<BloodRequest> open = requestRepository.findByStatusIn(EnumSet.of(
                BloodRequestStatus.SEARCHING,
                BloodRequestStatus.PARTIAL
        ));
        for (BloodRequest request : open) {
            String normalized = BloodTypes.normalize(request.getBloodType());
            if (normalized != null && BloodTypes.ALL.contains(normalized)) {
                request.setBloodType(normalized);
            }
            matchingService.inviteCompatibleDonors(request);
        }
    }
}
