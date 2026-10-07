package com.bloodlink.controller;

import com.bloodlink.common.enums.UserStatus;
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
import com.bloodlink.service.AdminService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/overview")
    public AdminOverviewResponse overview() {
        return adminService.overview();
    }

    @GetMapping("/hospitals")
    public List<AdminHospitalSummaryResponse> hospitals(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String verification
    ) {
        return adminService.hospitals(q, verification);
    }

    @GetMapping("/hospitals/{id}")
    public AdminHospitalSummaryResponse hospital(@PathVariable Long id) {
        return adminService.hospital(id);
    }

    @GetMapping("/hospitals/{id}/requests")
    public List<BloodRequestResponse> hospitalRequests(@PathVariable Long id) {
        return adminService.hospitalRequests(id);
    }

    @PostMapping("/hospitals/{id}/verify")
    public AdminHospitalSummaryResponse verify(@PathVariable Long id) {
        return adminService.verify(id);
    }

    @PostMapping("/hospitals/{id}/reject")
    public AdminHospitalSummaryResponse reject(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReasonRequest request
    ) {
        return adminService.reject(id, request);
    }

    @PostMapping("/hospitals/{id}/suspend")
    public AdminHospitalSummaryResponse suspendHospital(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReasonRequest request
    ) {
        return adminService.suspendHospital(id, request);
    }

    @PostMapping("/hospitals/{id}/reactivate")
    public AdminHospitalSummaryResponse reactivateHospital(@PathVariable Long id) {
        return adminService.reactivateHospital(id);
    }

    @GetMapping("/donors")
    public List<AdminDonorSummaryResponse> donors(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String bloodType,
            @RequestParam(required = false) String eligibility,
            @RequestParam(required = false) String status
    ) {
        return adminService.donors(q, bloodType, eligibility, status);
    }

    @GetMapping("/donors/{id}")
    public AdminDonorSummaryResponse donor(@PathVariable Long id) {
        return adminService.donor(id);
    }

    @GetMapping("/donors/{id}/history")
    public List<DonationResponse> donorHistory(@PathVariable Long id) {
        return adminService.donorHistory(id);
    }

    @PostMapping("/donors/{id}/suspend")
    public AdminDonorSummaryResponse suspendDonor(@PathVariable Long id) {
        return adminService.setDonorStatus(id, UserStatus.SUSPENDED);
    }

    @PostMapping("/donors/{id}/reactivate")
    public AdminDonorSummaryResponse reactivateDonor(@PathVariable Long id) {
        return adminService.setDonorStatus(id, UserStatus.ACTIVE);
    }

    @GetMapping("/requests")
    public List<BloodRequestResponse> requests(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String bloodType,
            @RequestParam(required = false) String urgency
    ) {
        return adminService.requests(q, status, bloodType, urgency);
    }

    @GetMapping("/requests/{id}")
    public BloodRequestResponse request(@PathVariable Long id) {
        return adminService.request(id);
    }

    @GetMapping("/requests/{id}/matches")
    public List<MatchResponse> requestMatches(@PathVariable Long id) {
        return adminService.requestMatches(id);
    }

    @PostMapping("/requests/{id}/cancel")
    public BloodRequestResponse cancelRequest(
            @PathVariable Long id,
            @RequestBody(required = false) AdminReasonRequest request
    ) {
        return adminService.cancelRequest(id, request);
    }

    @GetMapping("/matches")
    public List<MatchResponse> matches(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status
    ) {
        return adminService.matches(q, status);
    }

    @GetMapping("/donations")
    public List<DonationResponse> donations(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long donorId,
            @RequestParam(required = false) Long hospitalId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to
    ) {
        return adminService.donations(q, donorId, hospitalId, from, to);
    }

    @GetMapping("/users")
    public List<AdminUserSummaryResponse> users(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status
    ) {
        return adminService.users(q, role, status);
    }

    @PostMapping("/users/{id}/deactivate")
    public AdminUserSummaryResponse deactivateUser(@PathVariable Long id) {
        return adminService.setUserStatus(id, UserStatus.DEACTIVATED);
    }

    @PostMapping("/users/{id}/suspend")
    public AdminUserSummaryResponse suspendUser(@PathVariable Long id) {
        return adminService.setUserStatus(id, UserStatus.SUSPENDED);
    }

    @PostMapping("/users/{id}/reactivate")
    public AdminUserSummaryResponse reactivateUser(@PathVariable Long id) {
        return adminService.setUserStatus(id, UserStatus.ACTIVE);
    }

    @GetMapping("/notifications")
    public List<AdminNotificationResponse> notifications() {
        return adminService.notifications();
    }

    @GetMapping("/audit")
    public List<AuditLogResponse> audit() {
        return adminService.audit();
    }
}
