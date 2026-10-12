package com.raceforge.backend.account.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.config.AuthProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpEmailServiceTest {
    @Test
    void missingMailConfigurationDoesNotPreventStartupButRejectsDelivery() {
        var beans = new StaticListableBeanFactory();
        var service = new SmtpEmailService(beans.getBeanProvider(JavaMailSender.class), new AuthProperties(), "");
        assertThrows(ApiException.class, () -> service.sendOtp("test@example.com", "123456"));
        assertThrows(ApiException.class, () -> service.sendPasswordReset("test@example.com", "https://example.com/reset"));
    }

    @Test
    void configuredSenderDeliversOtp() {
        var beans = new StaticListableBeanFactory();
        var sender = mock(JavaMailSender.class);
        beans.addBean("mailSender", sender);
        var properties = new AuthProperties();
        properties.getMail().setFrom("no-reply@example.com");
        var service = new SmtpEmailService(beans.getBeanProvider(JavaMailSender.class), properties, "smtp.example.com");
        service.sendOtp("test@example.com", "123456");
        verify(sender).send(any(SimpleMailMessage.class));
    }
}
