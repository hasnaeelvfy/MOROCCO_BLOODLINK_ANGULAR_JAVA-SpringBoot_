package com.bloodlink.service;

import com.bloodlink.common.enums.HospitalVerificationStatus;
import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.domain.CityCatalog;
import com.bloodlink.domain.InputRules;
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
import com.bloodlink.entity.Donor;
import com.bloodlink.entity.Hospital;
import com.bloodlink.entity.PasswordResetToken;
import com.bloodlink.entity.User;
import com.bloodlink.exception.BusinessRuleException;
import com.bloodlink.exception.ConflictException;
import com.bloodlink.exception.InvalidCredentialsException;
import com.bloodlink.exception.ResourceNotFoundException;
import com.bloodlink.repository.DonorRepository;
import com.bloodlink.repository.HospitalRepository;
import com.bloodlink.repository.PasswordResetTokenRepository;
import com.bloodlink.repository.UserRepository;
import com.bloodlink.security.CurrentAccess;
import com.bloodlink.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
public class AuthService {

    static final String TOKEN_TYPE = "Bearer";
    private static final int RESET_TOKEN_HOURS = 2;

    private final UserRepository userRepository;
    private final HospitalRepository hospitalRepository;
    private final DonorRepository donorRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CityCatalog cityCatalog;
    private final CurrentAccess currentAccess;
    private final EmailGateway emailGateway;
    private final AuditService auditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            HospitalRepository hospitalRepository,
            DonorRepository donorRepository,
            PasswordResetTokenRepository resetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            CityCatalog cityCatalog,
            CurrentAccess currentAccess,
            EmailGateway emailGateway,
            AuditService auditService
    ) {
        this.userRepository = userRepository;
        this.hospitalRepository = hospitalRepository;
        this.donorRepository = donorRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.cityCatalog = cityCatalog;
        this.currentAccess = currentAccess;
        this.emailGateway = emailGateway;
        this.auditService = auditService;
    }

    @Transactional
    public AuthResponse registerHospital(HospitalRegisterRequest request) {
        if (!cityCatalog.isValid(request.cityId())) {
            throw new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.CITY_NOT_FOUND, "City was not found");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException(com.bloodlink.common.ErrorCodes.DUPLICATE_EMAIL, "Email is already registered");
        }
        if (hospitalRepository.existsByRegistrationNumber(request.registrationNumber())) {
            throw new ConflictException(com.bloodlink.common.ErrorCodes.DUPLICATE_REGISTRATION, "Hospital registration number is already registered");
        }

        Hospital hospital = new Hospital();
        hospital.setHospitalName(InputRules.requireHospitalName(request.hospitalName()));
        hospital.setRegistrationNumber(InputRules.required(request.registrationNumber(), "Hospital registration number"));
        hospital.setPhone(InputRules.requirePhone(request.phone()));
        hospital.setAddress(InputRules.required(request.address(), "Address"));
        hospital.setCityId(request.cityId());
        hospital.setEmail(request.email());
        hospital.setVerificationStatus(HospitalVerificationStatus.PENDING);
        hospital = hospitalRepository.save(hospital);

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(InputRules.requirePassword(request.password())));
        user.setRole(Role.HOSPITAL);
        user.setStatus(UserStatus.ACTIVE);
        user.setHospital(hospital);
        user = userRepository.save(user);

        String accessToken = jwtService.createAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                hospital.getId()
        );
        return new AuthResponse(
                accessToken,
                TOKEN_TYPE,
                user.getId(),
                user.getRole(),
                hospital.getId(),
                "Registration successful"
        );
    }

    @Transactional
    public AuthResponse registerDonor(DonorRegisterRequest request) {
        if (!cityCatalog.isValid(request.cityId())) {
            throw new ResourceNotFoundException(com.bloodlink.common.ErrorCodes.CITY_NOT_FOUND, "City was not found");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException(com.bloodlink.common.ErrorCodes.DUPLICATE_EMAIL, "Email is already registered");
        }
        String cin = InputRules.requireCin(request.cin());
        if (donorRepository.existsByCin(cin)) {
            throw new ConflictException(com.bloodlink.common.ErrorCodes.DUPLICATE_CIN, "CIN is already registered");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(InputRules.requirePassword(request.password())));
        user.setRole(Role.DONOR);
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        Donor donor = new Donor();
        donor.setFirstName(InputRules.requirePersonName(request.firstName(), "First name"));
        donor.setLastName(InputRules.requirePersonName(request.lastName(), "Last name"));
        donor.setPhone(InputRules.requirePhone(request.phone()));
        donor.setCin(cin);
        donor.setCityId(request.cityId());
        donor.setAvailable(true);
        donor.setUser(user);
        donorRepository.save(donor);

        String accessToken = jwtService.createAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                null
        );
        return new AuthResponse(
                accessToken,
                TOKEN_TYPE,
                user.getId(),
                user.getRole(),
                null,
                "Registration successful"
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new InvalidCredentialsException();
        }

        Long hospitalId = user.getHospital() == null ? null : user.getHospital().getId();
        String accessToken = jwtService.createAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                hospitalId
        );
        return new AuthResponse(
                accessToken,
                TOKEN_TYPE,
                user.getId(),
                user.getRole(),
                hospitalId,
                "Login successful"
        );
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse me() {
        User user = currentAccess.requireUser();
        Long hospitalId = user.getHospital() == null ? null : user.getHospital().getId();
        return new CurrentUserResponse(user.getId(), user.getEmail(), user.getRole(), hospitalId, user.getLocale());
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = currentAccess.requireUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(
                    com.bloodlink.common.ErrorCodes.CURRENT_PASSWORD_INVALID,
                    "Current password is incorrect"
            );
        }
        user.setPasswordHash(passwordEncoder.encode(InputRules.requirePassword(request.newPassword())));
        auditService.record("PASSWORD_CHANGED", "User", user.getId(), null);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.email().trim()).ifPresent(user -> {
            for (PasswordResetToken previous : resetTokenRepository.findByUser_IdAndUsedAtIsNull(user.getId())) {
                previous.setUsedAt(LocalDateTime.now());
            }
            String raw = rawResetToken();
            PasswordResetToken token = new PasswordResetToken();
            token.setUser(user);
            token.setTokenHash(hashToken(raw));
            token.setExpiresAt(LocalDateTime.now().plusHours(RESET_TOKEN_HOURS));
            resetTokenRepository.save(token);
            emailGateway.sendPasswordReset(user.getEmail(), raw);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = resetTokenRepository.findByTokenHash(hashToken(request.token()))
                .orElseThrow(() -> new BusinessRuleException(
                        com.bloodlink.common.ErrorCodes.RESET_TOKEN_INVALID,
                        "Reset token is invalid or expired"
                ));
        if (!token.isUsable()) {
            throw new BusinessRuleException(
                    com.bloodlink.common.ErrorCodes.RESET_TOKEN_INVALID,
                    "Reset token is invalid or expired"
            );
        }
        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(InputRules.requirePassword(request.newPassword())));
        token.setUsedAt(LocalDateTime.now());
        auditService.record("PASSWORD_RESET", "User", user.getId(), null);
    }

    @Transactional(readOnly = true)
    public AccountSettingsResponse settings() {
        return toSettings(currentAccess.requireUser());
    }

    @Transactional
    public AccountSettingsResponse updateSettings(AccountSettingsRequest request) {
        User user = currentAccess.requireUser();
        if (request.locale() != null) {
            user.setLocale(InputRules.requireLocale(request.locale()));
        }
        if (request.notifyInvitations() != null) {
            user.setNotifyInvitations(request.notifyInvitations());
        }
        if (request.notifyStatus() != null) {
            user.setNotifyStatus(request.notifyStatus());
        }
        if (request.notifyReminders() != null) {
            user.setNotifyReminders(request.notifyReminders());
        }
        return toSettings(user);
    }

    private AccountSettingsResponse toSettings(User user) {
        return new AccountSettingsResponse(
                user.getLocale() == null ? "ar-MA" : user.getLocale(),
                user.isNotifyInvitations(),
                user.isNotifyStatus(),
                user.isNotifyReminders()
        );
    }

    private String rawResetToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String hashToken(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is required");
        }
    }
}
