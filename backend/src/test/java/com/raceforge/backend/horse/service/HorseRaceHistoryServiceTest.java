package com.raceforge.backend.horse.service;

import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.dto.HorseRaceHistoryCreateRequest;
import com.raceforge.backend.horse.dto.HorseRaceHistoryUpdateRequest;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.entity.HorseRaceHistory;
import com.raceforge.backend.horse.mapper.HorseRaceHistoryMapper;
import com.raceforge.backend.horse.repository.HorseRaceHistoryRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class HorseRaceHistoryServiceTest {

    private final com.raceforge.backend.horse.service.ModuleIdAllocator ids = mock(com.raceforge.backend.horse.service.ModuleIdAllocator.class);
    private final HorseRaceHistoryRepository histories = mock(HorseRaceHistoryRepository.class);
    private final HorseRepository horses = mock(HorseRepository.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final HorseRaceHistoryService service = new HorseRaceHistoryService(
            histories, horses, new HorseRaceHistoryMapper(), audit, ids
    );

    private Horse horse() {
        Horse horse = new Horse();
        horse.setHorseId("HOR-014");
        horse.setDateOfBirth(LocalDate.of(2015, 1, 1));
        horse.setAdmissionStatus("APPROVED");
        return horse;
    }

    @Test
    void cannotCreateRaceHistoryBeforeHorseWasBorn() {
        when(horses.findById("HOR-014")).thenReturn(Optional.of(horse()));
        HorseRaceHistoryCreateRequest request = new HorseRaceHistoryCreateRequest();
        request.setRaceName("Example race");
        request.setRaceDate(LocalDate.of(2014, 12, 1));

        assertThrows(BusinessRuleException.class,
                () -> service.createRaceHistory("HOR-014", "7", request));
        verify(histories, never()).save(any(HorseRaceHistory.class));
    }

    @Test
    void ownerCanAddRaceHistoryEvenAfterApproval() {
        when(horses.findById("HOR-014")).thenReturn(Optional.of(horse()));
        when(histories.save(any(HorseRaceHistory.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        HorseRaceHistoryCreateRequest request = new HorseRaceHistoryCreateRequest();
        request.setRaceName("Example race");
        request.setRaceDate(LocalDate.of(2023, 5, 6));

        var response = service.createRaceHistory("HOR-014", "7", request);
        assertEquals("Example race", response.getRaceName());
        assertEquals("HOR-014", response.getHorseId());
        verify(histories).save(any(HorseRaceHistory.class));
    }

    @Test
    void raceHistoryUpdateMustRespectHorseBirthDate() {
        HorseRaceHistory history = new HorseRaceHistory();
        history.setRaceHistoryId("RAC-020");
        history.setHorse(horse());
        when(histories.findById("RAC-020")).thenReturn(Optional.of(history));

        HorseRaceHistoryUpdateRequest request = new HorseRaceHistoryUpdateRequest();
        request.setRaceName("Incorrect date");
        request.setRaceDate(LocalDate.of(2010, 1, 1));

        assertThrows(BusinessRuleException.class,
                () -> service.updateRaceHistory("RAC-020", "7", request));
        verify(histories, never()).save(any(HorseRaceHistory.class));
    }
}
