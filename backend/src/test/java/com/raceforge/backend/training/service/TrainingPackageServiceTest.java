package com.raceforge.backend.training.service;

import com.raceforge.backend.training.dto.*;
import com.raceforge.backend.training.entity.TrainingPackage;
import com.raceforge.backend.training.mapper.TrainingPackageMapper;
import com.raceforge.backend.training.repository.*;
import com.raceforge.backend.horse.service.ModuleIdAllocator;
import com.raceforge.backend.common.exception.BusinessRuleException;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class TrainingPackageServiceTest {
 final TrainingPackageRepository packages=mock(TrainingPackageRepository.class);
 final HorsePackageRepository registrations=mock(HorsePackageRepository.class);
 final PackageRoadmapTemplateService roadmaps=mock(PackageRoadmapTemplateService.class);
 final ModuleIdAllocator ids=mock(ModuleIdAllocator.class);
 final TrainingPackageService service=new TrainingPackageService(packages,registrations,new TrainingPackageMapper(),ids);
 final PackageRoadmapDto template=new PackageRoadmapDto("Foundation","Foundation goal",1,List.of());
 TrainingPackage existing;
 @BeforeEach void setup(){
  ReflectionTestUtils.setField(service,"roadmaps",roadmaps);ReflectionTestUtils.setField(service,"entityManager",mock(jakarta.persistence.EntityManager.class));
  existing=new TrainingPackage();existing.setPackageId("PKG-001");existing.setPackageName("Basic");existing.setPackageType("BASIC");existing.setPrice(BigDecimal.valueOf(5000000));existing.setDurationDays(30);
  when(packages.findByIdForUpdate("PKG-001")).thenReturn(Optional.of(existing));
  when(packages.saveAndFlush(any())).thenAnswer(i->i.getArgument(0));
  when(ids.next("PKG")).thenReturn("PKG-002");
 }
 TrainingPackageUpdateRequest request(){return new TrainingPackageUpdateRequest("Basic","BASIC","Updated",40,BigDecimal.valueOf(6000000),template);}
 @Test void soldPackageCreatesIndependentVersionAndPreservesOriginalTerms(){
  when(registrations.existsByTrainingPackage_PackageId("PKG-001")).thenReturn(true);
  var result=service.update("PKG-001",request());
  assertEquals("PKG-002",result.packageId());assertEquals("PKG-001",result.packageFamilyId());assertEquals(2,result.versionNumber());assertEquals("PKG-001",result.previousPackageId());
  assertEquals(BigDecimal.valueOf(5000000),existing.getPrice());assertEquals(30,existing.getDurationDays());assertEquals("INACTIVE",existing.getStatus());assertTrue(existing.isSuperseded());
  verify(roadmaps).create("PKG-002",template,40);verify(roadmaps,never()).replace(anyString(),any(),anyInt());
 }
 @Test void unusedPackageUpdatesInPlaceAndRevalidatesRoadmap(){
  var result=service.update("PKG-001",request());assertEquals("PKG-001",result.packageId());assertEquals(1,result.versionNumber());assertEquals(40,existing.getDurationDays());
  verify(roadmaps).validate(template,40);verify(roadmaps).replace("PKG-001",template,40);verifyNoInteractions(ids);
 }
 @Test void replacedVersionRejectsSecondEditorAndCannotBeReactivated(){
  existing.setSuperseded(true);existing.setStatus("INACTIVE");
  assertThrows(BusinessRuleException.class,()->service.update("PKG-001",request()));
  assertThrows(BusinessRuleException.class,()->service.changeStatus("PKG-001",new TrainingPackageStatusRequest("ACTIVE")));
  verify(packages,never()).saveAndFlush(any());
 }
 @Test void invalidRoadmapRejectsBeforeRetiringOrAllocatingVersion(){
  doThrow(new BusinessRuleException("Invalid roadmap")).when(roadmaps).validate(template,40);
  assertThrows(BusinessRuleException.class,()->service.update("PKG-001",request()));assertFalse(existing.isSuperseded());assertEquals("ACTIVE",existing.getStatus());verifyNoInteractions(ids);
 }
 @Test void newPackageStartsOwnFamilyAtVersionOne(){
  var result=service.create(new TrainingPackageCreateRequest("Basic","BASIC","",30,BigDecimal.ONE,template));assertEquals("PKG-002",result.packageId());assertEquals("PKG-002",result.packageFamilyId());assertEquals(1,result.versionNumber());
 }
}
