package com.raceforge.backend.account.controller;

import com.raceforge.backend.account.dto.AuthDtos.AuthResponse;
import com.raceforge.backend.account.dto.AuthDtos.ForgotPasswordRequest;
import com.raceforge.backend.account.dto.AuthDtos.GoogleAuthRequest;
import com.raceforge.backend.account.dto.AuthDtos.LoginRequest;
import com.raceforge.backend.account.dto.AuthDtos.MessageResponse;
import com.raceforge.backend.account.dto.AuthDtos.RefreshRequest;
import com.raceforge.backend.account.dto.AuthDtos.RegisterRequest;
import com.raceforge.backend.account.dto.AuthDtos.ResetPasswordRequest;
import com.raceforge.backend.account.dto.AuthDtos.ResendOtpRequest;
import com.raceforge.backend.account.dto.AuthDtos.VerifyEmailRequest;
import com.raceforge.backend.account.service.AuthService;
import com.raceforge.backend.account.service.AuthService.AuthSession;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.config.AuthProperties;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthProperties properties;

    public AuthController(AuthService authService, AuthProperties properties) {
        this.authService = authService;
        this.properties = properties;
    }

    @PostMapping("/register")
    public ApiResponse<MessageResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success("Registration started", authService.register(request));
    }

    @PostMapping("/verify-email")
    public ApiResponse<MessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ApiResponse.success("Email verified", authService.verifyEmail(request));
    }

    @PostMapping("/resend-otp")
    public ApiResponse<MessageResponse> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        return ApiResponse.success("OTP sent", authService.resendOtp(request));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthSession session = authService.login(request);
        setRefreshCookie(response, session.refreshToken());
        return ApiResponse.success("Logged in", authService.toAuthResponse(session));
    }

    @PostMapping("/google")
    public ApiResponse<AuthResponse> google(@Valid @RequestBody GoogleAuthRequest request, HttpServletResponse response) {
        AuthSession session = authService.googleLogin(request);
        setRefreshCookie(response, session.refreshToken());
        return ApiResponse.success("Logged in", authService.toAuthResponse(session));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(
            @RequestBody(required = false) RefreshRequest request,
            @CookieValue(name = "${raceforge.refresh-token.cookie-name}", required = false) String refreshCookie,
            HttpServletResponse response
    ) {
        AuthSession session = authService.refresh(request == null ? new RefreshRequest(null) : request, refreshCookie);
        setRefreshCookie(response, session.refreshToken());
        return ApiResponse.success("Token refreshed", authService.toAuthResponse(session));
    }

    @PostMapping("/logout")
    public ApiResponse<MessageResponse> logout(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestBody(required = false) RefreshRequest request,
            @CookieValue(name = "${raceforge.refresh-token.cookie-name}", required = false) String refreshCookie,
            HttpServletResponse response
    ) {
        String rawToken = request != null && request.refreshToken() != null ? request.refreshToken() : refreshCookie;
        MessageResponse result = authService.logout(currentUser.userId(), rawToken);
        clearRefreshCookie(response);
        return ApiResponse.success("Logged out", result);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return ApiResponse.success("Password reset requested", authService.forgotPassword(request));
    }

    @PostMapping("/reset-password")
    public ApiResponse<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ApiResponse.success("Password reset", authService.resetPassword(request));
    }

    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(properties.getRefreshToken().getCookieName(), refreshToken)
                .httpOnly(true)
                .secure(properties.getRefreshToken().isSecureCookie())
                .sameSite(properties.getRefreshToken().getSameSite())
                .path("/api/auth")
                .maxAge(Duration.ofDays(properties.getRefreshToken().getDays()))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(properties.getRefreshToken().getCookieName(), "")
                .httpOnly(true)
                .secure(properties.getRefreshToken().isSecureCookie())
                .sameSite(properties.getRefreshToken().getSameSite())
                .path("/api/auth")
                .maxAge(Duration.ZERO)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
