package com.bloodlink.flow;

import com.bloodlink.common.enums.Role;
import com.bloodlink.common.enums.UserStatus;
import com.bloodlink.entity.User;
import com.bloodlink.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class HospitalDonorFlowTest {

    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void hospitalAndDonorDashboardsUseDatabaseAndStayIsolated() throws Exception {
        Auth hospitalA = registerHospital("hospital-a", "Hospital A");
        Auth hospitalB = registerHospital("hospital-b", "Hospital B");
        verifyHospital(hospitalA.token());
        verifyHospital(hospitalB.token());
        Auth donor = registerDonor("donor-a", "Amal");

        mockMvc.perform(get("/api/v1/hospital/dashboard"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/hospital/dashboard")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/donor/dashboard")
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/hospital/dashboard")
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hospitalName").value("Hospital A"))
                .andExpect(jsonPath("$.stats.totalRequests").value(0))
                .andExpect(jsonPath("$.stats.activeRequests").value(0))
                .andExpect(jsonPath("$.recentRequests").isEmpty());

        mockMvc.perform(put("/api/v1/donor/profile")
                        .header("Authorization", "Bearer " + donor.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Amal",
                                  "lastName": "Benali",
                                  "phone": "+212600000099",
                                  "cin": "%s",
                                  "cityId": 1,
                                  "bloodType": "O+",
                                  "dateOfBirth": "1996-04-12",
                                  "weightKg": 62,
                                  "heightCm": 165,
                                  "preferredContact": "app",
                                  "locationConsent": true
                                }
                                """.formatted(donor.cin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bloodType").value("O+"))
                .andExpect(jsonPath("$.firstName").value("Amal"));

        mockMvc.perform(post("/api/v1/donor/availability")
                        .header("Authorization", "Bearer " + donor.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"available\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));

        String neededBefore = LocalDateTime.now().plusDays(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        MvcResult created = mockMvc.perform(post("/api/v1/hospital/requests")
                        .header("Authorization", "Bearer " + hospitalA.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bloodType": "O+",
                                  "units": 1,
                                  "urgency": "URGENT",
                                  "neededBefore": "%s",
                                  "reference": "OR-1001",
                                  "reason": "Surgical reserve",
                                  "notes": "No patient name"
                                }
                                """.formatted(neededBefore)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bloodType").value("O+"))
                .andExpect(jsonPath("$.status").value("SEARCHING"))
                .andExpect(jsonPath("$.matchCounts.total").value(1))
                .andReturn();

        Number requestId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/api/v1/hospital/dashboard")
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.totalRequests").value(1))
                .andExpect(jsonPath("$.stats.activeRequests").value(1))
                .andExpect(jsonPath("$.recentRequests[0].id").value(requestId.intValue()));

        mockMvc.perform(get("/api/v1/hospital/requests/" + requestId)
                        .header("Authorization", "Bearer " + hospitalB.token()))
                .andExpect(status().isNotFound());

        MvcResult invitations = mockMvc.perform(get("/api/v1/donor/invitations")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requestId").value(requestId.intValue()))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].hospital").value("Hospital A"))
                .andReturn();

        Number matchId = JsonPath.read(invitations.getResponse().getContentAsString(), "$[0].id");

        mockMvc.perform(get("/api/v1/hospital/requests/" + requestId + "/matches")
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].donorName").value(nullValue()))
                .andExpect(jsonPath("$[0].donorCin").value(nullValue()));

        mockMvc.perform(post("/api/v1/hospital/requests/" + requestId + "/messages")
                        .header("Authorization", "Bearer " + hospitalA.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Hello\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/donor/invitations/" + matchId + "/accept")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        mockMvc.perform(get("/api/v1/hospital/requests/" + requestId + "/matches")
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].donorName").value("Amal Benali"))
                .andExpect(jsonPath("$[0].donorPhone").value("+212600000099"))
                .andExpect(jsonPath("$[0].donorCin").value(donor.cin()));

        mockMvc.perform(post("/api/v1/hospital/requests/" + requestId + "/messages")
                        .header("Authorization", "Bearer " + hospitalA.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Please come to the blood bank.\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.from").value("hospital"));

        mockMvc.perform(get("/api/v1/donor/requests/" + requestId + "/messages")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].text").value("Please come to the blood bank."));

        mockMvc.perform(post("/api/v1/donor/requests/" + requestId + "/messages")
                        .header("Authorization", "Bearer " + donor.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"I am on my way.\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/hospital/requests/" + requestId)
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PARTIAL"))
                .andExpect(jsonPath("$.matchCounts.accepted").value(1))
                .andExpect(jsonPath("$.matchCounts.completed").value(0));

        mockMvc.perform(get("/api/v1/donor/history")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(get("/api/v1/donor/dashboard")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.donations").value(0))
                .andExpect(jsonPath("$.stats.accepted").value(1))
                .andExpect(jsonPath("$.profile.eligibility").value("eligible"));

        mockMvc.perform(post("/api/v1/hospital/matches/" + matchId + "/complete")
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(get("/api/v1/hospital/requests/" + requestId)
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FULFILLED"))
                .andExpect(jsonPath("$.matchCounts.completed").value(1));

        mockMvc.perform(get("/api/v1/donor/history")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].hospital").value("Hospital A"))
                .andExpect(jsonPath("$[0].status").value("completed"));

        mockMvc.perform(get("/api/v1/donor/dashboard")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.donations").value(1))
                .andExpect(jsonPath("$.stats.accepted").value(1))
                .andExpect(jsonPath("$.profile.eligibility").value("ineligible"));

        mockMvc.perform(put("/api/v1/donor/profile")
                        .header("Authorization", "Bearer " + donor.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Amal",
                                  "lastName": "Benali",
                                  "phone": "+212600000099",
                                  "cin": "%s",
                                  "cityId": 1,
                                  "bloodType": "O+",
                                  "dateOfBirth": "2099-01-01",
                                  "weightKg": 62
                                }
                                """.formatted(donor.cin())))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/v1/donor/profile")
                        .header("Authorization", "Bearer " + donor.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Amal",
                                  "lastName": "Benali",
                                  "phone": "+212600000099",
                                  "cin": "%s",
                                  "cityId": 1,
                                  "bloodType": "O+",
                                  "dateOfBirth": "1996-04-12",
                                  "weightKg": 62,
                                  "lastDonation": "1026-12-12"
                                }
                                """.formatted(donor.cin())))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/v1/hospital/requests/" + requestId)
                        .header("Authorization", "Bearer " + hospitalA.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\": \"should fail\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/hospital/profile")
                        .header("Authorization", "Bearer " + hospitalA.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Hospital A"));

        assertThat(hospitalA.token()).isNotBlank();
        assertThat(hospitalB.token()).isNotBlank();
    }

    @Test
    void unicodeAbMinusDonorIsInvitedToAbMinusRequest() throws Exception {
        Auth hospital = registerHospital("hospital-ab", "Hospital AB");
        verifyHospital(hospital.token());
        Auth donor = registerDonor("donor-ab", "Sara");

        mockMvc.perform(put("/api/v1/donor/profile")
                        .header("Authorization", "Bearer " + donor.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Sara",
                                  "lastName": "Benali",
                                  "phone": "+212600000077",
                                  "cin": "%s",
                                  "cityId": 1,
                                  "bloodType": "AB\u2212",
                                  "dateOfBirth": "1994-08-20",
                                  "weightKg": 58,
                                  "heightCm": 165,
                                  "preferredContact": "app",
                                  "locationConsent": true
                                }
                                """.formatted(donor.cin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bloodType").value("AB-"))
                .andExpect(jsonPath("$.available").value(true));

        String neededBefore = LocalDateTime.now().plusDays(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        MvcResult created = mockMvc.perform(post("/api/v1/hospital/requests")
                        .header("Authorization", "Bearer " + hospital.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bloodType": "AB\u2212",
                                  "units": 1,
                                  "urgency": "URGENT",
                                  "neededBefore": "%s",
                                  "reference": "OR-AB1",
                                  "reason": "Reserve",
                                  "notes": "No patient name"
                                }
                                """.formatted(neededBefore)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bloodType").value("AB-"))
                .andExpect(jsonPath("$.matchCounts.total").value(1))
                .andReturn();

        Number requestId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/api/v1/donor/invitations")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].requestId").value(requestId.intValue()))
                .andExpect(jsonPath("$[0].bloodType").value("AB-"))
                .andExpect(jsonPath("$[0].compatibility").value("Exact match"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void professionalProfilesVerificationAndPrivacyAreDatabaseBacked() throws Exception {
        Auth hospital = registerHospital("hospital-pro", "Atlas Hospital");
        Auth donor = registerDonor("donor-pro", "Nour");

        mockMvc.perform(put("/api/v1/donor/profile")
                        .header("Authorization", "Bearer " + donor.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "firstName": "Nour",
                                  "lastName": "Benali",
                                  "phone": "+212600000066",
                                  "cin": "%s",
                                  "cityId": 1,
                                  "bloodType": "O+",
                                  "dateOfBirth": "1995-03-10",
                                  "weightKg": 60,
                                  "heightCm": 165,
                                  "preferredContact": "app"
                                }
                                """.formatted(donor.cin())))
                .andExpect(status().isOk());

        MvcResult hospitalProfile = mockMvc.perform(get("/api/v1/hospital/profile")
                        .header("Authorization", "Bearer " + hospital.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verification").value("pending"))
                .andExpect(jsonPath("$.logoUrl").value(nullValue()))
                .andExpect(jsonPath("$.stats.totalRequests").value(0))
                .andReturn();
        Number hospitalId = JsonPath.read(hospitalProfile.getResponse().getContentAsString(), "$.id");

        MvcResult donorProfile = mockMvc.perform(get("/api/v1/donor/profile")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedDonations").value(0))
                .andExpect(jsonPath("$.reliabilityPercent").value(nullValue()))
                .andReturn();
        Number donorId = JsonPath.read(donorProfile.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/api/v1/donor/hospitals/" + hospitalId)
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Atlas Hospital"))
                .andExpect(jsonPath("$.verification").value("pending"))
                .andExpect(jsonPath("$.stats.completedDonations").value(0));

        mockMvc.perform(get("/api/v1/hospital/donors/" + donorId)
                        .header("Authorization", "Bearer " + hospital.token()))
                .andExpect(status().isForbidden());

        String neededBefore = LocalDateTime.now().plusDays(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        mockMvc.perform(post("/api/v1/hospital/requests")
                        .header("Authorization", "Bearer " + hospital.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bloodType": "O+",
                                  "units": 2,
                                  "urgency": "CRITICAL",
                                  "neededBefore": "%s"
                                }
                                """.formatted(neededBefore)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("HOSPITAL_NOT_VERIFIED"));

        String adminToken = createAdminToken();
        mockMvc.perform(post("/api/v1/admin/hospitals/" + hospitalId + "/verify")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verification").value("verified"));

        mockMvc.perform(post("/api/v1/hospital/requests")
                        .header("Authorization", "Bearer " + hospital.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bloodType": "O+",
                                  "units": 2,
                                  "urgency": "CRITICAL",
                                  "neededBefore": "%s"
                                }
                                """.formatted(neededBefore)))
                .andExpect(status().isCreated());

        MvcResult invitations = mockMvc.perform(get("/api/v1/donor/invitations")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].hospitalId").value(hospitalId.intValue()))
                .andExpect(jsonPath("$[0].matchScore").isNumber())
                .andExpect(jsonPath("$[0].urgency").value("CRITICAL"))
                .andReturn();
        Number matchId = JsonPath.read(invitations.getResponse().getContentAsString(), "$[0].id");

        mockMvc.perform(post("/api/v1/donor/invitations/" + matchId + "/accept")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptedAt").isNotEmpty())
                .andExpect(jsonPath("$.donorId").value(donorId.intValue()));

        mockMvc.perform(get("/api/v1/hospital/donors/" + donorId)
                        .header("Authorization", "Bearer " + hospital.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nour Benali"))
                .andExpect(jsonPath("$.acceptedRequests").value(1))
                .andExpect(jsonPath("$.completedDonations").value(0));

        mockMvc.perform(get("/api/v1/donor/history")
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(get("/api/v1/admin/audit")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").isNotEmpty());

        mockMvc.perform(get("/api/v1/donor/hospitals/" + hospitalId)
                        .header("Authorization", "Bearer " + donor.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verification").value("verified"));

        MockMultipartFile logo = new MockMultipartFile(
                "file",
                "logo.png",
                "image/png",
                new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
        );
        mockMvc.perform(multipart("/api/v1/hospital/profile/logo")
                        .file(logo)
                        .header("Authorization", "Bearer " + hospital.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logoUrl").value("/api/v1/files/hospitals/" + hospitalId.intValue() + "/logo"));

        mockMvc.perform(get("/api/v1/files/hospitals/" + hospitalId + "/logo"))
                .andExpect(status().isOk());
    }

    @Test
    void publicActiveRequestsAreVisibleWithoutJwt() throws Exception {
        mockMvc.perform(get("/api/v1/public/active-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void invalidJwtIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/hospital/dashboard")
                        .header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void changePasswordUpdatesStoredHash() throws Exception {
        Auth donor = registerDonor("donor-pwd", "Amal");
        mockMvc.perform(put("/api/v1/auth/password")
                        .header("Authorization", "Bearer " + donor.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"newpass123"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(donor.email(), PASSWORD)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"newpass123"}
                                """.formatted(donor.email())))
                .andExpect(status().isOk());
    }

    private void verifyHospital(String hospitalToken) throws Exception {
        MvcResult profile = mockMvc.perform(get("/api/v1/hospital/profile")
                        .header("Authorization", "Bearer " + hospitalToken))
                .andExpect(status().isOk())
                .andReturn();
        Number hospitalId = JsonPath.read(profile.getResponse().getContentAsString(), "$.id");
        mockMvc.perform(post("/api/v1/admin/hospitals/" + hospitalId + "/verify")
                        .header("Authorization", "Bearer " + createAdminToken()))
                .andExpect(status().isOk());
    }

    private String createAdminToken() throws Exception {
        User admin = new User();
        admin.setEmail("admin-" + UUID.randomUUID() + "@bloodlink.ma");
        admin.setPasswordHash(passwordEncoder.encode(PASSWORD));
        admin.setRole(Role.ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        userRepository.save(admin);
        MvcResult adminLogin = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(admin.getEmail(), PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(adminLogin.getResponse().getContentAsString(), "$.accessToken");
    }

    private Auth registerHospital(String prefix, String hospitalName) throws Exception {
        String email = prefix + "-" + UUID.randomUUID() + "@alamal.ma";
        String registration = prefix + "-" + UUID.randomUUID();
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register/hospital")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s",
                                  "hospitalName": "%s",
                                  "registrationNumber": "%s",
                                  "phone": "+212600000001",
                                  "address": "Avenue Hassan II",
                                  "cityId": 1
                                }
                                """.formatted(email, PASSWORD, hospitalName, registration)))
                .andExpect(status().isCreated())
                .andReturn();
        String json = result.getResponse().getContentAsString();
        return new Auth(
                JsonPath.read(json, "$.accessToken"),
                email,
                null
        );
    }

    private Auth registerDonor(String prefix, String firstName) throws Exception {
        String email = prefix + "-" + UUID.randomUUID() + "@donor.ma";
        String cin = ("AB" + UUID.randomUUID().toString().replace("-", "")).substring(0, 8).toUpperCase();
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register/donor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "password": "%s",
                                  "firstName": "%s",
                                  "lastName": "Benali",
                                  "phone": "+212600000088",
                                  "cin": "%s",
                                  "cityId": 1
                                }
                                """.formatted(email, PASSWORD, firstName, cin)))
                .andExpect(status().isCreated())
                .andReturn();
        String json = result.getResponse().getContentAsString();
        return new Auth(
                JsonPath.read(json, "$.accessToken"),
                email,
                cin
        );
    }

    private record Auth(String token, String email, String cin) {
    }
}
