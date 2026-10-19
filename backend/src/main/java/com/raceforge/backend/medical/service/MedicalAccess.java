package com.raceforge.backend.medical.service;
import com.raceforge.backend.horse.service.HorseAccess;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
@Component("medicalAccess")
public class MedicalAccess {
 private final JdbcTemplate jdbc;private final HorseAccess horses;
 public MedicalAccess(JdbcTemplate jdbc,HorseAccess horses){this.jdbc=jdbc;this.horses=horses;}
 public boolean readRecord(Authentication authentication,String id){
  var rows=jdbc.queryForList("SELECT hp.horse_id FROM dbo.Medical_Record mr JOIN dbo.Health_Profile hp ON hp.profile_id=mr.profile_id WHERE mr.medical_record_id=?",id);
  return !rows.isEmpty()&&horses.read(authentication,(String)rows.get(0).get("horse_id"));
 }
}
