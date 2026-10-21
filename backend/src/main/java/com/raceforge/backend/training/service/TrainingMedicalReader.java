package com.raceforge.backend.training.service;

import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.medical.entity.MedicalRecord;
import com.raceforge.backend.medical.entity.MedicalVitalSign;
import com.raceforge.backend.medical.repository.MedicalRecordRepository;
import com.raceforge.backend.medical.repository.MedicalClinicalExamRepository;
import com.raceforge.backend.medical.repository.MedicalVitalSignRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads N's existing medical model; never changes veterinary records or decisions. */
@Service
@Transactional(readOnly=true)
public class TrainingMedicalReader {
 private final MedicalRecordRepository records;
 private final MedicalVitalSignRepository vitalSigns;
 private final MedicalClinicalExamRepository clinicalExams;
 public TrainingMedicalReader(MedicalRecordRepository records, MedicalVitalSignRepository vitalSigns,
         MedicalClinicalExamRepository clinicalExams) {
  this.records=records;this.vitalSigns=vitalSigns;this.clinicalExams=clinicalExams;
 }
 private Optional<MedicalRecord> latest(String horseId){
  return records.findByHealthProfile_Horse_HorseIdAndStatus(horseId,"CONFIRMED").stream()
   .max(Comparator.comparing(MedicalRecord::getExaminedAt,Comparator.nullsFirst(Comparator.<LocalDateTime>naturalOrder()))
    .thenComparing(MedicalRecord::getConfirmedAt,Comparator.nullsFirst(Comparator.<LocalDateTime>naturalOrder()))
    .thenComparing(MedicalRecord::getMedicalRecordId));
 }
 public BigDecimal weight(String horseId){
  return latest(horseId).flatMap(record->vitalSigns.findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId()))
   .map(MedicalVitalSign::getWeight).orElse(null);
 }
 public Map<String,Object> snapshot(String horseId){
  MedicalRecord record=latest(horseId).orElseThrow(()->new BusinessRuleException("A confirmed medical fitness conclusion is required"));
  MedicalVitalSign vital=vitalSigns.findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId()).orElse(null);
  Map<String,Object> row=new LinkedHashMap<>();
  row.put("medical_record_id",record.getMedicalRecordId());
  row.put("veterinarian_name",record.getVeterinarian()==null?null:record.getVeterinarian().getFullName());
  row.put("examined_at",record.getExaminedAt());row.put("confirmed_at",record.getConfirmedAt());
  row.put("training_eligible",record.getTrainingEligible());
  row.put("final_conclusion",record.getFinalConclusion());row.put("fitness_conclusion",record.getFinalConclusion());
  row.put("eligibility_reason",record.getEligibilityReason());
  row.put("body_temperature",vital==null?null:vital.getBodyTemperature());
  row.put("resting_heart_rate",vital==null?null:vital.getRestingHeartRate());
  row.put("resting_respiratory_rate",vital==null?null:vital.getRestingRespiratoryRate());
  row.put("measured_weight",vital==null?null:vital.getWeight());
  var movementExams=clinicalExams.findByMedicalRecord_MedicalRecordId(record.getMedicalRecordId())
   .stream().filter(exam->"MOVEMENT_LEGS".equals(exam.getExaminationArea())).toList();
  row.put("movement_legs_count",movementExams.size());
  row.put("movement_legs_status",movementExams.size()==1?movementExams.get(0).getConditionStatus():null);
  // N does not collect these measurements. Do not invent them or require an extra medical table.
  row.put("ideal_weight",null);row.put("body_condition_score",null);
  return row;
 }
}
