package com.raceforge.backend.storage;

import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.common.exception.ResourceNotFoundException;
import com.raceforge.backend.horse.dto.*;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.service.HorseService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class ProfileFiles {
    private final EntityManager db;
    private final StorageService storage;
    private final HorseService horses;
    private final Validator validator;

    public ProfileFiles(EntityManager db, StorageService storage, HorseService horses, Validator validator) {
        this.db = db;
        this.storage = storage;
        this.horses = horses;
        this.validator = validator;
    }

    public HorseResponse create(String owner, HorseCreateRequest request, MultipartFile image, MultipartFile document) {
        var photo = storage.validate(image, false);
        var evidence = storage.validate(document, true);
        request.setImageUrl(storage.replace(StorageService.IMAGES, photo, null));
        request.setDocumentUrl(storage.replace(StorageService.DOCUMENTS, evidence, null));
        var errors = validator.validate(request);
        if (!errors.isEmpty()) throw new BusinessRuleException(errors.iterator().next().getMessage());
        return horses.createHorse(owner, request);
    }

    public void horseFile(String id, String owner, MultipartFile file, boolean document) {
        Horse horse = db.find(Horse.class, id, LockModeType.PESSIMISTIC_WRITE);
        if (horse == null) throw new ResourceNotFoundException("Horse not found");
        if (!horse.getOwner().getUserId().equals(owner) || "APPROVED".equals(horse.getAdmissionStatus()))
            throw new BusinessRuleException("You cannot change files on this horse profile.");
        var upload = storage.validate(file, document);
        if (document) horse.setDocumentUrl(storage.replace(StorageService.DOCUMENTS, upload, horse.getDocumentUrl()));
        else horse.setImageUrl(storage.replace(StorageService.IMAGES, upload, horse.getImageUrl()));
    }

    public void avatar(String id, MultipartFile file) {
        User user = db.find(User.class, id, LockModeType.PESSIMISTIC_WRITE);
        if (user == null) throw new ResourceNotFoundException("User not found");
        user.setAvatarUrl(storage.replace(StorageService.IMAGES, storage.validate(file, false), user.getAvatarUrl()));
    }
}
