package com.raceforge.backend.horse.controller;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.service.AuditLogService;
import com.raceforge.backend.common.exception.*;
import com.raceforge.backend.common.response.ApiResponse;
import com.raceforge.backend.horse.dto.HorseResponse;
import com.raceforge.backend.horse.mapper.HorseMapper;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.security.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api")
public class TrainerController {
    private final UserRepository users;private final HorseRepository horses;private final HorseMapper mapper;private final AuditLogService audit;
    public TrainerController(UserRepository users,HorseRepository horses,HorseMapper mapper,AuditLogService audit){this.users=users;this.horses=horses;this.mapper=mapper;this.audit=audit;}
    public record Trainer(Integer userId,String fullName,String avatarUrl){}
    public record Assignment(@NotNull Integer trainerId){}
    @GetMapping("/trainers")
    @Transactional(readOnly=true)
    public ApiResponse<com.raceforge.backend.account.dto.AuthDtos.PageResponse<Trainer>> trainers(@RequestParam(defaultValue="0") int page){
        var result=users.searchUsers(null,"ACTIVE",2,PageRequest.of(Math.max(0,page),20));
        return ApiResponse.success("Trainers",new com.raceforge.backend.account.dto.AuthDtos.PageResponse<>(result.getContent().stream().filter(u->u.isEmailVerified()).map(u->new Trainer(u.getUserId(),u.getFullName(),u.getAvatarUrl())).toList(),result.getNumber(),result.getSize(),result.getTotalElements(),result.getTotalPages()));
    }
    @GetMapping("/trainers/{id}")
    @Transactional(readOnly=true)
    public ApiResponse<Trainer> trainer(@PathVariable Integer id){var u=users.findDetailedById(id).orElseThrow(()->new ResourceNotFoundException("Trainer not found"));if(!"HEAD_TRAINER".equals(u.getRole().getRoleName())||!"ACTIVE".equals(u.getStatus())||!u.isEmailVerified())throw new ResourceNotFoundException("Active trainer not found");return ApiResponse.success("Trainer",new Trainer(u.getUserId(),u.getFullName(),u.getAvatarUrl()));}
    @PutMapping("/horses/{horseId}/trainer")
    @PreAuthorize("@horseAccess.owns(authentication, #horseId)")
    @Transactional
    public ApiResponse<HorseResponse> assign(@PathVariable Integer horseId,@AuthenticationPrincipal AuthenticatedUser actor,@Valid @RequestBody Assignment body){
        var h=horses.findByIdForUpdate(horseId).orElseThrow(()->new ResourceNotFoundException("Horse not found"));
        if(!actor.userId().equals(h.getOwner().getUserId()))throw new BusinessRuleException("Only owner may assign trainer");
        var trainer=users.findByIdForUpdate(body.trainerId()).orElseThrow(()->new ResourceNotFoundException("Trainer not found"));
        if(!"HEAD_TRAINER".equals(trainer.getRole().getRoleName())||!"ACTIVE".equals(trainer.getStatus())||!trainer.isEmailVerified())throw new BusinessRuleException("Trainer must be active and verified");
        h.setHeadTrainer(trainer);audit.record(actor.userId(),horseId,"HORSE",horseId,"TRAINER_ASSIGNED","SUCCESS",String.valueOf(body.trainerId()));
        return ApiResponse.success("Trainer assigned",mapper.toResponse(h));
    }
}
