<<<<<<< HEAD
package com.raceforge.backend.medical.controller;

import com.raceforge.backend.medical.service.MedicalRecordService;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import com.raceforge.backend.horse.service.HorseAccess;
import com.raceforge.backend.medical.service.TrainingLockService;
import com.raceforge.backend.security.AuthenticatedUser;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MedicalPrincipalTest {
    private final MedicalRecordService records = mock(MedicalRecordService.class);
    private final TrainingLockService locks = mock(TrainingLockService.class);
    private final HealthProfileRepository profiles = mock(HealthProfileRepository.class);
    private final HorseAccess access = mock(HorseAccess.class);
    private final MedicalRecordController controller = new MedicalRecordController(records, locks, profiles, access);

    @Test
    void jwtPrincipalUsesUserIdInsteadOfAuthenticationName() {
        var principal = new AuthenticatedUser("42", "doctor@example.test", "ACTIVE", 3, "VETERINARIAN");
        var authentication = UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of());
        assertThrows(NumberFormatException.class, () -> Integer.valueOf(authentication.getName()));
        assertDoesNotThrow(() -> controller.confirmMedicalRecord("MED-007", authentication));
        verify(records).confirmMedicalRecord("MED-007", "42");
    }

    @Test
    void missingAuthenticationIsRejectedBeforeService() {
        assertThrows(AccessDeniedException.class, () -> controller.confirmMedicalRecord("MED-001", null));
        verifyNoInteractions(records);
    }

    @Test
    void arbitraryNumericNameCannotSubstituteForJwtPrincipal() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated("42", null, List.of());
        assertThrows(AccessDeniedException.class, () -> controller.confirmMedicalRecord("MED-001", authentication));
        verifyNoInteractions(records);
    }
}
=======
// Pre-String ID test retained for reference, superseded by StringTrainingWorkflowIT and StringIdContractTest.
// package com.raceforge.backend.medical.controller;
// 
// import com.raceforge.backend.medical.service.MedicalRecordService;
// import com.raceforge.backend.medical.service.TrainingLockService;
// import com.raceforge.backend.security.AuthenticatedUser;
// import java.util.List;
// import org.junit.jupiter.api.Test;
// import org.springframework.http.HttpStatus;
// import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
// import org.springframework.web.server.ResponseStatusException;
// import static org.junit.jupiter.api.Assertions.*;
// import static org.mockito.Mockito.*;
// 
// class MedicalPrincipalTest {
//     private final MedicalRecordService records = mock(MedicalRecordService.class);
//     private final TrainingLockService locks = mock(TrainingLockService.class);
//     private final MedicalRecordController controller = new MedicalRecordController(records, locks);
// 
//     @Test
//     void jwtPrincipalUsesUserIdInsteadOfAuthenticationName() {
//         var principal = new AuthenticatedUser(42, "doctor@example.test", "ACTIVE", 3, "VETERINARIAN");
//         var authentication = UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of());
//         assertThrows(NumberFormatException.class, () -> Integer.valueOf(authentication.getName()));
//         assertDoesNotThrow(() -> controller.confirmMedicalRecord(7, authentication));
//         verify(records).confirmMedicalRecord(7, 42);
//     }
// 
//     @Test
//     void missingAuthenticationIsRejectedBeforeService() {
//         var error = assertThrows(ResponseStatusException.class, () -> controller.getMedicalHistory(1, null));
//         assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
//         verifyNoInteractions(records);
//     }
// 
//     @Test
//     void arbitraryNumericNameCannotSubstituteForJwtPrincipal() {
//         var authentication = UsernamePasswordAuthenticationToken.authenticated("42", null, List.of());
//         var error = assertThrows(ResponseStatusException.class, () -> controller.getMedicalHistory(1, authentication));
//         assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
//         verifyNoInteractions(records);
//     }
// }
>>>>>>> 76de6e5 (luu code)
