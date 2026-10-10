package com.raceforge.backend.account.service;

public interface GoogleTokenVerifier {

    GoogleIdentity verify(String idToken);
}
