package com.bloodlink.controller;

import com.bloodlink.dto.auth.AuthResponse;
import com.bloodlink.dto.auth.CurrentUserResponse;
import com.bloodlink.dto.auth.DonorRegisterRequest;
import com.bloodlink.dto.auth.HospitalRegisterRequest;
import com.bloodlink.dto.auth.LoginRequest;
import com.bloodlink.dto.request.AccountSettingsRequest;
import com.bloodlink.dto.request.ChangePasswordRequest;
import com.bloodlink.dto.request.ForgotPasswordRequest;
import com.bloodlink.dto.request.ResetPasswordRequest;
import com.bloodlink.dto.response.AccountSettingsResponse;
import com.bloodlink.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register/hospital")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerHospital(@Valid @RequestBody HospitalRegisterRequest request) {
        return authService.registerHospital(request);
    }

    @PostMapping("/register/donor")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerDonor(@Valid @RequestBody DonorRegisterRequest request) {
        return authService.registerDonor(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public CurrentUserResponse me() {
        return authService.me();
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
    }

    @GetMapping("/settings")
    public AccountSettingsResponse settings() {
        return authService.settings();
    }

    @PutMapping("/settings")
    public AccountSettingsResponse updateSettings(@RequestBody AccountSettingsRequest request) {
        return authService.updateSettings(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
        // Stateless JWT: the client must discard bloodlink.accessToken. The server does not revoke tokens.
    }
}
