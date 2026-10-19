package com.raceforge.backend.security;

import static org.junit.jupiter.api.Assertions.*;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.config.AuthProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import org.junit.jupiter.api.Test;

class JwtStringIdsTest {
    private static final String SECRET="a-test-signing-key-with-at-least-32-bytes";
    private JwtService service() {
        AuthProperties properties=new AuthProperties();
        properties.getJwt().setSecret(SECRET);
        properties.getJwt().setIssuer("raceforge-test");
        properties.getJwt().setAudience("raceforge-api-test");
        properties.getJwt().setAccessTokenMinutes(15);
        properties.getGoogle().setPasswordSetupMinutes(15);
        return new JwtService(properties);
    }
    @Test void accessAndPasswordSetupTokensRoundTripStringUserIdAndNumericRole() {
        JwtService jwt=service();
        User user=new User(); user.setUserId("VET-000"); user.setEmail("vet@example.test"); user.setStatus("ACTIVE");
        Role role=new Role(); role.setRoleId(3); role.setRoleName("VETERINARIAN"); user.setRole(role);
        AuthenticatedUser parsed=jwt.parse(jwt.createAccessToken(user));
        assertEquals("VET-000",parsed.userId()); assertEquals(Integer.valueOf(3),parsed.roleId());
        var setup=jwt.parseGooglePasswordSetupToken(jwt.createGooglePasswordSetupToken(user));
        assertEquals("VET-000",setup.userId());
    }
    @Test void numericLegacySubjectIsRejectedEvenWithValidSignature() {
        String token=Jwts.builder().subject("42").issuer("raceforge-test")
                .audience().add("raceforge-api-test").and()
                .expiration(Date.from(Instant.now().plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)),Jwts.SIG.HS256).compact();
        assertThrows(IllegalArgumentException.class,()->service().parse(token));
    }
}
