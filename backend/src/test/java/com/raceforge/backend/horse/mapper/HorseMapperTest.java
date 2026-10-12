package com.raceforge.backend.horse.mapper;

import static org.junit.jupiter.api.Assertions.*;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.dto.HorseCreateRequest;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.dto.HorseUpdateRequest;
import com.raceforge.backend.horse.entity.Horse;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class HorseMapperTest {
    private final HorseMapper mapper = new HorseMapper();

    @Test
    void newHorseFieldsRoundTripWithDecimalWeightAndIntegerOwnerIds() {
        HorseCreateRequest request = new HorseCreateRequest();
        request.setHorseName("Silver Arrow");
        request.setCoatColor("Bay");
        request.setWeight(450.25);
        request.setHeight(160.0);
        request.setDamSire("Ancestor");
        request.setDeclaredMedicalHistory("No previous injury");
        Horse horse = mapper.toEntity(request);
        assertEquals(new BigDecimal("450.25"), horse.getWeight());
        horse.setHorseId(7);
        User owner = new User();
        owner.setUserId(42);
        horse.setOwner(owner);
        HorseResponse response = mapper.toResponse(horse);
        assertEquals(7, response.getHorseId());
        assertEquals(42, response.getOwnerId());
        assertEquals(450.25, response.getWeight());
        assertEquals("Bay", response.getCoatColor());
        assertEquals(160.0, response.getHeight());
        assertEquals("Ancestor", response.getDamSire());
        assertEquals("No previous injury", response.getDeclaredMedicalHistory());
    }

    @Test
    void editableFieldsDoNotOverwriteOwnershipOrClinicalState() {
        Horse horse = new Horse();
        User owner = new User();
        horse.setOwner(owner);
        horse.setStatus("ACTIVE");
        horse.setHealthStatus("RECOVERY");
        horse.setTrainingLocked(true);
        HorseUpdateRequest request = new HorseUpdateRequest();
        request.setHorseName("Updated name");
        request.setWeight(500.5);
        mapper.updateEntity(horse, request);
        assertEquals("Updated name", horse.getHorseName());
        assertEquals(new BigDecimal("500.5"), horse.getWeight());
        assertSame(owner, horse.getOwner());
        assertEquals("ACTIVE", horse.getStatus());
        assertEquals("RECOVERY", horse.getHealthStatus());
        assertTrue(horse.getTrainingLocked());
    }
}
