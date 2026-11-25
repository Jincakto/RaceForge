package com.raceforge.backend.training.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TrainingPackageResponse(
        String packageId,
        String packageName,
        String packageType,
        String description,
        Integer durationDays,
        BigDecimal price,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        PackageRoadmapDto roadmapTemplate,
        String packageFamilyId, Integer versionNumber, String previousPackageId, boolean superseded
        ) {
    public TrainingPackageResponse(String id,String name,String type,String description,Integer days,BigDecimal price,String status,LocalDateTime created,LocalDateTime updated,PackageRoadmapDto roadmap){this(id,name,type,description,days,price,status,created,updated,roadmap,id,1,null,false);}
}
