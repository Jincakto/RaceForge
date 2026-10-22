package com.raceforge.backend.common.id;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.training.entity.TrainingPackage;
import jakarta.persistence.PrePersist;
import org.springframework.stereotype.Component;

@Component
public class BusinessIdListener {
    private final BusinessIdGenerator generator;
    public BusinessIdListener(BusinessIdGenerator generator) { this.generator = generator; }
    @PrePersist public void assign(Object entity) {
        if (entity instanceof User user && user.getUserId() == null) {
            String prefix = user.getRole() == null ? null : BusinessIdGenerator.USER_PREFIXES.get(user.getRole().getRoleId());
            if (prefix == null) throw new IllegalArgumentException("Unsupported user role for ID allocation");
            user.setUserId(generator.next(prefix));
        } else if (entity instanceof Horse horse && horse.getHorseId() == null) {
            horse.setHorseId(generator.next("HOR"));
        } else if (entity instanceof TrainingPackage pkg && pkg.getPackageId() == null) {
            pkg.setPackageId(generator.next("PKG"));
        } else if (entity instanceof MedicalRecord record && record.getMedicalRecordId() == null) {
            record.setMedicalRecordId(generator.next("MED"));
        }
    }
}
