package com.bloodlink.auth;

import com.bloodlink.common.enums.HospitalVerificationStatus;
import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.entity.Hospital;
import com.bloodlink.entity.User;
import com.bloodlink.repository.HospitalRepository;
import com.bloodlink.repository.UserRepository;
import com.bloodlink.security.JwtService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class HospitalAuthTest {

    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HospitalRepository hospitalRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Test
    void healthRemainsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void hospitalRegistrationCreatesHospitalAndFirstUser() throws Exception {
        String email = uniqueEmail("register");
        String registrationNumber = uniqueRegistration("REG");
        AuthResult response = registerHospital(email, registrationNumber, "Hopital Al Amal");

        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.role()).isEqualTo("HOSPITAL");
        assertThat(response.userId()).isNotNull();
        assertThat(response.hospitalId()).isNotNull();
        assertThat(response.message()).isEqualTo("Registration successful");

        User user = userRepository.findByEmail(email).orElseThrow();
        Hospital hospital = hospitalRepository.findById(response.hospitalId()).orElseThrow();

        assertThat(user.getId()).isEqualTo(response.userId());
        assertThat(user.getRole()).isEqualTo(Role.HOSPITAL);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getHospital().getId()).isEqualTo(hospital.getId());
        assertThat(hospital.getHospitalName()).isEqualTo("Hopital Al Amal");
        assertThat(hospital.getRegistrationNumber()).isEqualTo(registrationNumber);
        assertThat(hospital.getVerificationStatus()).isEqualTo(HospitalVerificationStatus.PENDING);
        assertThat(user.getPasswordHash()).startsWith("$2");
        assertThat(user.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, user.getPasswordHash())).isTrue();
    }

    @Test
    void hospitalCanHaveMultipleUsers() throws Exception {
        String firstEmail = uniqueEmail("first");
        String registrationNumber = uniqueRegistration("MULTI");
        AuthResult first = registerHospital(firstEmail, registrationNumber, "Shared Hospital");
        Hospital hospital = hospitalRepository.findById(first.hospitalId()).orElseThrow();

        User second = new User();
        second.setEmail(uniqueEmail("second"));
        second.setPasswordHash(passwordEncoder.encode(PASSWORD));
        second.setRole(Role.HOSPITAL);
        second.setStatus(UserStatus.ACTIVE);
        second.setHospital(hospital);
        userRepository.saveAndFlush(second);

        List<User> users = userRepository.findByHospital_Id(hospital.getId());
        assertThat(users).hasSize(2);
        assertThat(users).extracting(User::getEmail).contains(firstEmail, second.getEmail());
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        String email = uniqueEmail("dup-email");
        registerHospital(email, uniqueRegistration("DUP-E1"), "Hospital One");

        mockMvc.perform(post("/api/v1/auth/register/hospital")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, uniqueRegistration("DUP-E2"), "Hospital Two", 2L)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("CONFLICT"));
    }

    @Test
    void duplicateRegistrationNumberIsRejected() throws Exception {
        String registrationNumber = uniqueRegistration("DUP-R");
        registerHospital(uniqueEmail("dup-reg-1"), registrationNumber, "Hospital One");

        mockMvc.perform(post("/api/v1/auth/register/hospital")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(uniqueEmail("dup-reg-2"), registrationNumber, "Hospital Two", 3L)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("CONFLICT"));
    }

    @Test
    void loginWithCorrectCredentialsReturnsJwtIdentity() throws Exception {
        String email = uniqueEmail("login");
        AuthResult registered = registerHospital(email, uniqueRegistration("LOGIN"), "Login Hospital");

        AuthResult login = login(email, PASSWORD);

        assertThat(login.accessToken()).isNotBlank();
        assertThat(login.tokenType()).isEqualTo("Bearer");
        assertThat(login.userId()).isEqualTo(registered.userId());
        assertThat(login.role()).isEqualTo("HOSPITAL");
        assertThat(login.hospitalId()).isEqualTo(registered.hospitalId());
        assertThat(login.message()).isEqualTo("Login successful");

        Jwt jwt = jwtService.decode(login.accessToken());
        assertThat(toLong(jwt.getClaim("userId"))).isEqualTo(registered.userId());
        assertThat(jwt.getClaimAsString("email")).isEqualTo(email);
        assertThat(jwt.getClaimAsString("role")).isEqualTo("HOSPITAL");
        assertThat(toLong(jwt.getClaim("hospitalId"))).isEqualTo(registered.hospitalId());
        assertThat(jwt.getClaimAsString("role")).isNotEqualTo("ADMIN");
    }

    @Test
    void loginWithWrongPasswordFailsWithoutRevealingAccount() throws Exception {
        String email = uniqueEmail("wrong-pass");
        registerHospital(email, uniqueRegistration("WP"), "Wrong Password Hospital");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void loginWithUnknownEmailFailsWithGenericMessage() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson("missing-" + UUID.randomUUID() + "@alamal.ma", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void validationErrorsReturnBadRequest() throws Exception {
        String invalidJson = """
                {
                  "email": "not-an-email",
                  "password": "short",
                  "hospitalName": "",
                  "registrationNumber": "",
                  "phone": "",
                  "address": "",
                  "cityId": null
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register/hospital")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    @Test
    void protectedEndpointsRejectUnauthenticatedRequests() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedContextExposesHospitalIdentityAndIsNotAdmin() throws Exception {
        String email = uniqueEmail("me");
        AuthResult registered = registerHospital(email, uniqueRegistration("ME"), "Context Hospital");

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + registered.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(registered.userId()))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("HOSPITAL"))
                .andExpect(jsonPath("$.hospitalId").value(registered.hospitalId()));

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + registered.accessToken()))
                .andExpect(status().isForbidden());
    }

    private AuthResult registerHospital(String email, String registrationNumber, String hospitalName) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register/hospital")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, registrationNumber, hospitalName, 1L)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.role").value("HOSPITAL"))
                .andReturn();
        return AuthResult.from(result.getResponse().getContentAsString());
    }

    private AuthResult login(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();
        return AuthResult.from(result.getResponse().getContentAsString());
    }

    private static String registerJson(String email, String registrationNumber, String hospitalName, Long cityId) {
        return """
                {
                  "email": "%s",
                  "password": "%s",
                  "hospitalName": "%s",
                  "registrationNumber": "%s",
                  "phone": "+212600000001",
                  "address": "Casablanca",
                  "cityId": %d
                }
                """.formatted(email, PASSWORD, hospitalName, registrationNumber, cityId);
    }

    private static String loginJson(String email, String password) {
        return """
                {
                  "email": "%s",
                  "password": "%s"
                }
                """.formatted(email, password);
    }

    private static String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@alamal.ma";
    }

    private static String uniqueRegistration(String prefix) {
        return prefix + "-" + UUID.randomUUID();
    }

    private static Long toLong(Object value) {
        assertThat(value).isInstanceOf(Number.class);
        return ((Number) value).longValue();
    }

    private record AuthResult(
            String accessToken,
            String tokenType,
            Long userId,
            String role,
            Long hospitalId,
            String message
    ) {
        static AuthResult from(String json) {
            return new AuthResult(
                    JsonPath.read(json, "$.accessToken"),
                    JsonPath.read(json, "$.tokenType"),
                    toLong(JsonPath.read(json, "$.userId")),
                    JsonPath.read(json, "$.role"),
                    toLong(JsonPath.read(json, "$.hospitalId")),
                    JsonPath.read(json, "$.message")
            );
        }
    }
}
