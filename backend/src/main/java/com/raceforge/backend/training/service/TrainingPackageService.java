package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.TrainingPackageMapper;
import com.raceforge.backend.training.repository.TrainingPackageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class TrainingPackageService {

    private static final Set<String> ALLOWED_TYPES = Set.of("BASIC", "RACING", "PERFORMANCE", "RECOVERY");
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVE", "INACTIVE");

    private final TrainingPackageRepository repository;
    private final TrainingPackageMapper mapper;

    public TrainingPackageService(TrainingPackageRepository repository, TrainingPackageMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<TrainingPackageResponse> getActivePackages() {
        return repository.findByStatusOrderByPackageNameAsc("ACTIVE")
                .stream().map(mapper::toResponse).toList();
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
        TrainingPackage entity = mapper.toEntity(request);
        // Temporary collision-resistant ID; align with team's central ID generator during integration.
        entity.setPackageId("PKG" + UUID.randomUUID().toString().replace("-", "").substring(0, 17).toUpperCase(Locale.ROOT));
        return mapper.toResponse(repository.saveAndFlush(entity));
    }

    @Transactional
    public TrainingPackageResponse update(String id, TrainingPackageUpdateRequest request) {
        validateType(request.packageType());
        TrainingPackage entity = findById(id);
        mapper.updateEntity(entity, request);
        return mapper.toResponse(repository.saveAndFlush(entity));
    }

    @Transactional
    public TrainingPackageResponse changeStatus(String id, TrainingPackageStatusRequest request) {
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(status)) {
            throw new BusinessRuleException("Invalid training package status: " + request.status());
        }
        TrainingPackage entity = findById(id);
        entity.setStatus(status);
        return mapper.toResponse(repository.saveAndFlush(entity));
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
