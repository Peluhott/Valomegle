package com.sedanodev.valomegle.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.sedanodev.valomegle.security.JwtService;

@Slf4j
@Component
public class WebSocketHandler extends TextWebSocketHandler {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final WebSocketSessionManager sessionManager;
    private final JwtService jwtUtil;

    public WebSocketHandler(WebSocketSessionManager sessionManager, JwtService jwtUtil) {
        this.sessionManager = sessionManager;
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String token = queryParam(session.getUri().getQuery(), "token");
        if (token == null || token.isEmpty()) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        String userId;
        try {
            userId = jwtUtil.extractUsername(token);
        } catch (Exception e) {
            log.debug("Rejected WebSocket handshake: invalid token");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        session.getAttributes().put("userId", userId);
        sessionManager.addSession(userId, session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String fromUserId = (String) session.getAttributes().get("userId");

        JsonNode node;
        try {
            node = OBJECT_MAPPER.readTree(message.getPayload());
        } catch (Exception e) {
            log.debug("Dropped frame from {}: malformed JSON", fromUserId);
            return;
        }

        if (!node.hasNonNull("targetUserId") || !node.hasNonNull("type") || !node.hasNonNull("payload")) {
            log.debug("Dropped frame from {}: missing required field", fromUserId);
            return;
        }

        String targetUserId = node.get("targetUserId").asText();
        String type = node.get("type").asText();
        JsonNode signalPayload = node.get("payload");

        relay(fromUserId, targetUserId, type, signalPayload);
    }

    private void relay(String fromUserId, String targetUserId, String type, JsonNode signalPayload) throws Exception {
        WebSocketSession targetSession = sessionManager.getSession(targetUserId);
        if (targetSession == null || !targetSession.isOpen()) {
            return;
        }

        ObjectNode outgoing = OBJECT_MAPPER.createObjectNode();
        outgoing.put("fromUserId", fromUserId);
        outgoing.put("type", type);
        outgoing.set("payload", signalPayload);

        targetSession.sendMessage(new TextMessage(OBJECT_MAPPER.writeValueAsString(outgoing)));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId"); // just retrieve it
        if (userId != null) {
            sessionManager.removeSession(userId);
        }
    }

    private static String queryParam(String query, String key) {
        if (query == null) {
            return null;
        }
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equals(key)) {
                return pair.substring(eq + 1);
            }
        }
        return null;
    }
}
