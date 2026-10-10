package com.raceforge.backend;

import com.raceforge.backend.account.repository.EmailVerificationOtpRepository;
import com.raceforge.backend.account.repository.PasswordResetTokenRepository;
import com.raceforge.backend.account.repository.RefreshTokenRepository;
import com.raceforge.backend.account.repository.RegistrationRequestRepository;
import com.raceforge.backend.account.repository.RoleRepository;
import com.raceforge.backend.account.repository.UserExternalLoginRepository;
import com.raceforge.backend.account.repository.UserRepository;
import com.raceforge.backend.audit.repository.AuditLogRepository;
import com.raceforge.backend.horse.repository.HorseRepository;
import com.raceforge.backend.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
		"spring.autoconfigure.exclude="
				+ "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
				+ "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
				+ "org.springframework.boot.data.jpa.autoconfigure.DataJpaRepositoriesAutoConfiguration,"
				+ "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
})
class BackendApplicationTests {

	@MockitoBean
	private UserRepository userRepository;
	@MockitoBean
	private RoleRepository roleRepository;
	@MockitoBean
	private EmailVerificationOtpRepository emailVerificationOtpRepository;
	@MockitoBean
	private RegistrationRequestRepository registrationRequestRepository;
	@MockitoBean
	private RefreshTokenRepository refreshTokenRepository;
	@MockitoBean
	private PasswordResetTokenRepository passwordResetTokenRepository;
	@MockitoBean
	private UserExternalLoginRepository userExternalLoginRepository;
	@MockitoBean
	private NotificationRepository notificationRepository;
	@MockitoBean
	private AuditLogRepository auditLogRepository;
	@MockitoBean
	private HorseRepository horseRepository;
	@MockitoBean
	private JavaMailSender javaMailSender;

	@Test
	void contextLoads() {
	}

}
