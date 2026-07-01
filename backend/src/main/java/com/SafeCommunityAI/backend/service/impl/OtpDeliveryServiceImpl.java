package com.SafeCommunityAI.backend.service.impl;

import com.SafeCommunityAI.backend.service.OtpDeliveryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class OtpDeliveryServiceImpl implements OtpDeliveryService {
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean emailEnabled;
    private final String fromAddress;

    public OtpDeliveryServiceImpl(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.otp.email.enabled:false}") boolean emailEnabled,
            @Value("${app.otp.email.from:no-reply@safecommunityai.local}") String fromAddress
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.emailEnabled = emailEnabled;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendLoginOtp(String email, String fullName, String otpCode) {
        log.info("SafeCommunityAI login OTP for {} <{}>: {}", fullName, email, otpCode);
        if (emailEnabled) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromAddress);
                message.setTo(email);
                message.setSubject("Your SafeCommunityAI login OTP");
                message.setText("""
                        Hello %s,

                        Your SafeCommunityAI login OTP is %s.

                        This code expires in 5 minutes. If you did not request it, please ignore this message.
                        """.formatted(fullName, otpCode));
                mailSenderProvider.getObject().send(message);
                return;
            } catch (MailException ex) {
                log.error("Failed to send SafeCommunityAI login OTP email to {}", email, ex);
            }
        }
    }
}
