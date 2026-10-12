package com.raceforge.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import java.util.List;
import java.util.Set;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";
    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/auth/register", "/api/auth/verify-email", "/api/auth/resend-otp",
            "/api/auth/login", "/api/auth/google", "/api/auth/refresh",
            "/api/auth/forgot-password", "/api/auth/reset-password"
    );

    @Bean
    public OpenAPI raceForgeOpenApi() {
        return new OpenAPI()
                .info(new Info().title("RaceForge API").version("v1"))
                .components(new Components().addSecuritySchemes(BEARER_AUTH,
                        new SecurityScheme().type(SecurityScheme.Type.HTTP)
                                .scheme("bearer").bearerFormat("JWT")
                                .description("Paste the accessToken returned by login, without the Bearer prefix.")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH));
    }

    @Bean
    public OpenApiCustomizer publicEndpointSecurity() {
        return openApi -> openApi.getPaths().forEach((path, operations) -> {
            if (PUBLIC_AUTH_PATHS.contains(path) && operations.getPost() != null) {
                operations.getPost().setSecurity(List.of());
            }
            if ("/api/health".equals(path) && operations.getGet() != null) {
                operations.getGet().setSecurity(List.of());
            }
        });
    }
}
