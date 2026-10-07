package com.bloodlink.controller;

import com.bloodlink.dto.request.CancelMatchRequest;
import com.bloodlink.dto.request.CreateBloodRequestRequest;
import com.bloodlink.dto.request.ScheduleMatchRequest;
import com.bloodlink.dto.request.SendMessageRequest;
import com.bloodlink.dto.request.UpdateBloodRequestRequest;
import com.bloodlink.dto.request.UpdateHospitalProfileRequest;
import com.bloodlink.dto.response.BloodRequestResponse;
import com.bloodlink.dto.response.ConnectedDonorProfileResponse;
import com.bloodlink.dto.response.HospitalDashboardResponse;
import com.bloodlink.dto.response.HospitalProfileResponse;
import com.bloodlink.dto.response.InstitutionProfileResponse;
import com.bloodlink.dto.response.MatchResponse;
import com.bloodlink.dto.response.MessageResponse;
import com.bloodlink.dto.response.NotificationResponse;
import com.bloodlink.service.BloodRequestService;
import com.bloodlink.service.HospitalPortalService;
import com.bloodlink.service.MatchingService;
import com.bloodlink.service.MessageService;
import com.bloodlink.service.NotificationService;
import com.bloodlink.service.ProfileDirectoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hospital")
@PreAuthorize("hasRole('HOSPITAL')")
public class HospitalController {

    private final HospitalPortalService hospitalPortalService;
    private final BloodRequestService bloodRequestService;
    private final MatchingService matchingService;
    private final NotificationService notificationService;
    private final MessageService messageService;
    private final ProfileDirectoryService profileDirectoryService;

    public HospitalController(
            HospitalPortalService hospitalPortalService,
            BloodRequestService bloodRequestService,
            MatchingService matchingService,
            NotificationService notificationService,
            MessageService messageService,
            ProfileDirectoryService profileDirectoryService
    ) {
        this.hospitalPortalService = hospitalPortalService;
        this.bloodRequestService = bloodRequestService;
        this.matchingService = matchingService;
        this.notificationService = notificationService;
        this.messageService = messageService;
        this.profileDirectoryService = profileDirectoryService;
    }

    @GetMapping("/profile")
    public HospitalProfileResponse profile() {
        return hospitalPortalService.profile();
    }

    @PutMapping("/profile")
    public HospitalProfileResponse updateProfile(@Valid @RequestBody UpdateHospitalProfileRequest request) {
        return hospitalPortalService.updateProfile(request);
    }

    @PostMapping(value = "/profile/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public HospitalProfileResponse uploadLogo(@RequestParam("file") MultipartFile file) {
        return hospitalPortalService.uploadLogo(file);
    }

    @GetMapping("/institution")
    public InstitutionProfileResponse institution() {
        return profileDirectoryService.ownInstitution();
    }

    @GetMapping("/donors/{id}")
    public ConnectedDonorProfileResponse connectedDonor(@PathVariable Long id) {
        return profileDirectoryService.donorForHospital(id);
    }

    @GetMapping("/dashboard")
    public HospitalDashboardResponse dashboard() {
        return hospitalPortalService.dashboard();
    }

    @GetMapping("/requests")
    public List<BloodRequestResponse> requests() {
        return bloodRequestService.listMine();
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public BloodRequestResponse createRequest(@Valid @RequestBody CreateBloodRequestRequest request) {
        return bloodRequestService.create(request);
    }

    @GetMapping("/requests/{id}")
    public BloodRequestResponse request(@PathVariable Long id) {
        return bloodRequestService.getMine(id);
    }

    @PutMapping("/requests/{id}")
    public BloodRequestResponse updateRequest(@PathVariable Long id, @Valid @RequestBody UpdateBloodRequestRequest request) {
        return bloodRequestService.update(id, request);
    }

    @PostMapping("/requests/{id}/cancel")
    public BloodRequestResponse cancelRequest(@PathVariable Long id) {
        return bloodRequestService.cancel(id);
    }

    @GetMapping("/requests/{id}/matches")
    public List<MatchResponse> requestMatches(@PathVariable Long id) {
        return matchingService.forHospitalRequest(id);
    }

    @GetMapping("/matches")
    public List<MatchResponse> matches() {
        return matchingService.forHospital();
    }

    @PostMapping("/matches/{id}/contact")
    public MatchResponse contactMatch(@PathVariable Long id) {
        return matchingService.contact(id);
    }

    @PostMapping("/matches/{id}/schedule")
    public MatchResponse scheduleMatch(@PathVariable Long id, @Valid @RequestBody ScheduleMatchRequest request) {
        return matchingService.schedule(id, request.scheduledAt());
    }

    @PostMapping("/matches/{id}/complete")
    public MatchResponse completeMatch(@PathVariable Long id) {
        return matchingService.complete(id);
    }

    @PostMapping("/matches/{id}/cancel-donation")
    public MatchResponse cancelDonation(
            @PathVariable Long id,
            @RequestBody(required = false) CancelMatchRequest request
    ) {
        boolean noShow = request != null && Boolean.TRUE.equals(request.noShow());
        String reason = request == null ? null : request.reason();
        return matchingService.cancelEngagement(id, reason, noShow);
    }

    @GetMapping("/requests/{id}/messages")
    public List<MessageResponse> messages(@PathVariable Long id) {
        return messageService.list(id);
    }

    @PostMapping("/requests/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse sendMessage(@PathVariable Long id, @Valid @RequestBody SendMessageRequest request) {
        return messageService.send(id, request);
    }

    @GetMapping("/notifications")
    public List<NotificationResponse> notifications() {
        return notificationService.mine();
    }

    @PostMapping("/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable Long id) {
        notificationService.markRead(id);
    }

    @PostMapping("/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead() {
        notificationService.markAllRead();
    }
}
