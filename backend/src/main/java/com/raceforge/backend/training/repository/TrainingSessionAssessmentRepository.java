package com.raceforge.backend.training.repository;

import com.raceforge.backend.training.entity.TrainingAssessmentNotificationStatus;
import com.raceforge.backend.training.entity.TrainingAssessmentReviewStatus;
import com.raceforge.backend.training.entity.TrainingSessionAssessment;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrainingSessionAssessmentRepository extends JpaRepository<TrainingSessionAssessment, String> {
    /** Caller must already hold the horse lock; never reverse horse -> assessment ordering. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TrainingSessionAssessment a where a.sessionId = :sessionId")
    Optional<TrainingSessionAssessment> findByIdForUpdate(@Param("sessionId") String sessionId);

    @EntityGraph(attributePaths = {
            "session", "session.horse", "session.plan", "assessor",
            "linkedMedicalRecord", "reviewedMedicalRecord", "reviewedBy"
    })
    Optional<TrainingSessionAssessment> findDetailedBySessionId(String sessionId);

    @EntityGraph(attributePaths = {
            "session", "session.horse", "session.plan", "assessor",
            "linkedMedicalRecord", "reviewedMedicalRecord", "reviewedBy"
    })
    List<TrainingSessionAssessment> findAllBySessionIdIn(Collection<String> sessionIds);

    boolean existsBySession_Horse_HorseIdAndReviewStatus(
            String horseId, TrainingAssessmentReviewStatus reviewStatus);

    @Query("""
            select distinct a.session.horse.horseId from TrainingSessionAssessment a
            where a.session.horse.horseId in :horseIds and a.reviewStatus = :reviewStatus
            """)
    Set<String> findHorseIdsWithReviewStatus(
            @Param("horseIds") Collection<String> horseIds,
            @Param("reviewStatus") TrainingAssessmentReviewStatus reviewStatus);

    default Set<String> pendingHorseIds(Collection<String> horseIds) {
        return horseIds == null || horseIds.isEmpty()
                ? Set.of() : findHorseIdsWithReviewStatus(horseIds, TrainingAssessmentReviewStatus.PENDING);
    }

    @EntityGraph(attributePaths = {"session", "session.horse", "session.plan", "assessor"})
    List<TrainingSessionAssessment> findBySession_Horse_HorseIdAndReviewStatus(
            String horseId, TrainingAssessmentReviewStatus reviewStatus);

    default List<TrainingSessionAssessment> findByHorseIdAndReviewStatus(
            String horseId, TrainingAssessmentReviewStatus reviewStatus) {
        return findBySession_Horse_HorseIdAndReviewStatus(horseId, reviewStatus);
    }

    @EntityGraph(attributePaths = {"session", "session.horse", "session.plan", "assessor"})
    List<TrainingSessionAssessment> findBySession_Horse_HorseIdAndNotificationStatus(
            String horseId, TrainingAssessmentNotificationStatus notificationStatus);

    default List<TrainingSessionAssessment> findByHorseIdAndNotificationStatus(
            String horseId, TrainingAssessmentNotificationStatus notificationStatus) {
        return findBySession_Horse_HorseIdAndNotificationStatus(horseId, notificationStatus);
    }

    @EntityGraph(attributePaths = {"session", "session.horse", "linkedMedicalRecord", "reviewedMedicalRecord"})
    Optional<TrainingSessionAssessment> findByLinkedMedicalRecord_MedicalRecordId(String medicalRecordId);

    default Optional<TrainingSessionAssessment> findByLinkedMedicalRecordId(String medicalRecordId) {
        return findByLinkedMedicalRecord_MedicalRecordId(medicalRecordId);
    }

    boolean existsByLinkedMedicalRecord_MedicalRecordIdAndSessionIdNot(
            String medicalRecordId, String sessionId);

    default boolean existsByLinkedMedicalRecordIdAndSessionIdNot(String medicalRecordId, String sessionId) {
        return existsByLinkedMedicalRecord_MedicalRecordIdAndSessionIdNot(medicalRecordId, sessionId);
    }
}
