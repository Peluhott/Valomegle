package com.sedanodev.valomegle.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Spring Boot 4's default Jackson auto-configuration doesn't expose a
// com.fasterxml.jackson.databind.ObjectMapper bean, so WebSocketHandler and
// WebSocketMessenger need one defined explicitly to share a single instance.
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
