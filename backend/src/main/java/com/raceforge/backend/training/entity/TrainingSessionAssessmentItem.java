package com.raceforge.backend.training.entity;

import jakarta.persistence.*;
import java.util.UUID;

/** One persisted observation per versioned criterion. */
@Entity
@Table(name = "Training_Session_Assessment_Item", uniqueConstraints = {
        @UniqueConstraint(name = "UK_TrainingAssessmentItem_SessionCriterion",
                columnNames = {"session_id", "criterion_code"})
})
public class TrainingSessionAssessmentItem {
    @Id
    @Column(name = "item_id", length = 36, updatable = false)
    private String itemId = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private TrainingSessionAssessment assessment;

    @Enumerated(EnumType.STRING)
    @Column(name = "criterion_code", nullable = false, length = 40)
    private TrainingAssessmentCriterion criterionCode;

    @Column(name = "passed", nullable = false)
    private boolean passed;

    @Column(name = "fail_note", length = 1000)
    private String failNote;

    public TrainingSessionAssessmentItem() {
    }

    public String getItemId() { return itemId; }
    public void setItemId(String value) { itemId = value; }
    public TrainingSessionAssessment getAssessment() { return assessment; }
    public void setAssessment(TrainingSessionAssessment value) { assessment = value; }
    public String getSessionId() { return assessment == null ? null : assessment.getSessionId(); }
    public TrainingAssessmentCriterion getCriterionCode() { return criterionCode; }
    public void setCriterionCode(TrainingAssessmentCriterion value) { criterionCode = value; }
    public boolean isPassed() { return passed; }
    public boolean getPassed() { return passed; }
    public void setPassed(boolean value) { passed = value; }
    public String getFailNote() { return failNote; }
    public void setFailNote(String value) { failNote = value; }
}
