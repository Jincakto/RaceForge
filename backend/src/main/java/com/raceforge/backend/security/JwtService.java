package com.raceforge.backend.security;

import com.raceforge.backend.account.AccountConstants;
import com.raceforge.backend.account.entity.Role;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.config.AuthProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final AuthProperties properties;
    private final SecretKey key;

    public JwtService(AuthProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        Role role = user.getRole();
        return Jwts.builder()
                .subject(user.getUserId())
                .issuer(properties.getJwt().getIssuer())
                .audience().add(properties.getJwt().getAudience()).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenDuration())))
                .claim("email", user.getEmail())
                .claim("status", user.getStatus())
                .claim("role_id", role == null ? null : role.getRoleId())
                .claim("role_name", role == null ? null : role.getRoleName())
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public AuthenticatedUser parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(properties.getJwt().getIssuer())
                .requireAudience(properties.getJwt().getAudience())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return new AuthenticatedUser(
                claims.getSubject(),
                claims.get("email", String.class),
                claims.get("status", String.class),
                claims.get("role_id", String.class),
                claims.get("role_name", String.class)
        );
    }

    public Duration accessTokenDuration() {
        return Duration.ofMinutes(properties.getJwt().getAccessTokenMinutes());
    }

    public boolean hasBusinessAuthority(User user) {
        return AccountConstants.STATUS_ACTIVE.equals(user.getStatus()) && user.getRole() != null;
    }
}
