package com.raceforge.backend.account.service;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.config.AuthProperties;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmtpEmailService implements EmailService {

    private final JavaMailSender mailSender;
    private final AuthProperties authProperties;
    private final String mailHost;

    public SmtpEmailService(
            JavaMailSender mailSender,
            AuthProperties authProperties,
            @Value("${spring.mail.host:}") String mailHost
    ) {
        this.mailSender = mailSender;
        this.authProperties = authProperties;
        this.mailHost = mailHost;
    }

    @Override
    public void sendOtp(String to, String otp) {
        ensureConfigured();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(authProperties.getMail().getFrom());
        message.setTo(to);
        message.setSubject("RaceForge email verification");
        message.setText("Your RaceForge verification code is " + otp + ". It expires shortly.");
        mailSender.send(message);
    }

    @Override
    public void sendPasswordReset(String to, String resetLink) {
        ensureConfigured();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(authProperties.getMail().getFrom());
        message.setTo(to);
        message.setSubject("RaceForge password reset");
        message.setText("Reset your RaceForge password using this link: " + resetLink);
        mailSender.send(message);
    }

    private void ensureConfigured() {
        if (mailHost == null || mailHost.isBlank()) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "MAIL_NOT_CONFIGURED",
                    "Email delivery is not configured"
            );
        }
    }
}
