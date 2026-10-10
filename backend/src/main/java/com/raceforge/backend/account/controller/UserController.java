package com.raceforge.backend.account.controller;

import com.raceforge.backend.account.dto.AuthDtos.MessageResponse;
import com.raceforge.backend.account.dto.AuthDtos.PageResponse;
import com.raceforge.backend.account.dto.AuthDtos.RegistrationRequestResponse;
import com.raceforge.backend.account.dto.AuthDtos.UserResponse;
import com.raceforge.backend.account.dto.GoogleLinkRequest;
import com.raceforge.backend.account.dto.UserDtos.ChangePasswordRequest;
import com.raceforge.backend.account.dto.UserDtos.UpdateMeRequest;
import com.raceforge.backend.account.dto.UserDtos.UpdateStatusRequest;
import com.raceforge.backend.account.service.UserService;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return ApiResponse.success("Current user", userService.me(currentUser.userId()));
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateMe(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody UpdateMeRequest request
    ) {
        return ApiResponse.success("Profile updated", userService.updateMe(currentUser.userId(), request));
    }

    @PutMapping("/me/password")
    public ApiResponse<MessageResponse> changePassword(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        userService.changePassword(currentUser.userId(), request);
        return ApiResponse.success("Password changed", new MessageResponse("Password changed."));
    }

    @GetMapping("/me/registration-request")
    public ApiResponse<RegistrationRequestResponse> myRegistrationRequest(
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return ApiResponse.success("Registration request", userService.myRegistrationRequest(currentUser.userId()));
    }

    @PostMapping("/me/external-logins/google")
    public ApiResponse<MessageResponse> linkGoogle(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody GoogleLinkRequest request
    ) {
        userService.linkGoogle(currentUser.userId(), request.idToken());
        return ApiResponse.success("Google linked", new MessageResponse("Google login linked."));
    }

    @GetMapping
    public ApiResponse<PageResponse<UserResponse>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String roleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success("Users", userService.listUsers(search, status, roleId, page, size));
    }

    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getUser(@PathVariable String id) {
        return ApiResponse.success("User", userService.getUser(id));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<UserResponse> updateStatus(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable String id,
            @Valid @RequestBody UpdateStatusRequest request
    ) {
        return ApiResponse.success("User status updated", userService.updateStatus(currentUser.userId(), id, request));
    }
}
