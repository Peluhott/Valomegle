package com.sedanodev.valomegle.websocket;

import java.io.IOException;
import java.util.Collection;
import java.util.List;
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

    // Matches by session id rather than identity: the map holds the thread-safe
    // decorator, while the close callback hands back the raw underlying session.
    // Returns false when the user has already reconnected with a newer session.
    public boolean removeSession(String userId, WebSocketSession session) {
        boolean[] removed = {false};
        sessions.computeIfPresent(userId, (key, current) -> {
            if (current.getId().equals(session.getId())) {
                removed[0] = true;
                return null;
            }
            return current;
        });
        return removed[0];
    }

    public WebSocketSession getSession(String userId) {
        return sessions.get(userId);
    }

    public Collection<WebSocketSession> allSessions() {
        return List.copyOf(sessions.values());
    }
}
