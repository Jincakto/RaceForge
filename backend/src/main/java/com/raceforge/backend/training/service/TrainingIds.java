package com.raceforge.backend.training.service;
import com.raceforge.backend.common.exception.BusinessRuleException;
import com.raceforge.backend.horse.service.ModuleIdAllocator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.Set;
/** Adapter scoped to Training. Shared N allocation functions remain unchanged. */
@Component
public class TrainingIds {
 private static JdbcTemplate jdbc;
 private static ModuleIdAllocator allocator;
 private static final Set<String> SHARED=Set.of("ASN","HTR","PKG","HPG");
 private static final Map<String,String> SHARED_TABLES=Map.of("ASN","Horse_Assignment.id","HTR","Trainer.trainer_id","PKG","TRAINING_PACKAGE.package_id","HPG","HORSE_PACKAGE.horse_package_id");
 private static final Map<String,String> OWN=Map.of("PLN","Training_Plan.plan_id","SES","Training_Session.session_id","STG","Training_Stage.stage_id");
 public TrainingIds(JdbcTemplate template,ModuleIdAllocator existing){jdbc=template;allocator=existing;}
 /** Must be called inside the transaction which persists the record. */
 public static String next(String code){
  if(jdbc==null||allocator==null)throw new IllegalStateException("Training ID adapter not initialized");
  String prefix=code.endsWith("-")?code.substring(0,code.length()-1):code;
  if(SHARED.contains(prefix)){
   String map=SHARED_TABLES.get(prefix),table=map.substring(0,map.indexOf('.')),column=map.substring(map.indexOf('.')+1);
   // N may already have codes allocated by a sequence or earlier import. Never reuse them.
   for(int attempt=0;attempt<999;attempt++){
    String id=allocator.next(prefix);
    if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo."+table+" WHERE "+column+"=?",Integer.class,id)==0)return id;
   }
   throw new BusinessRuleException("No unused Training ID remains for "+prefix);
  }
  String mapping=OWN.get(prefix);if(mapping==null)throw new IllegalArgumentException("Unsupported Training prefix: "+prefix);
  String table=mapping.substring(0,mapping.indexOf('.')),column=mapping.substring(mapping.indexOf('.')+1);
  var rows=jdbc.query("SELECT next_value FROM dbo.Id_Counter WITH(UPDLOCK,HOLDLOCK) WHERE prefix=?",(rs,row)->rs.getLong(1),prefix);
  long current;
  if(rows.isEmpty()){
   Long last=jdbc.queryForObject("SELECT COALESCE(MAX(TRY_CONVERT(bigint,RIGHT("+column+",3))),0) FROM dbo."+table+" WHERE "+column+" LIKE ?",Long.class,prefix+"-%");current=last==null?0:last;
   jdbc.update("INSERT dbo.Id_Counter(prefix,next_value) VALUES(?,?)",prefix,current);
  }else current=rows.get(0);
  if(current<0||current>=999)throw new BusinessRuleException("No remaining Training IDs for "+prefix+"; maximum is 999");
  String id=prefix+"-"+String.format(java.util.Locale.ROOT,"%03d",current+1);
  if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo."+table+" WHERE "+column+"=?",Integer.class,id)>0)throw new BusinessRuleException("Training ID counter reached an existing code; synchronization required");
  jdbc.update("UPDATE dbo.Id_Counter SET next_value=? WHERE prefix=?",current+1,prefix);return id;
 }
}
