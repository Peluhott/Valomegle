package com.sedanodev.valomegle.websocket;

import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.SessionLimitExceededException;

@Slf4j
@Component
public class WebSocketMessenger {

    private final WebSocketSessionManager sessionManager;
    private final ObjectMapper objectMapper;

    public WebSocketMessenger(WebSocketSessionManager sessionManager, ObjectMapper objectMapper) {
        this.sessionManager = sessionManager;
        this.objectMapper = objectMapper;
    }

    public boolean isOnline(String userId) {
        WebSocketSession session = sessionManager.getSession(userId);
        return session != null && session.isOpen();
    }

    // Returns false when the target is unreachable - either not connected, or the
    // send failed. A failed send means the socket is broken, so it's closed here,
    // which fires the normal disconnect cleanup (UserDisconnectedEvent).
    public boolean send(String targetUserId, String fromUserId, String type, Object payload) {
        WebSocketSession targetSession = sessionManager.getSession(targetUserId);
        if (targetSession == null || !targetSession.isOpen()) {
            return false;
        }

        ObjectNode outgoing = objectMapper.createObjectNode();
        outgoing.put("fromUserId", fromUserId);
        outgoing.put("type", type);
        outgoing.set("payload", objectMapper.valueToTree(payload));

        try {
            targetSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(outgoing)));
        } catch (IOException | SessionLimitExceededException e) {
            log.warn("Failed to send message to {}, closing session: {}", targetUserId, e.getMessage());
            closeQuietly(targetUserId, targetSession);
            return false;
        }

        return true;
    }

    private void closeQuietly(String userId, WebSocketSession session) {
        try {
            session.close(CloseStatus.SESSION_NOT_RELIABLE);
        } catch (IOException e) {
            log.warn("Failed to close broken session for {}: {}", userId, e.getMessage());
        }
    }
}
