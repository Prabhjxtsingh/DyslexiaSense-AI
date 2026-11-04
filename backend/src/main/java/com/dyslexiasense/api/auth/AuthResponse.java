package com.dyslexiasense.api.auth;

public record AuthResponse(String accessToken, String tokenType, String email) {}
