package com.raceforge.backend.training.support;
import jakarta.persistence.*;
import java.lang.reflect.Field;
import java.util.Map;

/** Assigns immutable business identifiers before INSERT, across all entity aliases of a table. */
@MappedSuperclass
public abstract class TrainingEntity {
 private static final Map<String,String> PREFIXES=Map.ofEntries(
  Map.entry("TRAINING_PACKAGE","PKG"),Map.entry("HORSE_PACKAGE","HPG"),
  Map.entry("Training_Plan","PLN"),Map.entry("Training_Session","SES"),Map.entry("Trainer","HTR"),
  Map.entry("Horse_Assignment","ASN"),Map.entry("Training_Stage","STG"),
  Map.entry("Training_Recommendation","REC"),Map.entry("Training_Protocol","PRO")
 );
 @PrePersist
 protected void assignBusinessId(){
  Class<?> type=getClass();while(type!=null&&!type.isAnnotationPresent(Table.class))type=type.getSuperclass();
  if(type==null)throw new IllegalStateException("Missing entity table");
  String table=type.getAnnotation(Table.class).name().replace("[","").replace("]","");
  String prefix=PREFIXES.get(table);if(prefix==null)throw new IllegalStateException("Missing ID prefix for "+table);
  for(Class<?> current=type;current!=null;current=current.getSuperclass())for(Field field:current.getDeclaredFields())if(field.isAnnotationPresent(Id.class)){
   try{field.setAccessible(true);if(field.get(this)==null)field.set(this,TrainingIds.next(prefix));return;}catch(IllegalAccessException e){throw new IllegalStateException(e);}
  }
 }
}
