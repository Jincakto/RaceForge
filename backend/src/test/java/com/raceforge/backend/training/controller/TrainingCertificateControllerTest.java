package com.raceforge.backend.training.controller;

import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.config.AuthProperties;
import com.raceforge.backend.security.AuthenticatedUser;
import com.raceforge.backend.security.JwtService;
import com.raceforge.backend.security.SecurityConfig;
import com.raceforge.backend.training.entity.HorsePackage;
import com.raceforge.backend.training.entity.TrainingCertificate;
import com.raceforge.backend.training.mapper.HorsePackageMapper;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import com.raceforge.backend.training.repository.TrainingCertificateRepository;
import com.raceforge.backend.training.service.HorsePackageService;
import com.raceforge.backend.training.service.TrainingCertificateAccess;
import com.raceforge.backend.training.service.TrainingCertificatePdf;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HorsePackageController.class)
@Import({SecurityConfig.class, AuthProperties.class, TrainingCertificateAccess.class, TrainingCertificatePdf.class})
class TrainingCertificateControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean HorsePackageService horsePackages;
    @MockitoBean com.raceforge.backend.training.service.HorsePackageLifecycleService lifecycle;
    @MockitoBean HorsePackageRepository packages;
    @MockitoBean TrainingCertificateRepository certificates;
    @MockitoBean HorsePackageMapper mapper;
    @MockitoBean UserRepository users;
    @MockitoBean JwtService jwt;

    @Test
    void certificateDownloadRequiresTheHorseOwner() throws Exception {
        String id = "HPG-010";
        String path = "/api/horse-packages/" + id + "/certificate";
        var certificate = new TrainingCertificate(id, "Ánh Dương", LocalDate.of(2026, 1, 12));
        when(packages.findByHorsePackageIdAndHorse_Owner_UserId(id, "OWN-010"))
                .thenReturn(Optional.of(new HorsePackage()));
        when(certificates.findById(id)).thenReturn(Optional.of(certificate));

        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).with(authentication(user("CM-010", "CLUB_MANAGER", 1))))
                .andExpect(status().isForbidden());
        mvc.perform(get(path).with(authentication(user("OWN-011", "HORSE_OWNER", 5))))
                .andExpect(status().isNotFound());
        mvc.perform(get(path).with(authentication(user("OWN-010", "HORSE_OWNER", 5))))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition", containsString("RF-HPG-010.pdf")));
        mvc.perform(get("/api/horse-packages/" + id).with(authentication(user("OWN-010", "HORSE_OWNER", 5))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.certificate.certificateNumber").value("RF-HPG-010"))
                .andExpect(jsonPath("$.data.certificate.issueDate").value("2026-01-12"));
    }

    private static UsernamePasswordAuthenticationToken user(String id, String role, int roleId) {
        var principal = new AuthenticatedUser(id, "test@example.invalid", "ACTIVE", roleId, role);
        return new UsernamePasswordAuthenticationToken(principal, null, List.of(new SimpleGrantedAuthority(role)));
    }
}
