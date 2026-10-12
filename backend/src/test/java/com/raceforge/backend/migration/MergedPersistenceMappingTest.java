package com.raceforge.backend.migration;

import jakarta.persistence.Entity;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import static org.junit.jupiter.api.Assertions.assertFalse;

class MergedPersistenceMappingTest {
    @Test
    void userHorseMedicalAndPackageEntitiesBootstrapTogetherWithoutADatabase() throws Exception {
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
