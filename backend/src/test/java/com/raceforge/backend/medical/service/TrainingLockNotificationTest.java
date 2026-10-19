package com.raceforge.backend.medical.service;

import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.entity.TrainingLock;
import com.raceforge.backend.medical.repository.TrainingLockRepository;
import com.raceforge.backend.notification.service.NotificationService;
import com.raceforge.backend.training.service.TrainingPackagePauseService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrainingLockNotificationTest {
    private final com.raceforge.backend.horse.service.ModuleIdAllocator ids = mock(com.raceforge.backend.horse.service.ModuleIdAllocator.class);
    private final TrainingLockRepository locks = mock(TrainingLockRepository.class);
    private final HorseRepository horses = mock(HorseRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final TrainingPackagePauseService pauseService = mock(TrainingPackagePauseService.class);
    private final TrainingLockService service = new TrainingLockService(
            locks, horses, users, audit, entityManager, notifications, pauseService, ids);

    private User user(String id, String roleName) {
        User user = new User();
        user.setUserId(id);
        user.setStatus("ACTIVE");
        Role role = new Role();
        role.setRoleName(roleName);
        user.setRole(role);
        return user;
    }

    @Test
    void confirmingNotFitNotifiesClubManagersOnce() {
        Horse horse = new Horse();
        horse.setHorseId("HOR-001");
        horse.setTrainingLocked(false);
        User veterinarian = user("7", "VETERINARIAN");
        User manager = user("2", "CLUB_MANAGER");
        when(users.findActiveManagers()).thenReturn(List.of(manager));
        when(locks.findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc("HOR-001"))
                .thenReturn(Optional.empty(), Optional.of(new TrainingLock()));

        HealthProfile profile = new HealthProfile();
        profile.setHorse(horse);
        MedicalRecord medical = new MedicalRecord();
        medical.setMedicalRecordId("MED-001");
        medical.setHealthProfile(profile);
        medical.setVeterinarian(veterinarian);
        medical.setStatus("CONFIRMED");
        medical.setFinalConclusion("NOT_FIT");

        service.lockFromConfirmedExamination(horse, medical, veterinarian,
                "Horse requires a veterinary recovery program");
        assertTrue(horse.getTrainingLocked());
        verify(pauseService).pauseActiveNormalPackage("HOR-001", "MED-001");
        verify(notifications).notify(eq("2"), eq("TRAINING_LOCKED"), anyString(), anyString());

        service.lockFromConfirmedExamination(horse, medical, veterinarian,
                "Horse requires a veterinary recovery program");
        verify(pauseService, times(1)).pauseActiveNormalPackage("HOR-001", "MED-001");
        verify(notifications, times(1)).notify(eq("2"), eq("TRAINING_LOCKED"), anyString(), anyString());
    }

    @Test
    void successfulUnlockNotifiesClubManager() {
        Horse horse = new Horse();
        horse.setHorseId("HOR-001");
        horse.setHealthStatus("READY");
        horse.setTrainingLocked(true);
        User veterinarian = user("7", "VETERINARIAN");
        when(users.findDetailedById("7")).thenReturn(Optional.of(veterinarian));
        when(horses.findById("HOR-001")).thenReturn(Optional.of(horse));
        when(users.findActiveManagers()).thenReturn(List.of(user("2", "CLUB_MANAGER")));
        when(locks.findFirstByHorse_HorseIdAndUnlockedAtIsNullOrderByLockedAtDesc("HOR-001"))
                .thenReturn(Optional.of(new TrainingLock()));

        service.unlockHorse("HOR-001", "7", "Follow-up examination has confirmed recovery");
        assertFalse(horse.getTrainingLocked());
        verify(notifications).notify(eq("2"), eq("TRAINING_UNLOCKED"), anyString(), anyString());
    }
}
