package com.raceforge.backend.training.entity;

import jakarta.persistence.*;

/**
 * Maps Training_Protocol; application writes are validated by the workflow
 * services.
 */
@Entity
@Table(name = "Training_Protocol")
public class TrainingProtocol extends com.raceforge.backend.common.id.BusinessEntity {
    @Id
    @Column(name = "protocol_id", length = 20)
    private String protocolId;
    @org.hibernate.annotations.Nationalized
    @Column(name = "protocol_name", length = 150)
    private String protocolName;
    @Column(name = "package_type", length = 30)
    private String packageType;
    @Column(name = "min_weight", precision = 8, scale = 2)
    private java.math.BigDecimal minWeight;
    @Column(name = "max_weight", precision = 8, scale = 2)
    private java.math.BigDecimal maxWeight;
    @org.hibernate.annotations.Nationalized
    @Column(name = "stages_json", length = 2147483647)
    private String stagesJson;
    @org.hibernate.annotations.Nationalized
    @Column(name = "sources_json", length = 2147483647)
    private String sourcesJson;
    @org.hibernate.annotations.Nationalized
    @Column(name = "rationale", length = 1000)
    private String rationale;
    @Column(name = "status", length = 20)
    private String status;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private com.raceforge.backend.account.entity.User createdBy;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private com.raceforge.backend.account.entity.User approvedBy;
    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt;
    @Column(name = "approved_at")
    private java.time.LocalDateTime approvedAt;

    public String getProtocolId() {
        return protocolId;
    }

    public String getProtocolName() {
        return protocolName;
    }

    public String getPackageType() {
        return packageType;
    }

    public java.math.BigDecimal getMinWeight() {
        return minWeight;
    }

    public java.math.BigDecimal getMaxWeight() {
        return maxWeight;
    }

    public String getStagesJson() {
        return stagesJson;
    }

    public String getSourcesJson() {
        return sourcesJson;
    }

    public String getRationale() {
        return rationale;
    }

    public String getStatus() {
        return status;
    }

    public com.raceforge.backend.account.entity.User getCreatedBy() {
        return createdBy;
    }

    public com.raceforge.backend.account.entity.User getApprovedBy() {
        return approvedBy;
    }

    public java.time.LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public java.time.LocalDateTime getApprovedAt() {
        return approvedAt;
    }
}
