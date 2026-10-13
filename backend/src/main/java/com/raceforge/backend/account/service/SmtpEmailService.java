package com.raceforge.backend.account.service;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.config.AuthProperties;
import jakarta.mail.MessagingException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
public class SmtpEmailService implements EmailService {

    private final JavaMailSender mailSender;
    private final AuthProperties authProperties;
    private final String mailHost;
    private final String otpTemplate;

    public SmtpEmailService(
            ObjectProvider<JavaMailSender> mailSender,
            AuthProperties authProperties,
            @Value("${spring.mail.host:}") String mailHost
    ) {
        this.mailSender = mailSender.getIfAvailable();
        this.authProperties = authProperties;
        this.mailHost = mailHost;
        try {
            this.otpTemplate = new ClassPathResource("templates/email/otp-verification.html")
                    .getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot load OTP email template", exception);
        }
    }

    @Override
    public void sendOtp(String to, String otp) {
        ensureConfigured();
        String minutes = Long.toString(authProperties.getOtp().getMinutes());
        String html = otpTemplate.replace("{{OTP_CODE}}", HtmlUtils.htmlEscape(otp))
                .replace("{{EXPIRATION_MINUTES}}", minutes);
        String plainText = """
                Verify your email address

                Hello,

                Thank you for creating your RaceForge account.
                To verify your email address, enter the one-time verification code below:

                %s

                This code is valid for %s minutes and can only be used once.
                For your security, never share this verification code with anyone, including RaceForge staff.

                Didn't request this code?
                You can safely ignore this email. Your account will remain secure.

                Best regards,
                The RaceForge Team

                RaceForge \u2014 Smarter Racehorse Training & Management
                \u00a9 2026 RaceForge. All rights reserved.
                """.formatted(otp, minutes);
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(authProperties.getMail().getFrom());
            helper.setTo(to);
            helper.setSubject("RaceForge email verification");
            helper.setText(plainText, html);
            mailSender.send(message);
        } catch (MessagingException exception) {
            throw new MailPreparationException("Could not prepare verification email", exception);
        }
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
        if (mailSender == null || mailHost == null || mailHost.isBlank()) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "MAIL_NOT_CONFIGURED",
                    "Email delivery is not configured"
            );
        }
    }
}
