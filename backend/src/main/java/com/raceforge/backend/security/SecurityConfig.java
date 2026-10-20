package com.raceforge.backend.security;

import static org.springframework.security.config.Customizer.withDefaults;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import com.raceforge.backend.account.AccountConstants;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, tools.jackson.databind.ObjectMapper mapper,
            @org.springframework.beans.factory.annotation.Qualifier("requestMappingHandlerMapping")
            org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping apiHandlers) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(401);
                            response.setHeader("WWW-Authenticate", "Bearer");
                            response.setContentType("application/json");
                            String message = "Authentication is required. Provide a valid, unexpired Bearer access token.";
                            mapper.writeValue(response.getOutputStream(), com.raceforge.backend.common.response.ApiResponse.failure(
                                    message, com.raceforge.backend.common.response.ErrorResponse.of(
                                            "AUTHENTICATION_REQUIRED", message, 401, request.getRequestURI())));
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            String message = "Your account does not have the role or active status required for this action.";
                            mapper.writeValue(response.getOutputStream(), com.raceforge.backend.common.response.ApiResponse.failure(
                                    message, com.raceforge.backend.common.response.ErrorResponse.of(
                                            "ACCESS_DENIED", message, 403, request.getRequestURI())));
                        }))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET,
                                "/swagger-ui.html", "/swagger-ui/**",
                                "/v3/api-docs", "/v3/api-docs/**", "/v3/api-docs.yaml"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/health", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/verify-email",
                                "/api/auth/resend-otp",
                                "/api/auth/login",
                                "/api/auth/google",
                                "/api/auth/google/set-password",
                                "/api/auth/refresh",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/staff/set-password").permitAll()
                        // Let MVC return 404 for missing API routes without granting access to any real endpoint.
                        .requestMatchers(request -> {
                            if (!request.getRequestURI().startsWith(request.getContextPath() + "/api/")) return false;
                            try {
                                return apiHandlers.getHandler(request) == null;
                            } catch (Exception exception) {
                                return false;
                            }
                        }).authenticated()
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/users/me/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users/**").hasAnyAuthority("ADMIN", "CLUB_MANAGER")
                        .requestMatchers("/api/users/**").hasAuthority("ADMIN")
                        .anyRequest().access((authentication, context) -> {
                            Object principal = authentication.get().getPrincipal();
                            boolean active = principal instanceof AuthenticatedUser user
                                    && "ACTIVE".equals(user.status())
                                    && user.roleId() != null
                                    && AccountConstants.BUSINESS_ROLES.contains(user.roleId());
                            return new AuthorizationDecision(authentication.get().isAuthenticated() && active);
                        })
                )
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(formLogin -> formLogin.disable())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
