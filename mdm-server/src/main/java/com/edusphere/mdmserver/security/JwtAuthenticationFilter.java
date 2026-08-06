package com.edusphere.mdmserver.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        
        if (authHeader == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (authHeader.startsWith("Bearer ")) {
                handleUserAuthentication(request, authHeader.substring(7));
            } else if (authHeader.startsWith("Device ")) {
                handleDeviceAuthentication(request, authHeader.substring(7));
            }
        } catch (Exception ex) {
            // Token không hợp lệ hoặc hết hạn, bỏ qua để Spring Security chặn ở bước authorize
        }

        filterChain.doFilter(request, response);
    }

    private void handleUserAuthentication(HttpServletRequest request, String jwt) {
        String username = jwtService.extractSubject(jwt);
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtService.isTokenValid(jwt, username)) {
                String role = jwtService.extractClaim(jwt, claims -> claims.get("role", String.class));
                java.util.List<org.springframework.security.core.authority.SimpleGrantedAuthority> authorities = 
                        role != null ? java.util.Collections.singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority(role)) 
                                     : java.util.Collections.emptyList();
                
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        username, null, authorities
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
    }

    private void handleDeviceAuthentication(HttpServletRequest request, String jwt) {
        String deviceId = jwtService.extractSubject(jwt);
        if (deviceId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (jwtService.isTokenValid(jwt, deviceId)) {
                // Tạo một Authentication giả lập cho Device (Có thể dùng làm thông tin để controller nhận biết device đang gọi)
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        deviceId, null, null
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
    }
}
