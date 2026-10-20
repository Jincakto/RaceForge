package com.raceforge.backend.common.id;
import java.util.Map;
import org.springframework.stereotype.Component;
/** N API retained; allocation uses the shared PREFIX- counter and 001..999 limit. */
@Component
public class BusinessIdGenerator {
 public static final Map<String,String> USER_PREFIXES=Map.of("ROL-001","USR","ROL-002","USR","ROL-003","USR","ROL-004","USR","ROL-005","USR","ROL-007","USR");
 public String next(String prefix){return BusinessIds.next(prefix.endsWith("-")?prefix:prefix+"-");}
}
