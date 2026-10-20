package com.raceforge.backend.horse.service;
import com.raceforge.backend.common.id.BusinessIds;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
/** Keep the N module contract; share counters with Training so codes cannot collide. */
@Service
public class ModuleIdAllocator {
 private static final Set<String> ALLOWED=Set.of("ASN","RAC","HTR","HLT","MED","VIT","CLN","LCK","PKG","HPG");
 @Transactional public String next(String prefix){
  if(!ALLOWED.contains(prefix))throw new IllegalArgumentException("Unsupported module ID prefix: "+prefix);
  return BusinessIds.next(prefix+"-");
 }
}
