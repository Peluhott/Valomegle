package com.sedanodev.valomegle.websocket;

import java.io.IOException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Slf4j
@Component
public class WebSocketMessenger {

    private final WebSocketSessionManager sessionManager;
    private final ObjectMapper objectMapper;

    public WebSocketMessenger(WebSocketSessionManager sessionManager, ObjectMapper objectMapper) {
        this.sessionManager = sessionManager;
        this.objectMapper = objectMapper;
    }

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
        } catch (IOException e) {
            log.warn("Failed to send message to {}: {}", targetUserId, e.getMessage());
            return false;
        }

        return true;
    }
}
