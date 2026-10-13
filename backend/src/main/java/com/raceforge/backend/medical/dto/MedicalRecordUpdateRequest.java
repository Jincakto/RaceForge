package com.raceforge.backend.medical.dto;

import java.time.LocalDateTime;
import java.util.List;

public class MedicalRecordUpdateRequest {
    private LocalDateTime examinedAt;
    private String healthStatus;
    private String diagnosis;
    private String treatment;
    private String medication;
    private String careRecommendation;
    private String notes;
    private MedicalVitalSignRequest vitalSign;
    private List<MedicalClinicalExamRequest> clinicalExams;

    public LocalDateTime getExaminedAt() { 
      return examinedAt; 
    }
  
    public void setExaminedAt(LocalDateTime examinedAt) { 
      this.examinedAt = examinedAt; 
    }
  
    public String getHealthStatus() { 
      return healthStatus; 
    }
  
    public void setHealthStatus(String healthStatus) { 
      this.healthStatus = healthStatus; 
    }
  
    public String getDiagnosis() { 
      return diagnosis; 
    }
  
    public void setDiagnosis(String diagnosis) { 
      this.diagnosis = diagnosis; 
    }
  
    public String getTreatment() { 
      return treatment; 
    }
  
    public void setTreatment(String treatment) { 
      this.treatment = treatment; 
    }
  
    public String getMedication() { 
      return medication; 
    }
  
    public void setMedication(String medication) { 
      this.medication = medication; 
    }
  
    public String getCareRecommendation() { 
      return careRecommendation; 
    }
  
    public void setCareRecommendation(String careRecommendation) { 
      this.careRecommendation = careRecommendation; 
    }
  
    public String getNotes() { 
      return notes; 
    }
  
    public void setNotes(String notes) { 
      this.notes = notes; 
    }
  
    public MedicalVitalSignRequest getVitalSign() { 
      return vitalSign; 
    }
  
    public void setVitalSign(MedicalVitalSignRequest vitalSign) { 
      this.vitalSign = vitalSign; 
    }
  
    public List<MedicalClinicalExamRequest> getClinicalExams() { 
      return clinicalExams; 
    }
  
    public void setClinicalExams(List<MedicalClinicalExamRequest> clinicalExams) { 
      this.clinicalExams = clinicalExams; 
    }
  
}
