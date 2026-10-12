package com.raceforge.backend.security;

import com.raceforge.backend.account.AccountConstants;
import com.raceforge.backend.account.entity.User;
import com.raceforge.backend.account.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            AuthenticatedUser tokenUser = jwtService.parse(header.substring(7));
            User user = userRepository.findDetailedById(tokenUser.userId()).orElse(null);
            if (user != null && isSessionAllowed(user)) {
                List<SimpleGrantedAuthority> authorities = authoritiesFor(user);
                AuthenticatedUser principal = new AuthenticatedUser(
                        user.getUserId(),
                        user.getEmail(),
                        user.getStatus(),
                        user.getRole() == null ? null : user.getRole().getRoleId(),
                        user.getRole() == null ? null : user.getRole().getRoleName()
                );
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(principal, null, authorities)
                );
            }
        } catch (Exception ignored) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    private boolean isSessionAllowed(User user) {
        return AccountConstants.STATUS_ACTIVE.equals(user.getStatus())
                || AccountConstants.STATUS_PENDING.equals(user.getStatus())
                || AccountConstants.STATUS_REJECTED.equals(user.getStatus());
    }

    private List<SimpleGrantedAuthority> authoritiesFor(User user) {
        if (!AccountConstants.STATUS_ACTIVE.equals(user.getStatus()) || user.getRole() == null) {
            return List.of();
        }
        return List.of(new SimpleGrantedAuthority(user.getRole().getRoleName()));
    }
}
