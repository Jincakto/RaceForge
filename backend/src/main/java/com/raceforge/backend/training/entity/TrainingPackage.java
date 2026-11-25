package com.raceforge.backend.training.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "TRAINING_PACKAGE")
public class TrainingPackage extends com.raceforge.backend.training.entity.TrainingEntity {

    @Id
    @Column(name = "package_id", nullable = false, length = 20)
    private String packageId;

    @Column(name = "package_name", nullable = false, length = 100)
    private String packageName;

    @Column(name = "package_type", nullable = false, length = 30)
    private String packageType;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    @Column(name = "price", nullable = false)
    private BigDecimal price;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name="package_family_id", nullable=false, length=20)
    private String packageFamilyId;
    @Column(name="version_number", nullable=false)
    private Integer versionNumber = 1;
    @Column(name="previous_package_id", length=20)
    private String previousPackageId;
    @Column(name="superseded", nullable=false)
    private boolean superseded;
    public String getPackageFamilyId(){return packageFamilyId == null ? packageId : packageFamilyId;}
    public void setPackageFamilyId(String value){packageFamilyId=value;}
    public Integer getVersionNumber(){return versionNumber;}
    public void setVersionNumber(Integer value){versionNumber=value;}
    public String getPreviousPackageId(){return previousPackageId;}
    public void setPreviousPackageId(String value){previousPackageId=value;}
    public boolean isSuperseded(){return superseded;}
    public void setSuperseded(boolean value){superseded=value;}

    @PrePersist
    protected void onCreate() {
        if (packageFamilyId == null) packageFamilyId = packageId;
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getPackageId() {
        return packageId;
    }

    public void setPackageId(String packageId) {
        this.packageId = packageId;
    }

    public String getPackageName() {
        return packageName;
    }

    public void setPackageName(String packageName) {
        this.packageName = packageName;
    }

    public String getPackageType() {
        return packageType;
    }

    public void setPackageType(String packageType) {
        this.packageType = packageType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getDurationDays() {
        return durationDays;
    }

    public void setDurationDays(Integer durationDays) {
        this.durationDays = durationDays;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

}
