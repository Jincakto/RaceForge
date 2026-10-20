package com.raceforge.backend.common.id;
import jakarta.persistence.*;
import java.lang.reflect.Field;
import java.util.Map;

/** Assigns immutable business identifiers before INSERT, across all entity aliases of a table. */
@MappedSuperclass
public abstract class BusinessEntity {
 private static final Map<String,String> PREFIXES=Map.ofEntries(
  Map.entry("Role","ROL-"),Map.entry("User","USR-"),Map.entry("Permission","PER-"),
  Map.entry("Horse","HOR-"),Map.entry("HORSE_RACE_HISTORY","RAC-"),
  Map.entry("TRAINING_PACKAGE","PKG-"),Map.entry("HORSE_PACKAGE","HPG-"),
  Map.entry("Training_Plan","PLN-"),Map.entry("Training_Session","SES-"),
  Map.entry("Health_Profile","HLT-"),Map.entry("Trainer","HTR-"),Map.entry("Horse_Assignment","ASN-"),Map.entry("Medical_Record","MED-"),
  Map.entry("Medical_Vital_Sign","VIT-"),Map.entry("Medical_Clinical_Exam","CLN-"),
  Map.entry("Training_Lock","LCK-"),Map.entry("Notification","NTF-"),Map.entry("Audit_Log","AUD-"),
  Map.entry("Refresh_Token","RFT-"),Map.entry("Password_Reset_Token","RST-"),Map.entry("Registration_Request","REQ-"),
  Map.entry("Training_Stage","STG-"),
  Map.entry("Training_Recommendation","REC-"),Map.entry("User_External_Login","EXT-"),Map.entry("Training_Protocol","PRO-"),Map.entry("Care_Task","CAR-"),Map.entry("Nutrition_Plan","NUT-"),Map.entry("Supply_Item","SUP-")
 );
 @PrePersist
 protected void assignBusinessId(){
  Class<?> type=getClass();while(type!=null&&!type.isAnnotationPresent(Table.class))type=type.getSuperclass();
  if(type==null)throw new IllegalStateException("Missing entity table");
  String table=type.getAnnotation(Table.class).name().replace("[","").replace("]","");
  String prefix=PREFIXES.get(table);if(prefix==null)throw new IllegalStateException("Missing ID prefix for "+table);
  for(Class<?> current=type;current!=null;current=current.getSuperclass())for(Field field:current.getDeclaredFields())if(field.isAnnotationPresent(Id.class)){
   try{field.setAccessible(true);if(field.get(this)==null)field.set(this,BusinessIds.next(prefix));return;}catch(IllegalAccessException e){throw new IllegalStateException(e);}
  }
 }
}
