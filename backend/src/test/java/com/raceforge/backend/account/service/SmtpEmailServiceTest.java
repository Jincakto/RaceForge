package com.raceforge.backend.account.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.raceforge.backend.common.exception.ApiException;
import com.raceforge.backend.config.AuthProperties;
import jakarta.mail.Part;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.springframework.mail.MailSendException;
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
    void configuredSenderDeliversOtp() throws Exception {
        var beans = new StaticListableBeanFactory();
        var sender = mock(JavaMailSender.class);
        beans.addBean("mailSender", sender);
        var properties = new AuthProperties();
        properties.getMail().setFrom("no-reply@example.com");
        properties.getOtp().setMinutes(5);
        var message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        var service = new SmtpEmailService(beans.getBeanProvider(JavaMailSender.class), properties, "smtp.example.com");
        service.sendOtp("test@example.com", "012345");
        message.saveChanges();
        verify(sender).send(message);
        assertEquals("RaceForge email verification", message.getSubject());
        assertEquals("no-reply@example.com", message.getFrom()[0].toString());
        assertEquals("test@example.com", message.getAllRecipients()[0].toString());
        String html = body(message, "text/html");
        String plain = body(message, "text/plain");
        assertNotNull(html);
        assertNotNull(plain);
        assertTrue(html.contains("012345"));
        assertTrue(html.contains("<strong>5 minutes</strong>"));
        assertTrue(plain.contains("012345"));
        assertTrue(plain.contains("5 minutes"));
        assertFalse(html.contains("{{"));
        assertFalse(html.contains("<script"));
        assertFalse(html.contains("src=\"http"));
    }

    @Test
    void expiryIsDynamicAndTemplateValuesAreEscaped() throws Exception {
        var beans = new StaticListableBeanFactory();
        var sender = mock(JavaMailSender.class);
        beans.addBean("mailSender", sender);
        var properties = new AuthProperties();
        properties.getMail().setFrom("no-reply@example.com");
        properties.getOtp().setMinutes(9);
        var message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        var service = new SmtpEmailService(beans.getBeanProvider(JavaMailSender.class), properties, "smtp.example.com");
        service.sendOtp("test@example.com", "<b>123456</b>");
        message.saveChanges();
        String html = body(message, "text/html");
        assertTrue(html.contains("<strong>9 minutes</strong>"));
        assertFalse(html.contains("5 minutes"));
        assertTrue(html.contains("&lt;b&gt;123456&lt;/b&gt;"));
        assertFalse(html.contains("<b>123456</b>"));
    }

    @Test
    void deliveryFailurePropagatesAndPasswordResetKeepsPlainText() {
        var beans = new StaticListableBeanFactory();
        var sender = mock(JavaMailSender.class);
        beans.addBean("mailSender", sender);
        var properties = new AuthProperties();
        properties.getMail().setFrom("no-reply@example.com");
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("SMTP unavailable")).when(sender).send(any(MimeMessage.class));
        var service = new SmtpEmailService(beans.getBeanProvider(JavaMailSender.class), properties, "smtp.example.com");
        assertThrows(MailSendException.class, () -> service.sendOtp("test@example.com", "123456"));
        service.sendPasswordReset("test@example.com", "https://example.com/reset");
        var reset = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(reset.capture());
        assertEquals("RaceForge password reset", reset.getValue().getSubject());
        assertEquals("Reset your RaceForge password using this link: https://example.com/reset", reset.getValue().getText());
    }

    private String body(Part part, String mimeType) throws Exception {
        if (part.isMimeType(mimeType)) {
            assertTrue(part.getContentType().toLowerCase().contains("charset=utf-8"));
            return (String) part.getContent();
        }
        if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                String text = body(multipart.getBodyPart(i), mimeType);
                if (text != null) return text;
            }
        }
        return null;
    }
}
