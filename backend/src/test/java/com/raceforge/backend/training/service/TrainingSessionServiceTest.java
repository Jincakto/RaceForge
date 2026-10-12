package com.raceforge.backend.training.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.training.dto.CompleteSessionRequest;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.entity.TrainingSession;
import com.raceforge.backend.training.mapper.TrainingSessionMapper;
import com.raceforge.backend.training.repository.TrainingSessionRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TrainingSessionServiceTest {
    @Mock private TrainingSessionRepository sessionRepository;
    @Mock private HorseRepository horseRepository;
    @Spy private TrainingSessionMapper mapper = new TrainingSessionMapper();
    @InjectMocks private TrainingSessionService service;

    @Test
    void completeRechecksCurrentMedicalLockBeforeChangingSession() {
        TrainingSession session = session();
        Horse currentHorse = new Horse();
        currentHorse.setTrainingLocked(true);
        when(sessionRepository.findById(13)).thenReturn(Optional.of(session));
        when(horseRepository.findByIdForUpdate(7)).thenReturn(Optional.of(currentHorse));

        assertThrows(BusinessRuleException.class, () -> service.completeSession(13, new CompleteSessionRequest()));

        assertEquals("SCHEDULED", session.getStatus());
        assertNull(session.getActualEnd());
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void completeSavesSessionWhenCurrentHorseIsUnlocked() {
        TrainingSession session = session();
        Horse currentHorse = new Horse();
        currentHorse.setTrainingLocked(false);
        when(sessionRepository.findById(13)).thenReturn(Optional.of(session));
        when(horseRepository.findByIdForUpdate(7)).thenReturn(Optional.of(currentHorse));
        when(sessionRepository.save(session)).thenReturn(session);
        CompleteSessionRequest request = new CompleteSessionRequest();
        request.setPerformanceNotes("Good progress");

        var response = service.completeSession(13, request);

        assertEquals("COMPLETED", response.getStatus());
        assertEquals("Good progress", response.getEvaluation());
        assertNotNull(response.getActualEnd());
        verify(horseRepository).findByIdForUpdate(7);
        verify(sessionRepository).save(session);
    }

    private TrainingSession session() {
        Horse horse = new Horse();
        horse.setHorseId(7);
        horse.setTrainingLocked(false);
        TrainingPlan plan = new TrainingPlan();
        plan.setPlanId(11);
        TrainingSession session = new TrainingSession();
        session.setSessionId(13);
        session.setHorse(horse);
        session.setPlan(plan);
        return session;
    }
}
