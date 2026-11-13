package com.raceforge.backend.training.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Nationalized;

import java.time.LocalDate;

@Entity
@Table(name = "Training_Certificate", schema = "dbo")
public class TrainingCertificate {
    @Id
    @Column(name = "horse_package_id", length = 20)
    private String horsePackageId;

    @Column(name = "certificate_number", nullable = false, length = 23)
    private String certificateNumber;

    @Nationalized
    @Column(name = "horse_name_at_issue", nullable = false, length = 100)
    private String horseNameAtIssue;

    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    protected TrainingCertificate() {
    }

    public TrainingCertificate(String horsePackageId, String horseNameAtIssue, LocalDate issueDate) {
        this.horsePackageId = horsePackageId;
        this.certificateNumber = "RF-" + horsePackageId;
        this.horseNameAtIssue = horseNameAtIssue;
        this.issueDate = issueDate;
    }

    public String getCertificateNumber() {
        return certificateNumber;
    }

    public String getHorseNameAtIssue() {
        return horseNameAtIssue;
    }

    public LocalDate getIssueDate() {
        return issueDate;
    }
}
