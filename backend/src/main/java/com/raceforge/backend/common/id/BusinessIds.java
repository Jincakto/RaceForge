package com.raceforge.backend.common.id;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import com.raceforge.backend.common.exception.BusinessRuleException;

/** Counter updates use the caller's SQL transaction; row locks prevent duplicate allocations. */
@Component
public class BusinessIds {
 private static JdbcTemplate jdbc;
 public BusinessIds(JdbcTemplate template){jdbc=template;}
 public static void ensureRoleProfile(String userId,String roleName){
  String prefix=switch(roleName){case "HORSE_OWNER"->"OWN-";case "VETERINARIAN"->"VET-";case "CLUB_MANAGER"->"CM-";default->null;};
  if(prefix==null)return;
  Integer existing=jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Account_Role_Profile WITH(UPDLOCK,HOLDLOCK) WHERE user_id=? AND role_name=?",Integer.class,userId,roleName);
  if(existing!=null&&existing==0)jdbc.update("INSERT dbo.Account_Role_Profile(profile_id,user_id,role_name) VALUES(?,?,?)",next(prefix),userId,roleName);
 }
 public static String next(String prefix){
  if(jdbc==null)throw new IllegalStateException("ID generator not initialized");
  if("HOR-".equals(prefix)){
   try {
    Long number=jdbc.queryForObject("SELECT NEXT VALUE FOR dbo.Horse_Id_Sequence",Long.class);
    if(number==null||number<1||number>999)throw new BusinessRuleException("Horse ID range exhausted: maximum is 999.");
    String id="HOR-"+String.format(java.util.Locale.ROOT,"%03d",number);
    if(jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Horse WHERE horse_id=?",Integer.class,id)>0)throw new BusinessRuleException("Horse sequence reached an existing code; no code is reused.");
    return id;
   } catch(org.springframework.dao.DataAccessException ex){
    Throwable cause=ex;while(cause.getCause()!=null)cause=cause.getCause();
    if(cause instanceof java.sql.SQLException sql && sql.getErrorCode()==11728)throw new BusinessRuleException("Horse ID range exhausted: maximum is 999.");
    throw ex;
   }
  }
  var values=jdbc.query("UPDATE dbo.Id_Counter WITH (UPDLOCK,HOLDLOCK) SET next_value=next_value+1 OUTPUT INSERTED.next_value WHERE prefix=? AND next_value BETWEEN 0 AND 998",(rs,row)->rs.getLong(1),prefix);
  if(values.isEmpty()){
   Integer count=jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Id_Counter WHERE prefix=?",Integer.class,prefix);
   if(count==null||count==0)throw new IllegalStateException("ID counter missing: "+prefix);
   throw new BusinessRuleException("ID range exhausted for "+prefix+": maximum is 999. No new record was created.");
  }
  return prefix+String.format(java.util.Locale.ROOT,"%03d",values.get(0));
 }
}
