package com.raceforge.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "raceforge")
public class AuthProperties {

    private final Jwt jwt = new Jwt();
    private final RefreshToken refreshToken = new RefreshToken();
    private final Otp otp = new Otp();
    private final PasswordReset passwordReset = new PasswordReset();
    private final Google google = new Google();
    private final Mail mail = new Mail();

    public Jwt getJwt() {
        return jwt;
    }

    public RefreshToken getRefreshToken() {
        return refreshToken;
    }

    public Otp getOtp() {
        return otp;
    }

    public PasswordReset getPasswordReset() {
        return passwordReset;
    }

    public Google getGoogle() {
        return google;
    }

    public Mail getMail() {
        return mail;
    }

    public static class Jwt {
        private String secret;
        private String issuer;
        private String audience;
        private long accessTokenMinutes;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }

        public String getAudience() {
            return audience;
        }

        public void setAudience(String audience) {
            this.audience = audience;
        }

        public long getAccessTokenMinutes() {
            return accessTokenMinutes;
        }

        public void setAccessTokenMinutes(long accessTokenMinutes) {
            this.accessTokenMinutes = accessTokenMinutes;
        }
    }

    public static class RefreshToken {
        private long days;
        private String cookieName;
        private boolean secureCookie;
        private String sameSite;

        public long getDays() {
            return days;
        }

        public void setDays(long days) {
            this.days = days;
        }

        public String getCookieName() {
            return cookieName;
        }

        public void setCookieName(String cookieName) {
            this.cookieName = cookieName;
        }

        public boolean isSecureCookie() {
            return secureCookie;
        }

        public void setSecureCookie(boolean secureCookie) {
            this.secureCookie = secureCookie;
        }

        public String getSameSite() {
            return sameSite;
        }

        public void setSameSite(String sameSite) {
            this.sameSite = sameSite;
        }
    }

    public static class Otp {
        private String secret;
        private long minutes;
        private long resendSeconds;
        private int maxAttempts;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getMinutes() {
            return minutes;
        }

        public void setMinutes(long minutes) {
            this.minutes = minutes;
        }

        public long getResendSeconds() {
            return resendSeconds;
        }

        public void setResendSeconds(long resendSeconds) {
            this.resendSeconds = resendSeconds;
        }

        public int getMaxAttempts() {
            return maxAttempts;
        }

        public void setMaxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
        }
    }

    public static class PasswordReset {
        private long minutes;
        private String frontendUrl;

        public long getMinutes() {
            return minutes;
        }

        public void setMinutes(long minutes) {
            this.minutes = minutes;
        }

        public String getFrontendUrl() {
            return frontendUrl;
        }

        public void setFrontendUrl(String frontendUrl) {
            this.frontendUrl = frontendUrl;
        }
    }

    public static class Google {
        private String clientId;

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }
    }

    public static class Mail {
        private String from;

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }
    }
}
