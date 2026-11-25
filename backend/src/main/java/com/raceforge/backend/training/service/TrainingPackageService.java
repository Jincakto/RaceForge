package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.TrainingPackageMapper;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import com.raceforge.backend.training.repository.HorsePackageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class TrainingPackageService {
    private final com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator;

    private static final Set<String> ALLOWED_TYPES = Set.of("BASIC", "RACING", "PERFORMANCE");
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVE", "INACTIVE");

    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final TrainingPackageRepository repository;
    private final HorsePackageRepository horsePackageRepository;
    private final TrainingPackageMapper mapper;
    @org.springframework.beans.factory.annotation.Autowired private PackageRoadmapTemplateService roadmaps;

    public TrainingPackageService(TrainingPackageRepository repository, HorsePackageRepository horsePackageRepository, TrainingPackageMapper mapper,
            com.raceforge.backend.horse.service.ModuleIdAllocator idAllocator) {
        this.idAllocator = idAllocator;
        this.repository = repository;
        this.horsePackageRepository = horsePackageRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<TrainingPackageResponse> getActivePackages() {
        return repository.findByStatusOrderByPackageNameAsc("ACTIVE")
                .stream().filter(p -> ALLOWED_TYPES.contains(p.getPackageType()))
                .map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<TrainingPackageResponse> getAllPackages() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TrainingPackageResponse getPackage(String id) {
        return mapper.toResponse(findById(id));
    }

    @Transactional
    public TrainingPackageResponse create(TrainingPackageCreateRequest request) {
        validateType(request.packageType());
        roadmaps.validate(request.roadmapTemplate(),request.durationDays());
        TrainingPackage entity=mapper.toEntity(request);entity.setPackageId(nextPackageId());entity=repository.saveAndFlush(entity);
        var template=roadmaps.create(entity.getPackageId(),request.roadmapTemplate(),request.durationDays());
        var r=mapper.toResponse(entity);
        return new TrainingPackageResponse(r.packageId(),r.packageName(),r.packageType(),r.description(),r.durationDays(),r.price(),r.status(),r.createdAt(),r.updatedAt(),template);
    }

    @Transactional
    public TrainingPackageResponse update(String id, TrainingPackageUpdateRequest request) {
        validateType(request.packageType());
        TrainingPackage entity = locked(id);
        if(entity.isSuperseded()) throw new BusinessRuleException("This version has been replaced. Refresh the catalogue and edit the current version.");
        var template = request.roadmapTemplate() != null ? request.roadmapTemplate() : roadmaps.read(id);
        roadmaps.validate(template,request.durationDays());
        boolean versioned = horsePackageRepository.existsByTrainingPackage_PackageId(id);
        TrainingPackage target = versioned ? new TrainingPackage() : entity;
        if(versioned){
            target.setPackageId(nextPackageId());target.setPackageFamilyId(entity.getPackageFamilyId());
            target.setVersionNumber(entity.getVersionNumber()+1);target.setPreviousPackageId(id);target.setStatus("ACTIVE");
            entity.setStatus("INACTIVE");entity.setSuperseded(true);repository.saveAndFlush(entity);
        }
        mapper.updateEntity(target,request);target=repository.saveAndFlush(target);
        if(versioned) roadmaps.create(target.getPackageId(),template,target.getDurationDays());
        else roadmaps.replace(id,template,target.getDurationDays());
        return mapper.toResponse(target);
    }

    @Transactional
    public TrainingPackageResponse changeStatus(String id, TrainingPackageStatusRequest request) {
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(status)) {
            throw new BusinessRuleException("Invalid training package status: " + request.status());
        }
        TrainingPackage entity = locked(id);
        if(entity.isSuperseded()) throw new BusinessRuleException("A replaced version cannot be enabled or edited.");
        validateType(entity.getPackageType());
        if("ACTIVE".equals(status))roadmaps.read(id);
        entity.setStatus(status);
        return mapper.toResponse(repository.saveAndFlush(entity));
    }

    private TrainingPackage locked(String id){var entity=repository.findByIdForUpdate(id).orElseThrow(()->new ResourceNotFoundException("Training package not found: "+id));entityManager.refresh(entity,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);return entity;}

    private String nextPackageId() {
        return idAllocator.next("PKG");
    }

    private TrainingPackage findById(String id) {
        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Training package not found: " + id)
        );
    }

    private void validateType(String type) {
        if (type == null || !ALLOWED_TYPES.contains(type.trim().toUpperCase(Locale.ROOT))) {
            throw new BusinessRuleException("Invalid training package type: " + type);
        }
    }
}
