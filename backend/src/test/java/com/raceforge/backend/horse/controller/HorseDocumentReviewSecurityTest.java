package com.raceforge.backend.horse.controller;

import com.raceforge.backend.horse.service.HorseDocumentReviewService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HorseDocumentReviewSecurityTest {
    @Configuration @EnableMethodSecurity
    static class Config {
        @Bean HorseDocumentReviewService service() { return mock(HorseDocumentReviewService.class); }
        @Bean HorseDocumentReviewController controller(HorseDocumentReviewService service) { return new HorseDocumentReviewController(service); }
    }
    @Test void ownerAndVetCannotFetchPrivateComparisonEvenByCallingEndpointDirectly() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var controller = context.getBean(HorseDocumentReviewController.class);
            var service = context.getBean(HorseDocumentReviewService.class);
            for (String role : List.of("HORSE_OWNER", "VETERINARIAN", "ADMIN")) {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("actor", "", List.of(new SimpleGrantedAuthority(role))));
                assertThrows(AccessDeniedException.class, () -> controller.review("HOR-001"));
            }
            verifyNoInteractions(service);
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("cm", "", List.of(new SimpleGrantedAuthority("CLUB_MANAGER"))));
            assertDoesNotThrow(() -> controller.review("HOR-001"));
            verify(service).review("HOR-001");
        } finally { SecurityContextHolder.clearContext(); }
    }
}
