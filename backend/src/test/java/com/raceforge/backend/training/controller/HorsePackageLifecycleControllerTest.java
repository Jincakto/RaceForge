package com.raceforge.backend.training.controller;

import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.config.AuthProperties;
import com.raceforge.backend.permission.service.PermissionAccess;
import com.raceforge.backend.security.*;
import com.raceforge.backend.training.dto.HorsePackageLifecycleResponse;
import com.raceforge.backend.training.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HorsePackageController.class)
@Import({SecurityConfig.class, AuthProperties.class})
class HorsePackageLifecycleControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean HorsePackageService packages;
    @MockitoBean HorsePackageLifecycleService lifecycle;
    @MockitoBean TrainingCertificateAccess certificates;
    @MockitoBean TrainingCertificatePdf pdf;
    @MockitoBean UserRepository users;
    @MockitoBean JwtService jwt;
    @MockitoBean(name="permissionAccess") PermissionAccess access;
    final String base="/api/horse-packages/HPG-001";
    UsernamePasswordAuthenticationToken user(String role,String status) {
        var p=new AuthenticatedUser("TEST-001","test@example.invalid",status,1,role);
        return new UsernamePasswordAuthenticationToken(p,null,List.of(new SimpleGrantedAuthority(role)));
    }
    @Test void anonymousCannotCancelOrComplete() throws Exception {
        mvc.perform(patch(base+"/cancel")).andExpect(status().isUnauthorized());
        mvc.perform(patch(base+"/complete")).andExpect(status().isUnauthorized()); verifyNoInteractions(lifecycle);
    }
    @Test void ownerCanCancelWithoutRequestBody() throws Exception {
        when(lifecycle.cancel("HPG-001")).thenReturn(new HorsePackageLifecycleResponse(null,3,null));
        mvc.perform(patch(base+"/cancel").with(authentication(user("HORSE_OWNER","ACTIVE"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.deletedSessionCount").value(3));
    }
    @Test void onlyActiveOwnerCanReachCancellationService() throws Exception {
        for(String role:List.of("HEAD_TRAINER","CLUB_MANAGER","ADMIN","VETERINARIAN"))
            mvc.perform(patch(base+"/cancel").with(authentication(user(role,"ACTIVE")))).andExpect(status().isForbidden());
        mvc.perform(patch(base+"/cancel").with(authentication(user("HORSE_OWNER","INACTIVE")))).andExpect(status().isForbidden());
        verifyNoInteractions(lifecycle);
    }
    @Test void onlyActiveTrainerWithPermissionCanComplete() throws Exception {
        when(access.has(any(),eq("MANAGE_TRAINING"))).thenReturn(true);
        mvc.perform(patch(base+"/complete").with(authentication(user("HEAD_TRAINER","ACTIVE")))).andExpect(status().isOk());
        for(String role:List.of("HORSE_OWNER","CLUB_MANAGER","VETERINARIAN","ADMIN"))
            mvc.perform(patch(base+"/complete").with(authentication(user(role,"ACTIVE")))).andExpect(status().isForbidden());
        mvc.perform(patch(base+"/complete").with(authentication(user("HEAD_TRAINER","INACTIVE")))).andExpect(status().isForbidden());
        verify(lifecycle,times(1)).complete("HPG-001");
    }
    @Test void missingManageTrainingCannotReachCompletion() throws Exception {
        when(access.has(any(),eq("MANAGE_TRAINING"))).thenReturn(false);
        mvc.perform(patch(base+"/complete").with(authentication(user("HEAD_TRAINER","ACTIVE")))).andExpect(status().isForbidden());
        verifyNoInteractions(lifecycle);
    }
    @Test void businessConflictsAndMissingIdsKeepTheirHttpContract() throws Exception {
        when(lifecycle.cancel("HPG-001")).thenThrow(new ApiException(HttpStatus.CONFLICT,"PACKAGE_HAS_UNFINISHED_SESSION","Finish recovery results first."));
        mvc.perform(patch(base+"/cancel").with(authentication(user("HORSE_OWNER","ACTIVE"))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.data.code").value("PACKAGE_HAS_UNFINISHED_SESSION"));
        doThrow(new ResourceNotFoundException("Package not found")).when(lifecycle).cancel("HPG-001");
        mvc.perform(patch(base+"/cancel").with(authentication(user("HORSE_OWNER","ACTIVE")))).andExpect(status().isNotFound());
    }
}
