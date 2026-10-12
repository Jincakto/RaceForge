package com.raceforge.backend.migration;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.SequenceGenerator;
import com.raceforge.backend.permission.entity.Permission;
import com.raceforge.backend.permission.entity.PermissionAuditLog;
import com.raceforge.backend.training.entity.TrainingPlan;
import com.raceforge.backend.training.entity.TrainingSession;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;

class MergedPersistenceMappingTest {
    @Test
    void permissionAndTrainingIdsUseTheSequencesCreatedByTheUserMigration() throws Exception {
        assertSequence(Permission.class, "permissionId", "seq_Permission");
        assertSequence(PermissionAuditLog.class, "auditId", "seq_Audit_Log");
        assertSequence(TrainingPlan.class, "planId", "seq_Training_Plan");
        assertSequence(TrainingSession.class, "sessionId", "seq_Training_Session");
    }

    private void assertSequence(Class<?> entity, String idField, String sequence) throws Exception {
        var field = entity.getDeclaredField(idField);
        var generator = field.getAnnotation(SequenceGenerator.class);
        assertEquals(Integer.class, field.getType());
        assertEquals(GenerationType.SEQUENCE, field.getAnnotation(GeneratedValue.class).strategy());
        assertEquals(generator.name(), field.getAnnotation(GeneratedValue.class).generator());
        assertEquals(sequence, generator.sequenceName());
        assertEquals(1, generator.allocationSize());
    }

    @Test
    void mergedEntitiesBootstrapTogetherWithoutADatabase() throws Exception {
        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect", "org.hibernate.dialect.SQLServerDialect")
                .applySetting("hibernate.boot.allow_jdbc_metadata_access", false)
                .applySetting("hibernate.hbm2ddl.auto", "none")
                .build();
        try {
            MetadataSources sources = new MetadataSources(registry);
            ClassPathScanningCandidateComponentProvider scanner =
                    new ClassPathScanningCandidateComponentProvider(false);
            scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
            for (var entity : scanner.findCandidateComponents("com.raceforge.backend")) {
                sources.addAnnotatedClass(Class.forName(entity.getBeanClassName()));
            }
            try (SessionFactory factory = sources.buildMetadata().buildSessionFactory()) {
                assertFalse(factory.getMetamodel().getEntities().isEmpty());
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }
}
