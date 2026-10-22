package com.raceforge.backend.account.service;

public interface EmailService {

    void sendOtp(String to, String otp);

    void sendPasswordReset(String to, String resetLink);

    void sendStaffInvitation(String to, String setupLink);
}
