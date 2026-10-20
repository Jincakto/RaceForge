package com.raceforge.backend.training;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.*;
import com.raceforge.backend.account.service.*;
import com.raceforge.backend.security.JwtService;
import jakarta.persistence.EntityManager;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.*;

/** Real SQL Server, real JWT filter and controllers. All fixture accounts and writes roll back. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@EnabledIfEnvironmentVariable(named="RACEFORGE_STRING_DB_TEST",matches="true")
class StringTrainingWorkflowIT {
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired UserRepository users;@Autowired RoleRepository roles;
 @Autowired PasswordEncoder passwords;@Autowired JwtService jwt;@Autowired JdbcTemplate jdbc;@Autowired EntityManager em;
 @MockitoBean EmailService email;@MockitoBean GoogleTokenVerifier google;
 String admin,manager,vet,owner,trainerA,trainerB,trainerC,ownerId,userA,userB,userC,profileA,profileB,profileC;
 final Map<String,Integer> horseWeights=new HashMap<>();
 static final String PASSWORD="TestOnlyPass123!";
 @BeforeEach void fixture() throws Exception {
  // Only the bootstrap administrator is a test fixture. Staff below are created through the real API.
  User boot=new User();boot.setRole(roles.findByRoleName("ADMIN").orElseThrow());boot.setFullName("Test bootstrap administrator");boot.setEmail("bootstrap-"+UUID.randomUUID()+"@example.com");boot.setPassword(passwords.encode(PASSWORD));boot.setEmailVerified(true);boot.setStatus("ACTIVE");users.saveAndFlush(boot);admin=jwt.createAccessToken(boot);
  manager=staff("CLUB_MANAGER")[1];vet=staff("VETERINARIAN")[1];
  var a=staff("HEAD_TRAINER");userA=a[0];trainerA=a[1];var b=staff("HEAD_TRAINER");userB=b[0];trainerB=b[1];var c=staff("HEAD_TRAINER");userC=c[0];trainerC=c[1];
  profileA=profile(userA);profileB=profile(userB);profileC=profile(userC);
  String address="owner-"+UUID.randomUUID()+"@example.com";
  call("POST","/api/auth/register",Map.of("fullName","Test owner","email",address,"password",PASSWORD,"requestedRoleId","ROL-002"),null,200);
  ArgumentCaptor<String> otp=ArgumentCaptor.forClass(String.class);verify(email).sendOtp(eq(address),otp.capture());
  var verified=call("POST","/api/auth/verify-email",Map.of("email",address,"otp",otp.getValue()),null,200).get("data");
  assertFalse(verified.get("accessToken").asText().isBlank());assertEquals("HORSE_OWNER",verified.get("user").get("role").get("roleName").asText());
  var login=call("POST","/api/auth/login",Map.of("email",address,"password",PASSWORD),null,200).get("data");
  owner=login.get("accessToken").asText();ownerId=login.get("user").get("userId").asText();
  assertEquals("HORSE_OWNER",login.get("user").get("role").get("roleName").asText());assertTrue(ownerId.startsWith("USR-"));
 }
 String[] staff(String role) throws Exception {
  var data=call("POST","/api/admin/accounts",Map.of("fullName","Test "+role,"email",UUID.randomUUID()+"@example.com","password",PASSWORD,"roleName",role),admin,200).get("data");
  String id=data.get("userId").asText();return new String[]{id,jwt.createAccessToken(users.findDetailedById(id).orElseThrow())};
 }
 String profile(String id) throws Exception{return call("POST","/api/trainer-profiles",Map.of("userId",id,"bio","Integration test trainer","qualifications","Test-only fixture"),admin,200).get("data").get("trainer_id").asText();}
 String horse(int weight) throws Exception {
  String id=call("POST","/api/horses?ownerId="+ownerId,Map.of("horseName","Test horse "+weight,"gender","MALE","coatColor","Brown","height",150,"dateOfBirth","2018-01-01","documentType","PASSPORT","documentUrl","https://example.com/test-horse-passport.pdf"),owner,201).get("data").get("horseId").asText();
  assertTrue(id.matches("HOR-\\d{3}"));horseWeights.put(id,weight);return id;
 }
 void examineAndAdmit(String horse) throws Exception {
  call("POST","/api/horses/"+horse+"/admission",null,owner,200);
  examination(horse,true,"INITIAL");
  call("POST","/api/horses/"+horse+"/admission/approve",Map.of("note","Exam confirmed fit"),manager,200);
 }
 void examination(String horse,boolean eligible,String type) throws Exception {
  String veterinarian=call("GET","/api/users/me",null,vet,200).get("data").get("userId").asText();
  String assignment=call("POST","/api/horses/"+horse+"/vet-assignments",Map.of("veterinarianId",veterinarian),manager,200).get("data").get("id").asText();
  call("POST","/api/vet-assignments/"+assignment+"/respond",Map.of("accepted",true),vet,200);
  String profile=call("GET","/api/horses/"+horse+"/health-profile",null,owner,200).get("data").asText();
  List<Map<String,Object>> exams=new ArrayList<>();
  for(String area:List.of("LEGS","EYES","RESPIRATORY","SKIN","MOVEMENT","GENERAL_CONDITION"))exams.add(Map.of("examinationArea",area,"conditionStatus","NORMAL"));
  Map<String,Object> body=new HashMap<>();
  body.put("profileId",profile);body.put("assignmentId",assignment);body.put("examType",type);body.put("examinedAt",LocalDateTime.now().minusSeconds(1).toString());
  body.put("healthStatus",eligible?"READY":"INJURED");body.put("finalConclusion",eligible?"FIT":"NOT_FIT");body.put("eligibilityReason","Test-only veterinary conclusion");
  body.put("idealWeight",400);body.put("bodyConditionScore",5);
  if(!eligible){body.put("overrideReason","Veterinarian restricts exercise based on the clinical history");body.put("trainingLockReason","Test-only restriction pending reassessment");}
  body.put("vitalSign",Map.of("bodyTemperature",37.8,"restingHeartRate",40,"restingRespiratoryRate",12,"weight",horseWeights.getOrDefault(horse,400)));body.put("clinicalExams",exams);
  String record=call("POST","/api/medical/records",body,vet,201).get("data").get("medicalRecordId").asText();
  call("POST","/api/medical/records/"+record+"/confirm",null,vet,200);em.flush();
 }
 String register(String horse,boolean paid) throws Exception {
  String catalog=call("POST","/api/training-packages",Map.of("packageName","Test Basic","packageType","BASIC","durationDays",30,"price",1000,"description","Integration fixture"),manager,201).get("data").get("packageId").asText();
  String id=call("POST","/api/horse-packages/register",Map.of("horseId",horse,"packageId",catalog),owner,201).get("data").get("horsePackageId").asText();
  if(paid)call("POST","/api/horse-packages/"+id+"/simulate-payment",Map.of("successful",true),owner,200);return id;
 }
 String assign(String pack,String profile,String trainer) throws Exception {
  String id=call("POST","/api/trainer-assignments",Map.of("horsePackageId",pack,"trainerId",profile),manager,200).get("data").get("assignment_id").asText();
  if(trainer!=null)call("POST","/api/trainer-assignments/"+id+"/respond",Map.of("accepted",true),trainer,200);return id;
 }
 Map<String,Object> stage(int end,String activity,List<String> days){return Map.of("startDay",1,"endDay",end,"activityName",activity,"intensity","LOW","daysOfWeek",days,"sessionTime","07:00","sessionEndTime","08:00");}
 String protocol(int from,int to,String activity,List<String> days) throws Exception {
  String id=call("POST","/api/training-protocols",Map.of("name","Test-only vet configured protocol","packageType","BASIC","minWeight",from,"maxWeight",to,"stages",List.of(stage(30,activity,days)),"sources",List.of("https://www.merckvetmanual.com/metabolic-disorders/fatigue-and-exercise-in-horses/prevention-of-fatigue-in-horses"),"rationale","Test fixture workload configured by veterinarian; source supports individual conditioning principles, not these exact workload values."),vet,200).get("data").get("protocol_id").asText();
  call("POST","/api/training-protocols/"+id+"/approve",null,vet,200);return id;
 }
 String manualPlan(String horse,String assignment,String token) throws Exception {return call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Test roadmap","assignmentId",assignment,"stages",List.of(stage(30,"Walk",List.of("MONDAY","WEDNESDAY")))),token,200).get("data").get("planId").asText();}
 @Test void roleProfilesAreSeparateFromAccountIdsAndExposedByApi() throws Exception {
  var ownerView=call("GET","/api/users/me",null,owner,200).get("data");
  assertTrue(ownerView.get("userId").asText().matches("USR-\\d{3}"));
  assertTrue(ownerView.get("profileId").asText().matches("OWN-\\d{3}"));
  assertTrue(call("GET","/api/users/me",null,vet,200).get("data").get("profileId").asText().matches("VET-\\d{3}"));
  assertTrue(call("GET","/api/users/me",null,manager,200).get("data").get("profileId").asText().matches("CM-\\d{3}"));
  assertEquals(profileA,call("GET","/api/users/me",null,trainerA,200).get("data").get("profileId").asText());
 }
 @Test void roleChangePreservesAccountAndPreviouslyAllocatedProfile() throws Exception {
  var original=call("GET","/api/users/me",null,manager,200).get("data");
  String id=original.get("userId").asText(),cmProfile=original.get("profileId").asText();
  call("PATCH","/api/admin/accounts/"+id+"/role",Map.of("roleName","VETERINARIAN"),admin,200);
  var changed=call("GET","/api/users/me",null,manager,200).get("data");
  assertEquals(id,changed.get("userId").asText());assertTrue(changed.get("profileId").asText().matches("VET-\\d{3}"));
  call("PATCH","/api/admin/accounts/"+id+"/role",Map.of("roleName","CLUB_MANAGER"),admin,200);
  assertEquals(cmProfile,call("GET","/api/users/me",null,manager,200).get("data").get("profileId").asText());
 }
 @Test void threeDigitCounterStopsAt999WithoutReusingOrIncrementing() {
  jdbc.update("UPDATE dbo.Id_Counter SET next_value=998 WHERE prefix='SUP-'");
  assertEquals("SUP-999",com.raceforge.backend.common.id.BusinessIds.next("SUP-"));
  assertThrows(com.raceforge.backend.common.exception.BusinessRuleException.class,()->com.raceforge.backend.common.id.BusinessIds.next("SUP-"));
  assertEquals(999,jdbc.queryForObject("SELECT next_value FROM dbo.Id_Counter WHERE prefix='SUP-'",Integer.class));
 }
 @Test void ownerOtpHasImmediateOwnerAccessAndCannotManageAccountsOrPermissions() throws Exception {
  assertNotEquals(userA,profileA);assertTrue(profileA.matches("HTR-\\d{3}"));
  call("GET","/api/admin/permissions/HEAD_TRAINER",null,owner,403);
  call("POST","/api/admin/accounts",Map.of("fullName","Forbidden","email","forbidden@example.com","password",PASSWORD,"roleName","ADMIN"),manager,403);
  call("POST","/api/admin/permissions/grant",Map.of("roleName","HEAD_TRAINER","permissionCode","MANAGE_PERMISSION"),admin,409);
  call("DELETE","/api/admin/permissions/revoke?roleName=ADMIN&permissionCode=MANAGE_PERMISSION",null,admin,409);
 }
 @Test void invalidOtpCountsAttemptsAndVerifiedOtpCannotBeReplayedForASession() throws Exception {
  String address="otp-test-"+UUID.randomUUID()+"@example.com";
  call("POST","/api/auth/register",Map.of("fullName","OTP test owner","email",address,"password",PASSWORD),null,200);
  ArgumentCaptor<String> otp=ArgumentCaptor.forClass(String.class);verify(email).sendOtp(eq(address),otp.capture());
  String wrong=otp.getValue().equals("000000")?"111111":"000000";
  call("POST","/api/auth/verify-email",Map.of("email",address,"otp",wrong),null,400);em.flush();
  assertEquals(1,jdbc.queryForObject("SELECT o.attempt_count FROM dbo.Email_Verification_OTP o JOIN dbo.[User] u ON u.user_id=o.user_id WHERE u.email=?",Integer.class,address));
  String token=call("POST","/api/auth/verify-email",Map.of("email",address,"otp",otp.getValue()),null,200).get("data").get("accessToken").asText();
  call("GET","/api/users/me",null,token,200);
  call("POST","/api/auth/verify-email",Map.of("email",address,"otp",otp.getValue()),null,409);
 }
 @Test void stringIdsWorkForPasswordResetRefreshAndPurposeBoundJwt() throws Exception {
  var account=users.findDetailedById(ownerId).orElseThrow();
  assertEquals(ownerId,jwt.parseGooglePasswordSetupToken(jwt.createGooglePasswordSetupToken(account)).userId());
  call("POST","/api/auth/forgot-password",Map.of("email",account.getEmail()),null,200);
  ArgumentCaptor<String> link=ArgumentCaptor.forClass(String.class);verify(email).sendPasswordReset(eq(account.getEmail()),link.capture());
  String raw=link.getValue().substring(link.getValue().indexOf("token=")+6);
  String changed="ChangedTestPass456!";
  call("POST","/api/auth/reset-password",Map.of("token",raw,"newPassword",changed),null,200);
  call("POST","/api/auth/login",Map.of("email",account.getEmail(),"password",PASSWORD),null,401);
  var response=mvc.perform(post("/api/auth/login").contentType(org.springframework.http.MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",account.getEmail(),"password",changed)))).andReturn().getResponse();assertEquals(200,response.getStatus());
  String cookie=response.getHeader("Set-Cookie").split(";",2)[0];String refresh=cookie.substring(cookie.indexOf('=')+1);
  call("POST","/api/auth/refresh",Map.of("refreshToken",refresh),null,200);
  call("POST","/api/auth/refresh",Map.of("refreshToken",refresh),null,401);
 }
 @Test void registeredPackageKeepsPaymentGateWithoutPaidAtColumnOrResponseField() throws Exception {
  String horse=horse(300);examineAndAdmit(horse);String pack=register(horse,false);
  call("POST","/api/trainer-assignments",Map.of("horsePackageId",pack,"trainerId",profileA),manager,409);
  var paid=call("POST","/api/horse-packages/"+pack+"/simulate-payment",Map.of("successful",true),owner,200).get("data");
  assertEquals("PAID",paid.get("paymentStatus").asText());assertFalse(paid.has("paidAt"));
  var history=call("GET","/api/horse-packages/horse/"+horse,null,owner,200).get("data");
  assertEquals(1,history.size());assertFalse(history.get(0).has("paidAt"));
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.HORSE_PACKAGE') AND name='paid_at'",Integer.class));
  assign(pack,profileA,trainerA);
 }

 void followUp(String horse,boolean eligible) throws Exception {examination(horse,eligible,"FOLLOW_UP");}
 String typedCatalog(String type) throws Exception {
  return call("POST","/api/training-packages",Map.of("packageName","Test "+type,"packageType",type,"durationDays",30,"price",1000),manager,201).get("data").get("packageId").asText();
 }
 @Test void allFourPackageTypesProduceDifferentPersistedCurriculaAndLinkedSessions() throws Exception {
  Set<String> goals=new HashSet<>(),phaseCodes=new HashSet<>();List<String> sessionIds=new ArrayList<>(),stageIds=new ArrayList<>();
  for(String type:List.of("BASIC","RACING","PERFORMANCE","RECOVERY")){
   String horse=horse(400);examineAndAdmit(horse);String catalog=typedCatalog(type);
   var preview=call("GET","/api/training-packages/"+catalog+"/roadmap-template",null,owner,200).get("data");assertEquals(type,preview.get("packageType").asText());goals.add(preview.get("goal").asText());
   String pack;
   if(type.equals("RECOVERY")){
    followUp(horse,false);
    pack=call("POST","/api/horse-packages/horse/"+horse+"/approve-recovery",Map.of("recoveryPackageId",catalog,"reason","Test-only veterinarian-directed return"),manager,200).get("data").get("horsePackageId").asText();
    call("POST","/api/horse-packages/"+pack+"/simulate-recovery-payment",Map.of("successful",true),owner,200);
    call("POST","/api/trainer-assignments",Map.of("horsePackageId",pack,"trainerId",profileA),manager,409);
    followUp(horse,true);call("POST","/api/medical/horses/"+horse+"/training-lock/unlock",Map.of("reason","Test-only clearance following confirmed review"),vet,200);em.flush();
   }else{
    pack=call("POST","/api/horse-packages/register",Map.of("horseId",horse,"packageId",catalog),owner,201).get("data").get("horsePackageId").asText();
    call("POST","/api/horse-packages/"+pack+"/simulate-payment",Map.of("successful",true),owner,200);
   }
   String assignment=assign(pack,profileA,trainerA);
   call("GET","/api/horse-packages/"+pack+"/roadmap-template",null,trainerC,403);
   var assignedPreview=call("GET","/api/horse-packages/"+pack+"/roadmap-template",null,trainerA,200).get("data");assertEquals(30,assignedPreview.get("durationDays").asInt());
   String plan=manualPlan(horse,assignment,trainerA);
   var stages=call("GET","/api/training-plans/"+plan+"/stages",null,trainerA,200).get("data");assertEquals(preview.get("phases").size(),stages.size());
   for(var s:stages){assertTrue(s.get("phase_code").asText().startsWith(type+"_"));assertFalse(s.get("objective").asText().isBlank());phaseCodes.add(s.get("phase_code").asText());}
   var generated=call("POST","/api/training-plans/"+plan+"/generate-sessions",Map.of("confirmed",true),trainerA,200).get("data");assertFalse(generated.isEmpty());
   for(var session:generated){assertEquals(type,session.get("packageType").asText());assertTrue(session.get("phaseCode").asText().startsWith(type+"_"));assertFalse(session.get("stageId").asText().isBlank());assertEquals("LOW",session.get("intensity").asText());assertEquals("Walk",session.get("activityName").asText());}
   sessionIds.add(generated.get(0).get("sessionId").asText());stageIds.add(generated.get(0).get("stageId").asText());
   em.flush();assertEquals(generated.size(),jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Session ts JOIN dbo.Training_Stage s ON s.stage_id=ts.training_stage_id AND s.plan_id=ts.plan_id WHERE ts.plan_id=?",Integer.class,plan));
  }
  assertEquals(4,goals.size());assertEquals(14,phaseCodes.size());
  assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE dbo.Training_Session SET training_stage_id=? WHERE session_id=?",stageIds.get(1),sessionIds.get(0)));
 }
 @Test void singleAndRecurringSessionsInheritTheSavedCurriculumInsteadOfRequestLabels() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true),assignment=assign(pack,profileA,trainerA),plan=manualPlan(horse,assignment,trainerA);
  var single=call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",LocalDate.now().plusDays(1)+"T07:00:00"),trainerA,200).get("data");assertEquals("BASIC_ROUTINE",single.get("phaseCode").asText());assertEquals("Walk",single.get("activityName").asText());
  var recurring=call("POST","/api/training-sessions/recurring",Map.of("planId",plan,"horseId",horse,"horsePackageId",pack,"activityName","Unrelated racing label","daysOfWeek",List.of("MONDAY","WEDNESDAY"),"sessionTime","14:00","sessionEndTime","15:00"),trainerA,200).get("data");
  for(var session:recurring){assertTrue(session.get("phaseCode").asText().startsWith("BASIC_"));assertEquals("Walk",session.get("activityName").asText());assertFalse(session.get("notes").asText().contains("Unrelated"));}
 }
 @Test void restGapsCannotBeBypassedBySingleSessionScheduling() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true),assignment=assign(pack,profileA,trainerA);
  Map<String,Object> early=new HashMap<>(stage(5,"Walk",List.of("MONDAY"))),late=new HashMap<>(stage(30,"Walk",List.of("MONDAY")));late.put("startDay",8);
  String plan=call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Rest gap roadmap","assignmentId",assignment,"stages",List.of(early,late)),trainerA,200).get("data").get("planId").asText();
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",LocalDate.now().plusDays(5)+"T07:00:00"),trainerA,409);
 }
 @Test void changingCatalogTypeDoesNotSilentlyReclassifyAnExistingPlan() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true),assignment=assign(pack,profileA,trainerA),plan=manualPlan(horse,assignment,trainerA);em.flush();
  jdbc.update("UPDATE p SET package_type='RACING' FROM dbo.TRAINING_PACKAGE p JOIN dbo.HORSE_PACKAGE hp ON hp.package_id=p.package_id WHERE hp.horse_package_id=?",pack);em.clear();
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",LocalDate.now().plusDays(1)+"T07:00:00"),trainerA,409);
 }


 @Test void stageEndTimeAndAtMostSixSelectedWeekdaysAreRequired() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true),assignment=assign(pack,profileA,trainerA);
  Map<String,Object> backwards=new HashMap<>(stage(30,"Walk",List.of("MONDAY")));backwards.put("sessionEndTime","06:00");
  call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Invalid window","assignmentId",assignment,"stages",List.of(backwards)),trainerA,409);
  Map<String,Object> allDays=stage(30,"Walk",Arrays.stream(DayOfWeek.values()).map(Enum::name).toList());
  call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Seven day selection","assignmentId",assignment,"stages",List.of(allDays)),trainerA,400);
  String plan=manualPlan(horse,assignment,trainerA);
  call("POST","/api/training-sessions/recurring",Map.of("planId",plan,"horseId",horse,"horsePackageId",pack,"activityName","Walk","daysOfWeek",Arrays.stream(DayOfWeek.values()).map(Enum::name).toList(),"sessionTime","07:00","sessionEndTime","08:00"),trainerA,400);
 }
 @Test void separateRequestsCannotAddASeventhTrainingDayButMayShareOneDay() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true),assignment=assign(pack,profileA,trainerA);
  String plan=call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Six day limit","assignmentId",assignment,"stages",List.of(stage(30,"Approved activity",List.of("MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY")))),trainerA,200).get("data").get("planId").asText();
  LocalDate monday=LocalDate.now().with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
  for(int d=0;d<6;d++){
   var session=call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",monday.plusDays(d)+"T07:00:00"),trainerA,200).get("data");
   assertEquals(monday.plusDays(d)+"T08:00:00",session.get("scheduledEnd").asText());assertTrue(session.get("actualEnd").isNull());
  }
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",monday.plusDays(6)+"T07:00:00"),trainerA,409);
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",monday+"T09:00:00","scheduledEnd",monday+"T10:00:00"),trainerA,200);
  assertEquals(6,jdbc.queryForObject("SELECT COUNT(DISTINCT CAST(scheduled_start AS date)) FROM dbo.Training_Session WHERE horse_id=? AND scheduled_start>=? AND scheduled_start<?",Integer.class,horse,monday.atStartOfDay(),monday.plusWeeks(1).atStartOfDay()));
 }
 @Test void overlappingWindowsAreRejectedButAdjacentWindowsAreAllowed() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true),assignment=assign(pack,profileA,trainerA),plan=manualPlan(horse,assignment,trainerA);LocalDate date=LocalDate.now().plusDays(1);
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",date+"T07:00:00","scheduledEnd",date+"T08:00:00"),trainerA,200);
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",date+"T07:30:00","scheduledEnd",date+"T08:30:00"),trainerA,409);
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",date+"T08:00:00","scheduledEnd",date+"T09:00:00"),trainerA,200);
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",date+"T10:00:00","scheduledEnd",date+"T09:00:00"),trainerA,409);
 }
 @Test void differentStagesCannotHideSevenTrainingDaysInTheSameWeek() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true),assignment=assign(pack,profileA,trainerA);
  LocalDate monday=LocalDate.now().with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));int sunday=(int)ChronoUnit.DAYS.between(LocalDate.now(),monday.plusDays(6))+1;
  Map<String,Object> weekdays=new HashMap<>(stage(sunday-1,"Approved activity",List.of("MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"))),sundays=new HashMap<>(stage(30,"Approved activity",List.of("SUNDAY")));sundays.put("startDay",sunday);
  call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Seven days across stages","assignmentId",assignment,"stages",List.of(weekdays,sundays)),trainerA,409);
 }

 @Test void medicalExaminationMustPrecedeAdmissionAndPurchase() throws Exception {
  String horse=horse(300);call("POST","/api/horses/"+horse+"/admission",null,owner,200);
  call("POST","/api/horses/"+horse+"/admission/approve",Map.of("note","No examination"),manager,409);
 }
 @Test void unpaidPackageAndUnacceptedOrOtherTrainersAreBlocked() throws Exception {
  String horse=horse(300);examineAndAdmit(horse);String pack=register(horse,false);
  call("POST","/api/trainer-assignments",Map.of("horsePackageId",pack,"trainerId",profileA),manager,409);
 }
 @Test void multipleTrainersMayAcceptButStrangersCannotReadOrWrite() throws Exception {
  String horse=horse(300);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,null);
  call("POST","/api/trainer-assignments/"+assignment+"/respond",Map.of("accepted",true),trainerB,403);
  call("POST","/api/trainer-assignments/"+assignment+"/respond",Map.of("accepted",true),trainerA,200);assign(pack,profileB,trainerB);
  String plan=manualPlan(horse,assignment,trainerA);
  call("GET","/api/training-sessions/horse/"+horse,null,trainerA,200);call("GET","/api/training-sessions/horse/"+horse,null,trainerB,200);call("GET","/api/training-sessions/horse/"+horse,null,trainerC,403);
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",LocalDate.now().plusDays(1)+"T07:00:00"),trainerC,403);
 }
 @Test void vettedWeightBandsProduceDifferentSuggestionsWithHealthSnapshots() throws Exception {
  protocol(200,400,"Lightweight protocol activity",List.of("MONDAY","WEDNESDAY"));protocol(400,600,"Higher-weight protocol activity",List.of("TUESDAY","THURSDAY"));
  Set<String> protocols=new HashSet<>();
  for(int kg:new int[]{300,500}){
   String horse=horse(kg);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);
   var rec=call("POST","/api/horse-packages/"+pack+"/training-recommendations",Map.of("assignmentId",assignment),trainerA,200).get("data");
   assertEquals(kg,rec.get("weightKg").asInt());assertTrue(rec.get("requiresTrainerConfirmation").asBoolean());assertFalse(rec.get("veterinarianName").asText().isBlank());protocols.add(rec.get("protocolId").asText());
  }
  assertEquals(2,protocols.size());
 }
 @Test void confirmedSuggestionGeneratesPersistsAndCompletesRoadmapSessions() throws Exception {
  protocol(200,600,"Walk conditioning",List.of("MONDAY","WEDNESDAY"));String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);
  String rec=call("POST","/api/horse-packages/"+pack+"/training-recommendations",Map.of("assignmentId",assignment),trainerA,200).get("data").get("recommendationId").asText();
  String plan=call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Suggested roadmap","assignmentId",assignment,"recommendationId",rec,"recommendationConfirmed",true),trainerA,200).get("data").get("planId").asText();
  call("GET","/api/horses/"+horse+"/training-plans",null,trainerA,200);
  var generated=call("POST","/api/training-plans/"+plan+"/generate-sessions",Map.of("confirmed",true),trainerA,200).get("data");
  int count=0;for(int day=0;day<30;day++)if(Set.of(DayOfWeek.MONDAY,DayOfWeek.WEDNESDAY).contains(LocalDate.now().plusDays(day).getDayOfWeek()))count++;
  assertEquals(count,generated.size());String session=generated.get(0).get("sessionId").asText();em.flush();em.clear();
  assertEquals(count,jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Training_Session WHERE plan_id=?",Integer.class,plan));
  assertEquals(pack,jdbc.queryForObject("SELECT horse_package_id FROM dbo.Training_Plan WHERE plan_id=?",String.class,plan));
  call("PATCH","/api/training-sessions/"+session+"/start",null,trainerA,200);
  em.flush();jdbc.update("UPDATE dbo.Training_Session SET actual_start=DATEADD(minute,-5,SYSDATETIME()) WHERE session_id=?",session);em.clear();
  call("PATCH","/api/training-sessions/"+session+"/stop",null,trainerA,200);
  em.flush();jdbc.update("UPDATE dbo.Training_Session SET actual_end=DATEADD(minute,-3,SYSDATETIME()) WHERE session_id=?",session);em.clear();
  var completed=call("PATCH","/api/training-sessions/"+session+"/complete",Map.of("distance",1.2,"endExerciseHeartRate",140,"recoveryHeartRate2Min",80,"recoveryMeasuredAt",LocalDateTime.now().minusMinutes(1).toString(),"avgSpeed",14,"maxSpeed",20,"performanceNotes","Test completed"),trainerA,200).get("data");
  assertEquals(1.2,completed.get("distance").asDouble());assertEquals(40,completed.get("restingHeartRate").asInt());
  em.flush();assertEquals("COMPLETED",jdbc.queryForObject("SELECT status FROM dbo.Training_Session WHERE session_id=?",String.class,session));
  call("GET","/api/training-sessions/horse/"+horse,null,owner,200);
  assertEquals(1,call("GET","/api/trainer-profiles/"+profileA+"/sessions",null,manager,200).get("data").size());
  call("POST","/api/training-plans/"+plan+"/generate-sessions",Map.of("confirmed",true),trainerA,409);
 }
 @Test void replacementKeepsHistoryAndRequiresNewAcceptance() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);String plan=manualPlan(horse,assignment,trainerA);
  String next=call("POST","/api/trainer-assignments/"+assignment+"/replace",Map.of("trainerId",profileC,"reason","Schedule change"),manager,200).get("data").get("assignment_id").asText();
  call("GET","/api/training-plans/"+plan+"/stages",null,trainerA,403);call("GET","/api/training-plans/"+plan+"/stages",null,trainerC,403);
  call("POST","/api/trainer-assignments/"+next+"/respond",Map.of("accepted",true),trainerC,200);
  call("GET","/api/training-plans/"+plan+"/stages",null,trainerC,200);
  assertEquals("REASSIGNED",jdbc.queryForObject("SELECT status FROM dbo.Horse_Assignment WHERE id=?",String.class,assignment));
  call("GET","/api/trainer-profiles/"+profileA+"/history",null,manager,200);
 }
 @Test void noApprovedProtocolDoesNotInventWeightBasedWorkload() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);
  var context=call("GET","/api/horse-packages/"+pack+"/training-context",null,trainerA,200).get("data");assertEquals(400,context.get("weightKg").asInt());assertTrue(context.get("trainingAllowed").asBoolean());
  call("POST","/api/horse-packages/"+pack+"/training-recommendations",Map.of("assignmentId",assignment),trainerA,409);
 }
 @Test void revokedPermissionAppliesImmediatelyWithoutChangingJwt() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);String plan=manualPlan(horse,assignment,trainerA);
  call("DELETE","/api/admin/permissions/revoke?roleName=HEAD_TRAINER&permissionCode=MANAGE_TRAINING",null,admin,200);
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",LocalDate.now().plusDays(1)+"T07:00:00"),trainerA,403);
  call("POST","/api/admin/permissions/grant",Map.of("roleName","HEAD_TRAINER","permissionCode","MANAGE_TRAINING"),admin,200);
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",LocalDate.now().plusDays(1)+"T07:00:00"),trainerA,200);
 }
 @Test void pausedPackageAndTrainingLockBlockAllSchedulingPaths() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);String plan=manualPlan(horse,assignment,trainerA);
  em.flush();jdbc.update("UPDATE dbo.Horse SET training_locked=1 WHERE horse_id=?",horse);em.clear();
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",LocalDate.now().plusDays(1)+"T07:00:00"),trainerA,409);
  call("POST","/api/training-sessions/recurring",Map.of("planId",plan,"horseId",horse,"horsePackageId",pack,"activityName","Walk","daysOfWeek",List.of("MONDAY")),trainerA,409);
  call("POST","/api/training-plans/"+plan+"/generate-sessions",Map.of("confirmed",true),trainerA,409);
  call("GET","/api/training-plans/"+plan+"/stages",null,trainerA,200);
  jdbc.update("UPDATE dbo.Horse SET training_locked=0 WHERE horse_id=?",horse);jdbc.update("UPDATE dbo.HORSE_PACKAGE SET status='PAUSED' WHERE horse_package_id=?",pack);em.clear();
  call("POST","/api/training-sessions",Map.of("planId",plan,"horseId",horse,"scheduledTime",LocalDate.now().plusDays(1)+"T07:00:00"),trainerA,409);
 }
 @Test void staleSuggestionCannotCreateAPlanAfterWeightChanges() throws Exception {
  protocol(200,600,"Walk",List.of("MONDAY"));String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);
  String rec=call("POST","/api/horse-packages/"+pack+"/training-recommendations",Map.of("assignmentId",assignment),trainerA,200).get("data").get("recommendationId").asText();
  em.flush();jdbc.update("UPDATE v SET weight=450 FROM dbo.Medical_Vital_Sign v JOIN dbo.Medical_Record mr ON mr.medical_record_id=v.medical_record_id JOIN dbo.Health_Profile hp ON hp.profile_id=mr.profile_id WHERE hp.horse_id=?",horse);em.clear();
  call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Stale draft","assignmentId",assignment,"recommendationId",rec,"recommendationConfirmed",true),trainerA,409);
 }
 @Test void trainerMustConfirmAndOnlyVeterinariansPublishProtocols() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);
  String protocol=protocol(200,600,"Walk",List.of("MONDAY"));
  call("POST","/api/training-protocols/"+protocol+"/approve",null,trainerA,403);
  String rec=call("POST","/api/horse-packages/"+pack+"/training-recommendations",Map.of("assignmentId",assignment),trainerA,200).get("data").get("recommendationId").asText();
  call("POST","/api/horses/"+horse+"/training-plans",Map.of("planName","Unconfirmed draft","assignmentId",assignment,"recommendationId",rec,"recommendationConfirmed",false),trainerA,409);
 }
 @Test void changedStaffRoleKeepsBothIdentifiersAndClosesAssignments() throws Exception {
  String horse=horse(400);examineAndAdmit(horse);String pack=register(horse,true);String assignment=assign(pack,profileA,trainerA);
  call("PATCH","/api/admin/accounts/"+userA+"/role",Map.of("roleName","VETERINARIAN"),admin,200);
  assertEquals(userA,jdbc.queryForObject("SELECT user_id FROM dbo.Trainer WHERE trainer_id=?",String.class,profileA));
  assertEquals("CANCELLED",jdbc.queryForObject("SELECT status FROM dbo.Horse_Assignment WHERE id=?",String.class,assignment));
  call("GET","/api/trainer-assignments/me",null,trainerA,403);
 }
 @Test void databaseRejectsCrossPackagePlanAssignmentEvenOutsideTheApi() throws Exception {
  String horse1=horse(300);examineAndAdmit(horse1);String pack1=register(horse1,true);String assignment1=assign(pack1,profileA,trainerA);String plan=manualPlan(horse1,assignment1,trainerA);
  String horse2=horse(500);examineAndAdmit(horse2);String pack2=register(horse2,true);String assignment2=assign(pack2,profileA,trainerA);
  call("POST","/api/horses/"+horse1+"/training-plans",Map.of("planName","Wrong horse","assignmentId",assignment2,"stages",List.of(stage(30,"Walk",List.of("MONDAY")))),trainerA,409);
  em.flush();assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("UPDATE dbo.Training_Plan SET trainer_assignment_id=? WHERE plan_id=?",assignment2,plan));
 }
 JsonNode call(String method,String uri,Object body,String token,int expected) throws Exception {
  var request=request(HttpMethod.valueOf(method),uri);if(token!=null)request.header("Authorization","Bearer "+token);if(body!=null)request.contentType(org.springframework.http.MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
  var response=mvc.perform(request).andReturn().getResponse();assertEquals(expected,response.getStatus(),method+" "+uri+" -> "+response.getContentAsString());
  return response.getContentAsString().isBlank()?json.createObjectNode():json.readTree(response.getContentAsString());
 }
}
