package com.sedanodev.valomegle.websocket;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class WebSocketSessionManager {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public void addSession(String userId, WebSocketSession session) {
        WebSocketSession previous = sessions.put(userId, session);
        if (previous != null && previous.isOpen()) {
            try {
                previous.close(CloseStatus.NORMAL.withReason("Replaced by new connection"));
            } catch (IOException e) {
                log.warn("Failed to close superseded session for {}", userId, e);
            }
        }
    }

    public boolean removeSession(String userId, WebSocketSession session) {
        return sessions.remove(userId, session);
    }

    public WebSocketSession getSession(String userId) {
        return sessions.get(userId);
    }
}