package com.dyslexiasense.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class MlClientConfig {
    @Bean
    RestClient mlRestClient(
            RestClient.Builder builder,
            @Value("${app.ml.base-url}") String baseUrl) {
        return builder.baseUrl(baseUrl).build();
    }
}
