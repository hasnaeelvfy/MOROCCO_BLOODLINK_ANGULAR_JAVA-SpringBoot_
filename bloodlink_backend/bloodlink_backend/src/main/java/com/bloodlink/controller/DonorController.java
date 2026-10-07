package com.bloodlink.controller;

import com.bloodlink.dto.request.AvailabilityRequest;
import com.bloodlink.dto.request.DeclineMatchRequest;
import com.bloodlink.dto.request.EligibilityAnswersRequest;
import com.bloodlink.dto.request.SendMessageRequest;
import com.bloodlink.dto.request.UpdateDonorProfileRequest;
import com.bloodlink.dto.response.DonationResponse;
import com.bloodlink.dto.response.DonorDashboardResponse;
import com.bloodlink.dto.response.DonorProfileResponse;
import com.bloodlink.dto.response.EligibilityResultResponse;
import com.bloodlink.dto.response.InstitutionProfileResponse;
import com.bloodlink.dto.response.MatchResponse;
import com.bloodlink.dto.response.MessageResponse;
import com.bloodlink.dto.response.NotificationResponse;
import com.bloodlink.common.enums.MatchStatus;
import com.bloodlink.service.DonorPortalService;
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
@RequestMapping("/api/v1/donor")
@PreAuthorize("hasRole('DONOR')")
public class DonorController {

    private final DonorPortalService donorPortalService;
    private final MatchingService matchingService;
    private final NotificationService notificationService;
    private final MessageService messageService;
    private final ProfileDirectoryService profileDirectoryService;

    public DonorController(
            DonorPortalService donorPortalService,
            MatchingService matchingService,
            NotificationService notificationService,
            MessageService messageService,
            ProfileDirectoryService profileDirectoryService
    ) {
        this.donorPortalService = donorPortalService;
        this.matchingService = matchingService;
        this.notificationService = notificationService;
        this.messageService = messageService;
        this.profileDirectoryService = profileDirectoryService;
    }

    @GetMapping("/profile")
    public DonorProfileResponse profile() {
        return donorPortalService.profile();
    }

    @PutMapping("/profile")
    public DonorProfileResponse updateProfile(@Valid @RequestBody UpdateDonorProfileRequest request) {
        return donorPortalService.updateProfile(request);
    }

    @PostMapping(value = "/profile/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DonorProfileResponse uploadAvatar(@RequestParam("file") MultipartFile file) {
        return donorPortalService.uploadAvatar(file);
    }

    @GetMapping("/hospitals/{id}")
    public InstitutionProfileResponse hospital(@PathVariable Long id) {
        return profileDirectoryService.hospitalForDonor(id);
    }

    @PostMapping("/availability")
    public DonorProfileResponse availability(@Valid @RequestBody AvailabilityRequest request) {
        return donorPortalService.setAvailability(request);
    }

    @PostMapping("/eligibility")
    public EligibilityResultResponse eligibility(@Valid @RequestBody EligibilityAnswersRequest request) {
        return donorPortalService.evaluate(request);
    }

    @GetMapping("/dashboard")
    public DonorDashboardResponse dashboard() {
        return donorPortalService.dashboard();
    }

    @GetMapping("/invitations")
    public List<MatchResponse> invitations() {
        return matchingService.forDonor();
    }

    @PostMapping("/invitations/{id}/accept")
    public MatchResponse accept(@PathVariable Long id) {
        return matchingService.respond(id, MatchStatus.ACCEPTED, null);
    }

    @PostMapping("/invitations/{id}/decline")
    public MatchResponse decline(@PathVariable Long id, @RequestBody(required = false) DeclineMatchRequest request) {
        return matchingService.respond(id, MatchStatus.DECLINED, request == null ? null : request.reason());
    }

    @GetMapping("/history")
    public List<DonationResponse> history() {
        return donorPortalService.history();
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
