package com.raceforge.backend.horse.service;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.entity.Horse;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.medical.entity.HealthProfile;
import com.raceforge.backend.medical.repository.HealthProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class HorseAdmissionService {
    private final HorseRepository horses;
    private final HorseMapper mapper;
    private final HealthProfileRepository profiles;
    private final AuditLogService audit;
    public HorseAdmissionService(HorseRepository horses,HorseMapper mapper,HealthProfileRepository profiles,AuditLogService audit){this.horses=horses;this.mapper=mapper;this.profiles=profiles;this.audit=audit;}
    @Transactional
    public HorseResponse submit(Integer id,Integer actor){
        Horse h=locked(id);
        if(!h.getOwner().getUserId().equals(actor))throw new BusinessRuleException("Only the owner may submit this horse");
        if(!java.util.Set.of("NOT_SUBMITTED","REJECTED").contains(h.getAdmissionStatus()))throw new BusinessRuleException("Horse admission is already pending or approved");
        h.setAdmissionStatus("PENDING");h.setAdmissionNote(null);record(h,actor,"HORSE_ADMISSION_SUBMITTED",null);return mapper.toResponse(h);
    }
    @Transactional
    public HorseResponse review(Integer id,Integer actor,boolean approved,String note){
        Horse h=locked(id);
        if(!"PENDING".equals(h.getAdmissionStatus()))throw new BusinessRuleException("Only pending admissions can be reviewed");
        if(!approved&&(note==null||note.isBlank()))throw new BusinessRuleException("Rejection reason is required");
        h.setAdmissionStatus(approved?"APPROVED":"REJECTED");h.setAdmissionNote(note);
        if(approved&&profiles.findByHorse_HorseId(id).isEmpty()){var profile=new HealthProfile();profile.setHorse(h);profiles.save(profile);}
        // Approval creates a health profile, but does not declare the horse medically ready.
        record(h,actor,approved?"HORSE_ADMISSION_APPROVED":"HORSE_ADMISSION_REJECTED",note);return mapper.toResponse(h);
    }
    @Transactional(readOnly=true)
    public Integer profile(Integer id){
        return profiles.findByHorse_HorseId(id).orElseThrow(()->new ResourceNotFoundException("Health profile not found; approve admission first")).getProfileId();
    }
    private Horse locked(Integer id){return horses.findByIdForUpdate(id).orElseThrow(()->new ResourceNotFoundException("Horse not found"));}
    private void record(Horse h,Integer actor,String action,String note){audit.record(actor,h.getHorseId(),"HORSE",h.getHorseId(),action,"SUCCESS",note);}
}
