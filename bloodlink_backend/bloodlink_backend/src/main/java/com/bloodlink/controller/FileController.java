package com.bloodlink.controller;

import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.common.enums.Role;
import com.bloodlink.entity.Donor;
import com.bloodlink.entity.Hospital;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.BloodMatchRepository;
import com.bloodlink.repository.DonorRepository;
import com.bloodlink.repository.HospitalRepository;
import com.bloodlink.security.AuthUser;
import com.bloodlink.security.CurrentAccess;
import com.bloodlink.service.FileStorageService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final HospitalRepository hospitalRepository;
    private final DonorRepository donorRepository;
    private final BloodMatchRepository matchRepository;
    private final FileStorageService fileStorageService;
    private final CurrentAccess currentAccess;

    public FileController(
            HospitalRepository hospitalRepository,
            DonorRepository donorRepository,
            BloodMatchRepository matchRepository,
            FileStorageService fileStorageService,
            CurrentAccess currentAccess
    ) {
        this.hospitalRepository = hospitalRepository;
        this.donorRepository = donorRepository;
        this.matchRepository = matchRepository;
        this.fileStorageService = fileStorageService;
        this.currentAccess = currentAccess;
    }

    @GetMapping("/hospitals/{id}/logo")
    public ResponseEntity<Resource> hospitalLogo(@PathVariable Long id) {
        Hospital hospital = hospitalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.HOSPITAL_NOT_FOUND, "Hospital was not found"));
        return fileResponse(hospital.getLogoFileName(), true);
    }

    @GetMapping("/donors/{id}/avatar")
    public ResponseEntity<Resource> donorAvatar(@PathVariable Long id) {
        AuthUser auth = currentAccess.requireAuth();
        Donor donor = donorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.DONOR_NOT_FOUND, "Donor was not found"));
        boolean self = auth.role() == Role.DONOR && currentAccess.requireDonor().getId().equals(id);
        boolean hospitalWithMatch = auth.role() == Role.HOSPITAL
                && auth.hospitalId() != null
                && matchRepository.existsByBloodRequest_Hospital_IdAndDonor_IdAndStatusIn(
                        auth.hospitalId(),
                        donor.getId(),
                        java.util.EnumSet.of(
                                MatchStatus.ACCEPTED,
                                MatchStatus.CONTACTED,
                                MatchStatus.SCHEDULED,
                                MatchStatus.COMPLETED
                        ));
        boolean admin = auth.role() == Role.ADMIN;
        if (!self && !hospitalWithMatch && !admin) {
            throw new AccessDeniedException("Donor photo is available after the donor accepts your request");
        }
        return fileResponse(donor.getAvatarFileName(), false);
    }

    private ResponseEntity<Resource> fileResponse(String relativePath, boolean publicCache) {
        Path path = fileStorageService.resolve(relativePath);
        if (path == null) {
            throw new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.IMAGE_NOT_FOUND, "Image was not found");
        }
        CacheControl cache = publicCache
                ? CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic()
                : CacheControl.noStore();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(fileStorageService.contentType(relativePath)))
                .cacheControl(cache)
                .body(new FileSystemResource(path));
    }
}
