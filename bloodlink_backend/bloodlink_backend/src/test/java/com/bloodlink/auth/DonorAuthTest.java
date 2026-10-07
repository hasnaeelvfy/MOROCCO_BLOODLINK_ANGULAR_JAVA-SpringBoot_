package com.bloodlink.auth;

import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.entity.Donor;
import com.bloodlink.entity.User;
import com.bloodlink.repository.DonorRepository;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DonorAuthTest {

    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DonorRepository donorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Test
    void donorRegistrationCreatesUserAndDonorProfile() throws Exception {
        String email = uniqueEmail("donor");
        String cin = uniqueCin();
        AuthResult response = registerDonor(email, cin, "Amal");

        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.role()).isEqualTo("DONOR");
        assertThat(response.userId()).isNotNull();
        assertThat(response.hospitalId()).isNull();

        User user = userRepository.findByEmail(email).orElseThrow();
        Donor donor = donorRepository.findByUser_Id(user.getId()).orElseThrow();

        assertThat(user.getRole()).isEqualTo(Role.DONOR);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getHospital()).isNull();
        assertThat(user.getPasswordHash()).startsWith("$2");
        assertThat(user.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, user.getPasswordHash())).isTrue();
        assertThat(donor.getFirstName()).isEqualTo("Amal");
        assertThat(donor.getCin()).isEqualTo(cin);
        assertThat(donor.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    void corsPreflightAllowsAngularLoopbackOrigins() throws Exception {
        mockMvc.perform(options("/api/v1/auth/register/donor")
                        .header("Origin", "http://127.0.0.1:4200")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:4200"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));

        mockMvc.perform(options("/api/v1/auth/register/donor")
                        .header("Origin", "http://localhost:4200")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"));
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {
        String email = uniqueEmail("dup-email");
        registerDonor(email, uniqueCin(), "Amal");

        mockMvc.perform(post("/api/v1/auth/register/donor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, uniqueCin(), "Sara")))
                .andExpect(status().isConflict());
    }

    @Test
    void duplicateCinIsRejected() throws Exception {
        String cin = uniqueCin();
        registerDonor(uniqueEmail("dup-cin-1"), cin, "Amal");

        mockMvc.perform(post("/api/v1/auth/register/donor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(uniqueEmail("dup-cin-2"), cin, "Sara")))
                .andExpect(status().isConflict());
    }

    @Test
    void loginReturnsDonorJwtWithoutHospitalRole() throws Exception {
        String email = uniqueEmail("login");
        AuthResult registered = registerDonor(email, uniqueCin(), "Amal");

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("DONOR"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();

        AuthResult login = AuthResult.from(result.getResponse().getContentAsString());
        Jwt jwt = jwtService.decode(login.accessToken());
        assertThat(jwt.getClaimAsString("role")).isEqualTo("DONOR");
        assertThat(jwt.getClaimAsString("role")).isNotEqualTo("HOSPITAL");
        assertThat(jwt.getClaimAsString("role")).isNotEqualTo("ADMIN");
        assertThat(jwt.getClaimAsString("email")).isEqualTo(email);
        assertThat(toLong(jwt.getClaim("userId"))).isEqualTo(registered.userId());
        assertThat((Object) jwt.getClaim("hospitalId")).isNull();
    }

    @Test
    void loginWithWrongPasswordFails() throws Exception {
        String email = uniqueEmail("wrong");
        registerDonor(email, uniqueCin(), "Amal");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(email, "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void donorCanReadMeAndIsNotAdmin() throws Exception {
        AuthResult registered = registerDonor(uniqueEmail("me"), uniqueCin(), "Amal");

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + registered.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("DONOR"))
                .andExpect(jsonPath("$.userId").value(registered.userId()));

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + registered.accessToken()))
                .andExpect(status().isForbidden());
    }

    private AuthResult registerDonor(String email, String cin, String firstName) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register/donor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(email, cin, firstName)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("DONOR"))
                .andReturn();
        return AuthResult.from(result.getResponse().getContentAsString());
    }

    private static String registerJson(String email, String cin, String firstName) {
        return """
                {
                  "email": "%s",
                  "password": "%s",
                  "firstName": "%s",
                  "lastName": "Benali",
                  "phone": "+212600000011",
                  "cin": "%s",
                  "cityId": 1
                }
                """.formatted(email, PASSWORD, firstName, cin);
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
        return prefix + "-" + UUID.randomUUID() + "@bloodlink.ma";
    }

    private static String uniqueCin() {
        return "BE" + UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
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
            Object hospitalId = JsonPath.read(json, "$.hospitalId");
            return new AuthResult(
                    JsonPath.read(json, "$.accessToken"),
                    JsonPath.read(json, "$.tokenType"),
                    toLong(JsonPath.read(json, "$.userId")),
                    JsonPath.read(json, "$.role"),
                    hospitalId == null ? null : toLong(hospitalId),
                    JsonPath.read(json, "$.message")
            );
        }
    }
}
