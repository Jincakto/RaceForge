package com.raceforge.backend.horse.service;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.storage.ProfileFiles;
import com.raceforge.backend.storage.StorageService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HorseScreeningEditGuardTest {
    @Test
    void ownerCannotChangeSubmittedFieldsOrReplaceEvidence() {
        Horse horse = new Horse(); horse.setAdmissionStatus("PENDING");
        User owner = new User(); owner.setUserId("7"); horse.setOwner(owner);
        HorseRepository horses = mock(HorseRepository.class);
        when(horses.findByIdForUpdate("HOR-001")).thenReturn(Optional.of(horse));
        HorseService service = new HorseService(horses, null, null, null);
        assertThrows(BusinessRuleException.class, () -> service.updateHorse("HOR-001", "7", new HorseUpdateRequest()));
        EntityManager db = mock(EntityManager.class);
        StorageService storage = mock(StorageService.class);
        when(db.find(Horse.class, "HOR-001", LockModeType.PESSIMISTIC_WRITE)).thenReturn(horse);
        ProfileFiles files = new ProfileFiles(db, storage, service, null);
        assertThrows(BusinessRuleException.class, () -> files.horseFile("HOR-001", "7", null, true));
        verifyNoInteractions(storage);
    }
}
