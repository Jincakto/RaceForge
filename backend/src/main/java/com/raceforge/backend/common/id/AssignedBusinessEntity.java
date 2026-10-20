package com.raceforge.backend.common.id;

import jakarta.persistence.*;
import org.springframework.data.domain.Persistable;

@MappedSuperclass
@EntityListeners(BusinessIdListener.class)
public abstract class AssignedBusinessEntity extends BusinessEntity implements Persistable<String> {
    @Transient private boolean newEntity = true;
    @Override @Transient public boolean isNew() { return newEntity; }
    @PostLoad @PostPersist private void persisted() { newEntity = false; }
}
